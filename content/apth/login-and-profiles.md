---
title: "Log in and choose a Project"
summary: "Use device login for this Platform API and keep environment-specific profiles separate."
audience: "developer"
section: "apth"
order: 20
tags: ["auth", "profiles"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/skills/appthrust-app-dev/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# Log in and choose a Project

```bash
apth login --api-url {{.PlatformAPIURL}} --project {{.ProjectID}}
apth whoami
apth context show
```

Without a supplied token, login opens the device authorization flow. Show the human the verification URL and user code printed by the CLI; keep the command running while they approve. On a headless host, open that exact URL on another machine. A browser-launch warning is not an authentication failure. The CLI stores the credential privately and never prints the token.

`whoami` calls the API: `tokenValid: true` and the expected login establish that the stored credential is accepted. Offline inspection does not establish validity. `authenticated: false`, `tokenValid: false`, or HTTP 401 means follow the emitted login hint, not retry the mutation with more privileges.

## Separate profiles by environment

```bash
apth profiles list
apth login --api-url {{.PlatformAPIURL}} --project {{.ProjectID}} --profile guide-project
apth profiles use guide-project
apth context set --project {{.ProjectID}}
apth projects list
```

Check the API URL, Project, and identity before a write. A saved kubeconfig or a familiar domain suffix is not evidence of the correct target. Never copy a credential from another profile into logs or chat.

Non-secret profile configuration and secret credentials are separate. The credential store is `~/.config/appthrust/credentials.json`, written with mode `0600`; do not read or attach its contents as troubleshooting evidence.

Cloud-account login and direct Platform API login have different routing. A Cloud session does not make direct Platform resource commands automatically use Cloud project proxy routes. Keep a Platform profile targeting `{{.PlatformAPIURL}}` for this guide.

## Session lifecycle

The source app-development workflow measured Dashboard-issued CLI credentials at roughly 12 hours; treat the API's validity result as authoritative rather than assuming that duration here. Renew through device login when needed. Platform logout clears local credentials:

```bash
apth logout --profile guide-project
```

Logout does not revoke a separately issued Agent Guide Access Key. Manage that key through the [access-key cookbook]({{.PublicURL}}/md/apth/cookbook/access-keys.md).
