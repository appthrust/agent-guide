---
title: "Start here"
summary: "Read this first to operate this Project safely, authenticate, and fetch environment-bound agent guidance."
audience: "both"
section: "start-here"
order: 10
tags: ["bootstrap", "safety", "agents"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/skills/appthrust-app-dev/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "AGENTS.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "design/platform/marketplace-apps/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/accesskeys.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "sdk/access.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:appthrust/cli/install.sh", revision: "cf7ae703425a682d97a84a204baf8a455014087b" }
---

# Start here

## AppThrust in ten lines

1. AppThrust turns application intent into managed runtime resources.
2. A Project is the scope for your applications, permissions, and configuration.
3. This guide is bound to Project `{{.ProjectID}}`.
4. Its Platform API is `{{.PlatformAPIURL}}`.
5. An Application groups components, branches, and releases.
6. A Component is a workload, database, or another declared building block.
7. An ApplicationStack declares a connected application graph.
8. A Publish makes an application reachable through a managed endpoint.
9. Marketplace installations use signed catalog definitions and ordinary application graphs.
10. Use `apth` for Project work; `apthctl` is a separate operator tool requiring separate authority.

## Operating rules

- Read current state before changing the exact application you were assigned. Never infer another environment from remembered defaults.
- Prefer `apth` over raw Platform API requests. Do not invent flags; inspect command help when inputs differ.
- Never print, paste into chat, log, or commit tokens, access keys, database URLs, or kubeconfigs. Disable shell tracing around secrets.
- Destructive CLI examples require `--yes`; that flag is confirmation, not authorization.
- Bound mutation observation with `--wait --timeout`. The dedicated application-wait command uses its own `--timeout`; device login has its own approval deadline.
- Prove the intended release and a real public interaction. Pod Ready, successful delivery, authentication, and product acceptance are different claims.
- Use the smallest relevant check. Do not replace a failed observation with broad retries or larger timeouts.
- This app grants neither cluster access nor a PMC writer lease.

## Bootstrap

Install `apth` with the public installer (no authentication or token needed), and add its installation directory to `PATH`: `~/.local/bin` by default, or the directory exported as `APTH_INSTALL_DIR`.

```bash
curl -fsSL https://raw.githubusercontent.com/appthrust/cli/main/install.sh | sh -s -- apth
apth login --api-url {{.PlatformAPIURL}} --project {{.ProjectID}}
apth whoami
apth skills install
```

Approve the exact device-login URL in a browser. `whoami` must report a valid credential; follow its login hint on expiry. The skill installer installs the CLI's bundled copy, **not** this guide's environment-bound skills. Fetch the versions below to use this installation's values; do not overwrite a locally edited skill without reviewing it.

## Fetch as text

Use **Agent setup** at [this guide]({{.PublicURL}}/) to create a read-only key. Keep the one-time key in a secret store or private process environment. The exchange origin is `{{.AccessURL}}` (the Platform API); the document origin is `{{.PublicURL}}`.

With `AGENT_GUIDE_API_KEY` supplied privately, this Bash example captures the assertion without printing it. The HTTP request reads this app, not the Platform API:

```bash
set +x
assertion="$(apth access-keys exchange --access-url '{{.AccessURL}}' <<<"${AGENT_GUIDE_API_KEY:?Supply the key privately}")" || exit
printf 'Authorization: Bearer %s\n' "$assertion" |
  curl --fail --silent --show-error --header @- '{{.PublicURL}}/llms.txt'
unset assertion
```

Do not use verbose HTTP logging. Reuse the authenticated fetch pattern for:

- `{{.PublicURL}}/md/start-here.md` and `/md/<slug>.md` for a single document.
- `{{.PublicURL}}/llms-full.txt` for all documents.
- `{{.PublicURL}}/skills/index.json` to discover skill files.
- `{{.PublicURL}}/skills/<name>/SKILL.md` for an environment-bound skill.

## Choose the next path

- Build or update an app: [app development skill]({{.PublicURL}}/skills/appthrust-app-dev/SKILL.md).
- Install a marketplace app: [marketplace cookbook]({{.PublicURL}}/md/apth/cookbook/marketplace-apps.md).
- Explain a failed request or pending release: [troubleshooting]({{.PublicURL}}/md/apth/troubleshooting.md).
- Operate infrastructure with existing authority: [operator overview]({{.PublicURL}}/md/apthctl/overview.md).

This content ships with Agent Guide `{{.ReleaseVersion}}`. Source revisions describe the authored contracts, not the current health of your environment.
