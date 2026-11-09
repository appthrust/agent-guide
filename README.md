# Agent Guide

Agent Guide teaches coding agents to operate the current AppThrust Project with
`apth` and `apthctl`. A Go server serves a React SPA, authenticated Markdown,
`llms.txt`, downloadable skills, and the `/api/agent-guide/v1` API. Curated content
is embedded in the image and rendered with the installation's environment values.
There is no database, service credential, or platform write performed by the server.
The browser's Agent setup panel creates an Access Key with the user's own bearer.

## Source and layout

- `cmd/server/`: entrypoint, routes and fixture-based tests.
- `cmd/server/internal/content/`: frontmatter validation, ordering and indexes.
- `cmd/server/internal/render/`: strict Go text/template rendering.
- `cmd/server/internal/api/`: caller-specific Platform context.
- `content/`: release-versioned documents and agent skills; `embed.go` embeds them.
- `web/`: Vite/React SPA, development mock and browser-side Platform API access.
- `catalog/`: application definition, localized listing and screenshots.
- `hack/`: catalog publication and source provenance checks.
- `docs/design.md`: domain model and HTTP/content contracts.

The public Go SDK is `github.com/appthrust/appserver-go v0.3.0`, matching the Memo
template. No platform checkout, module replacement or private Go credential is
needed to build. The launcher and i18n packages come from GitHub Packages.
Content source references pin platform commits; the authoring snapshot is
`1572ae7afa15df418cad36501f237b4595349428`.

## Develop

Use Go 1.26 or newer and Bun 1.4.1:

```sh
GOFLAGS=-mod=mod go test ./cmd/...
go vet ./cmd/...
cd web
# Supply a GitHub Packages credential with read:packages through the environment.
bun install --frozen-lockfile
bun run typecheck
bun test src
bun run build:image
```

For standalone UI development, run `bun run mock` and `bun run dev` in separate
terminals in `web/`. To serve the built SPA and API together:

```sh
GOFLAGS=-mod=mod go run ./cmd/server --static-dir web/dist
```

The server reads the following environment variables (the platform connection and
catalog supply these in an installed app):

| Variable | Meaning |
| --- | --- |
| `PLATFORM_API_URL` | Required Platform API origin; HTTPS except loopback HTTP. |
| `PLATFORM_PROJECT_ID` | Required Project DNS-label identifier. |
| `PLATFORM_OIDC_ISSUER` | User-token issuer; required unless listening on loopback. |
| `PLATFORM_OIDC_ISSUER_CA_PEM` | Optional certificate-only bundle augmenting system trust. |
| `PLATFORM_ACCESS_ISSUER` | Access Key assertion issuer, distinct from the OIDC issuer. |
| `AGENT_GUIDE_OIDC_AUDIENCES` | Comma-separated trusted user-token audiences; required with the OIDC issuer. |
| `AGENT_GUIDE_ACCESS_AUDIENCE` | Access Key assertion audience; unset disables assertions. |
| `AGENT_GUIDE_PUBLIC_URL` | Required guide origin for rendered links. |
| `AGENT_GUIDE_STATIC_DIR` | SPA directory, default `/srv/agent-guide`; overridden by `--static-dir`. |
| `AGENT_GUIDE_RELEASE_VERSION` | Version used in content and `/releasez`. |
| `AGENT_GUIDE_ARTIFACT_DIGEST` | Image digest used with the version by `/releasez`. |
| `AGENT_GUIDE_SOURCE_REVISION` | Optional source revision for `/releasez`. |
| `AGENT_GUIDE_RELEASE_FILE` | Optional release JSON file, used when version/digest are incomplete. |

`--listen` defaults to `:8080`. For issuer-free local development, explicitly use
`--listen 127.0.0.1:8080`; the SDK warns that bearer claims are then unverified.
Do not expose that mode to a network. Never place credentials in committed env
files. `NODE_AUTH_TOKEN` is a web dependency/build credential, not a server setting.

Content parses and renders once at boot. Invalid frontmatter, unsupported template
fields, or template errors are logged; the process and `/healthz` stay alive,
`/readyz` returns 503, and content routes return `content_unavailable`. Tests use
only `cmd/server/internal/content/testdata/`, never the concurrently authored tree.
The SPA, `/config`, `/releasez` and health probes are public behind the platform
edge. Every content/API route requires a bearer. Access Key assertions must match
this Project and include scope `read`; a raw secret is not accepted.

The context endpoint never grants operator authority. It returns the verified
email claim as `me.login`, and the Platform client reads the caller's Project role
from `/api/v1/projects/{id}/access`. It forwards the original bearer unchanged, using a
fresh client per request so no context or role cache crosses callers. Installation
`name` is the platform installation `id`, not its display title. Keys receive
`403 key_subject`; upstream failures receive `503 platform_unavailable`.

## Agent access

Open **Agent setup** in the signed-in SPA to create a read-only Access Key and see
its secret once. The app never stores the secret. Alternatively, use `apth` with
your selected profile (set the non-secret origins and Project identifier first):

```sh
apth login --api-url "$PLATFORM_API_URL" --project "$PLATFORM_PROJECT_ID"
apth access-keys create --project "$PLATFORM_PROJECT_ID" --space agent-guide --scope read --ttl 720h --label coding-agent --env
```

