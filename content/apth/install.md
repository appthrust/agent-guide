---
title: "Install apth and agent skills"
summary: "Build the developer CLI from its source and understand bundled versus environment-bound skills."
audience: "developer"
section: "apth"
order: 10
tags: ["install", "skills"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:appthrust/cli/install.sh", revision: "cf7ae703425a682d97a84a204baf8a455014087b" }
---

# Install apth and agent skills

`apth` is the developer CLI. It calls the Public API through the AppThrust Go SDK; it is not an alias for the operator CLI.

## Install the CLI

Use the public installer from `appthrust/cli`. No authentication or token is needed:

```bash
curl -fsSL https://raw.githubusercontent.com/appthrust/cli/main/install.sh | sh -s -- apth
```

- Without a version argument, the installer selects the newest `apth` release. To select a published version, append the tag without its tool prefix: for example, `v0.1.0`, not `apth-v0.1.0`.
- The installer supports Linux and macOS (`linux`/`darwin`) on `amd64` and `arm64`, and verifies the archive against the release's `SHA256SUMS` before installing.
- The default destination is `~/.local/bin`. Export `APTH_INSTALL_DIR` before running the command to choose another directory, and add that directory to your shell's `PATH`.

As of 2026-11-10, no `apth` release has been published. If the installer reports `no apth release found in appthrust/cli`, no `apth` release is available yet; use the source build below as the fallback. It requires an authorized checkout of the platform repository and its Go toolchain:

```bash
# Run from the platform repository root.
go build -o ~/.local/bin/apth ./apth-cli/cmd/apth
apth --help
```

The source build writes to `~/.local/bin`; add it to your shell's `PATH`. Do not guess binary release URLs.

```bash
apth login --api-url {{.PlatformAPIURL}} --project {{.ProjectID}}
apth whoami
apth skills list
apth skills install
```

## Where skills go

The default installation writes the bundled skills to `~/.claude/skills`, `~/.codex/skills`, and `~/.agents/skills`. OMP reads the agents directory and also the Claude and Codex directories. Installation needs no network because these files are embedded in the CLI.

To inspect a bundled skill, or install only for the current repository:

```bash
apth skills show appthrust-app-dev
apth skills install --agent claude --scope project
```

An identical installed copy is left alone. A differing copy is not overwritten unless `--force` is explicitly chosen after review. Bundled skill text may contain defaults for a different environment. The environment-bound edition is served at `{{.PublicURL}}/skills/appthrust-app-dev/SKILL.md`; fetch it with the authenticated procedure in [Start here]({{.PublicURL}}/md/start-here.md). The CLI does not implement remote skill installation from a guide URL.

To remove only a previously installed bundled skill, with explicit authority:

```bash
apth skills uninstall appthrust-app-dev --yes
```
