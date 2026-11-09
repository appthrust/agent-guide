---
title: "Install apth and agent skills"
summary: "Build the developer CLI from its source and understand bundled versus environment-bound skills."
audience: "developer"
section: "apth"
order: 10
tags: ["install", "skills"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# Install apth and agent skills

`apth` is the developer CLI. It calls the Public API through the AppThrust Go SDK; it is not an alias for the operator CLI.

## Obtain the CLI

Use the installation method supplied by your platform administrator. If you have an authorized checkout of the platform repository and its Go toolchain, the documented source build is:

```bash
# Run from the platform repository root.
go build -o ~/.local/bin/apth ./apth-cli/cmd/apth
apth --help
```

Put `~/.local/bin` on your shell's PATH. Do not download and execute an invented installation script or guess a binary release URL.

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