Keep the one-time key only in the agent's secret environment. Exchange it without
printing the assertion, then fetch the guide:

```sh
export AGENT_GUIDE_ACCESS_URL="$PLATFORM_API_URL"
# AGENT_GUIDE_API_KEY contains the one-time secret returned by key creation.
assertion="$(printf '%s' "$AGENT_GUIDE_API_KEY" | apth access-keys exchange --access-url "$AGENT_GUIDE_ACCESS_URL")"
curl -fsSL -H "Authorization: Bearer $assertion" "$AGENT_GUIDE_PUBLIC_URL/llms.txt"
unset assertion AGENT_GUIDE_API_KEY
```

`AccessURL` is the **Platform API origin**: exchange POSTs `/api/v1/access/token`
there. `PublicURL` is the **guide origin** used for `/llms.txt`, `/md/…` and skills.
These origins are intentionally distinct. Disable shell tracing while handling
secrets; never paste real keys or assertions into docs, logs or screenshots.
`/llms-full.txt` concatenates all documents; `/skills/index.json` lists each skill's
`SKILL.md` and reference files. The same bearer authorizes their downloads.

## Content authoring

Documents are English Markdown under `content/`, with this frontmatter:

```yaml
---
title: Log in and choose a Project
summary: Device login and Project selection.
audience: developer
section: apth
order: 20
tags: [auth, profiles]
sources:
  - path: apth-cli/README.md
    revision: 1572ae7afa15df418cad36501f237b4595349428
---
```

Every document needs a title, summary, audience (`developer`, `operator`, `both`),
section, explicit order, tags array and non-empty `sources`. Slugs are relative
paths without `.md`. Sections sort as `start-here`, `apth`, `apthctl`, `concepts`,
`lessons`, then numeric order, title and slug. Document API details omit order;
the index includes it. Sources name paths in the pinned platform Git revision.

Only these Go template fields are allowed: `{{.PlatformAPIURL}}`,
`{{.ProjectID}}`, `{{.PublicURL}}`, `{{.BaseDomain}}`, `{{.AccessURL}}`, and
`{{.ReleaseVersion}}`. No functions, conditionals or custom fields. `BaseDomain`
is the public hostname with the exact `agent-guide.<ProjectID>.` prefix removed;
custom hostnames remain unchanged. Rendered documents omit frontmatter. Skills
live in `content/skills/<name>/SKILL.md`, require matching `name` and `description`
frontmatter, and may carry provenance plus `references/*`. Skill downloads retain
frontmatter and use the same renderer.

Use `apth` commands where available, explicit `--yes` on destructive operations,
and `--wait --timeout` on waits. Never hardcode estate hosts, Project IDs or
credentials. Operator content must state required authority, not provide it.

Before submitting content changes, run against a local platform checkout that
contains the pinned revisions:

```sh
bun hack/check-sources.ts --platform /workspace/platform
```

The checker runs `git cat-file -e <revision>:<path>` for every source, reports every
missing reference and exits non-zero. It is intentionally **not a CI job** because
the platform repository is not readable in this repository's CI. CI still validates
Go routes/rendering, the web client and the catalog publisher without that checkout.

## Catalog and release

`catalog/entry.yaml` starts with `versions: []`, scope `read`, `bearerPassThrough`,
`follow` by default and `pinned` as an option. It uses the bundled `terminal` icon.
There is one web component and no PostgreSQL/CNPG dependency.

Build the image with a required BuildKit package secret:

```sh
docker build --secret id=NODE_AUTH_TOKEN,env=NODE_AUTH_TOKEN -t agent-guide-local .
```

The build compiles the SPA natively and the Go binary for the target architecture.
The non-root distroless runtime uses `/agent-guide-server`, `/srv/agent-guide`,
UID 65532 and port 8080. No JavaScript runtime or package credential enters it.

A SemVer tag such as `v0.1.0` builds amd64/arm64 images, signs the image index with
Cosign and publishes an immutable digest through Cloud's catalog. Publication
commands retain Memo's interfaces:

```sh
bun hack/publish-entry.ts submit --version 0.1.0 --digest sha256:<image-index-digest>
bun hack/publish-entry.ts await --version 0.1.0 --digest sha256:<image-index-digest>
bun hack/publish-entry.ts validate-listing
bun hack/publish-entry.ts listing
```

The publisher preserves prior versions and refuses to replace immutable images.
`await` verifies the exact version/digest in the signed catalog using ORAS and
Cosign; dispatch alone is not publication proof. Listing-only changes do not imply
a release. The workflows share `agent-guide-catalog-publish` and are guarded to
`appthrust/agent-guide`.

Required repository secret: `CLOUD_CATALOG_ADMIN_TOKEN`; optional variable:
`CLOUD_API_URL` (default `https://api.appthrust.com`). Organization App secrets
`APPTHRUST_GITHUB_ACTIONS_APP_ID` and `APPTHRUST_GITHUB_ACTIONS_APP_PRIVATE_KEY`
allow a short-lived token to dispatch Cloud publication. Grant this repository's
`GITHUB_TOKEN` read access to the shared GitHub Packages and make the GHCR image
public after first publication. Publisher regression tests run with `bun test hack`.
