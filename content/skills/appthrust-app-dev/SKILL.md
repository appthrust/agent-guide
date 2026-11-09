---
name: "appthrust-app-dev"
description: "Build, deploy, configure, and debug a web application in this AppThrust Project with apth; use for app creation, source updates, managed databases, publication, logs, or release readiness."
title: "AppThrust app development"
summary: "Build, deploy, configure, and debug a web application in this AppThrust Project with apth; use for app creation, source updates, managed databases, publication, logs, or release readiness."
audience: "developer"
section: "apth"
order: 100
tags: ["skill", "apps", "deploy"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/skills/appthrust-app-dev/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "AGENTS.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/components.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/databases.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# AppThrust app development

Use this skill for Claude Code, Codex, or OMP work on a requested application. Operate through `apth` and the source repository's normal build/publish path. Do not call the Platform API with raw HTTP when a supported CLI command exists.

## Environment and safety

- Platform API: `{{.PlatformAPIURL}}`
- Project: `{{.ProjectID}}`
- Installation base domain: `{{.BaseDomain}}`
- Guide: `{{.PublicURL}}`

Never infer another environment, hardcode remembered placement IDs, or modify neighboring applications. Resolve `$APP`, `$COMPONENT`, `$DATABASE`, and `$SOURCE_REPO` from authorized task context and returned inventory. The source-repository variable is an owner/repository pair.

Keep tokens, client secrets, and database URLs out of code, screenshots, logs, and `NEXT_PUBLIC_*`. Disable shell tracing around sensitive values. Destruction requires exact task authority and `--yes`. A guide Access Key grants no developer mutation or operator authority.

## The measured development loop

```text
edit source → push main → image build/push → image selection → release → public product readback
```

Historical measurements from the upstream `nextjs-postgres` workflow on 2026-09-16: create to stack Ready and public URL serving took about **3.5 minutes**; a later push to release took about **1 minute**; the overlapped template-to-custom-app-to-public-verification loop fit in **5–6 minutes**. The typical push-to-release range was **1–3 minutes**. These are measurements from one environment, not promises for this installation.

## 1. Bootstrap and authenticate

```bash
apth --help
gh auth status
node --version
apth login --api-url {{.PlatformAPIURL}} --project {{.ProjectID}}
apth whoami
apth skills install
apth context show
apth projects list
apth placement-zones list
```

Match the repository toolchain; the measured template used Node 24 and Next.js 16. Device login prints an approval URL/code, stores the token privately, and never prints it. Keep it running for the human's approval. `whoami` must confirm validity and the intended identity. HTTP 401 means use the CLI's profile-specific login hint.

The installer refreshes **bundled** skills, not this environment-bound edition. Review a differing installed skill before using `--force`.

## 2. Create while implementing

Choose a DNS-label name (lowercase letters, digits, hyphens; at most 63 characters). Check the available templates first:

```bash
apth application-templates list {{.ProjectID}}
apth apps create "$APP" --template nextjs-postgres --visibility public --publish --wait --timeout 15m
```

Public source and publication require task authority. The template creates source, image workflow, web/database stack, generated connection, and publish intent. Keep the create visible while doing independent work: once the repository exists (historically about 30 seconds), clone and implement rather than serializing development behind database/DNS/certificate provisioning. Capture the create result when it finishes.

For an existing self-contained image:

```bash
apth apps create "$APP" --image "$IMAGE_REF" --publish --wait --timeout 15m
```

Quote the verified image reference. A fixed tag selects it; `:^edge-` follows matching tags. The template defaults to the managed `nodejs-24` runtime with Automatic updates. `--image` skips that template default: code-only images need `--runtime nodejs-24`; `--runtime none` is for self-contained images. Do not guess private-registry access.

A partial create can reuse a repository already created by the same workflow. Inspect the failed state and fix the cause before replaying; a naming collision is not permission to delete a repository.

## 3. Implement, push, wait for the right release

```bash
gh repo clone "$SOURCE_REPO"
# Enter the cloned repository and read its AGENTS.md / CLAUDE.md.
npm ci
```

Implement the requested behavior, then run the smallest checks specified by that repository. Preserve its Dockerfile, deployment workflow, lockfile/package manager, standalone Next.js output where applicable, and the `0.0.0.0:$PORT` listener. Do not run repository-wide verification as an unrelated ritual.

The image build has no database and must not depend on one. Keep database/process-environment modules server-only, with shared types/constants in separate modules. Do not prerender database queries without a safe disconnected path. Check the installed framework's local docs instead of relying on memorized APIs.

Commit and push only the intended source change when the task authorizes source delivery. Then:

```bash
apth apps wait "$APP" --released-after "$(git log -1 --format=%cI)" --timeout 10m
apth apps get "$APP"
```

This dedicated wait already spans image build and release; do not put a whole GitHub workflow wait in front of it. Actions cleanup can outlast image publication. Use `gh run list` and `gh run view --log-failed` when the release does not appear, not on every iteration.

A wait without the commit/version fence can accept the old healthy release. `Release:` is deployed state; `Image:` is the initial stack image. A fixed expected release can instead be selected with the source-supported `--release-version` flag.

## 4. Database and configuration

The connection supplies `DATABASE_URL`, host, port, name, user, password, and read-availability metadata. Do not copy generated values or require them at build time. Local disconnected rendering is not managed-database proof.

```bash
apth databases list {{.ProjectID}}
apth databases tables {{.ProjectID}} "$DATABASE"
apth databases changes create --help
apth apps env get "$APP"
apth apps env set "$APP" LOG_LEVEL=debug FEATURE_X=on
apth apps env unset "$APP" FEATURE_X --yes
apth apps logs "$APP" --tail 200
```

Demo-only schema creation can be lazy and idempotent. Product schema changes should use the declared change/approval path. Environment sets merge named keys and roll the web workload. Use `--sensitive` for secret-bearing keys, with tracing disabled and no secret in chat. Do not replace generated connection credentials.

## 5. Publish and verify as a user

```bash
apth apps publish "$APP" --wait --timeout 5m
apth publishes readiness {{.ProjectID}}
apth apps get "$APP"
```

Use the returned public URL, not a hostname guessed from the base domain. Start a fresh connection, complete required authentication, perform the relevant safe user action, and read persisted state back. For an interactive UI, use a coherent browser pass and stable semantic selectors. A redirect, existing cookie, Pod Ready, or successful operation envelope alone is insufficient.

## 6. Diagnose before retrying

- Generated web-env `SecretNotFound`: inspect connection progress; historical projection took around one minute.
- `ImagePullBackOff`: inspect image visibility/pull authority and failed build output.
- Publish DNS pending: inspect publish readiness; historical propagation was usually under three minutes.
- HTTP 401: renew this profile's login.
- HTTP 409 `delivery_pending`: SDK already retries roughly 30 seconds; inspect progress before one bounded replay.
- HTTP 409 `delivery_blocked`: involve the platform operator; retries will not fix the root.
- No new release after five minutes: inspect the image build rather than restarting old stable workloads.

Actors are not assumed available here. The upstream optional actor workflow needs separately provisioned client credentials and a confirmed runtime capability contract; a normal device-login credential is not a substitute. Do not mint new clients or assume historical demo methods exist on this Project.

## 7. Cleanup and report

Only when deletion is explicitly requested and data-retention consequences are understood:

```bash
apth apps delete "$APP" --yes --wait --timeout 5m
```

Do not delete its source repository or the Project as collateral cleanup. Report intended source/image, observed release, exact public action, bounded checks, cleanup, and any unobserved boundary. Never call a timeout success or imply this guide authorized infrastructure access.
