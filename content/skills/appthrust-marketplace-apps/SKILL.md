---
name: "appthrust-marketplace-apps"
description: "Use for installing, updating, diagnosing, retrying, or uninstalling catalog marketplace apps in this Project; explains Dashboard lifecycle, existing apth inspection, follow versus pinned, and layered readiness."
title: "AppThrust marketplace operations"
summary: "Use for installing, updating, diagnosing, retrying, or uninstalling catalog marketplace apps in this Project; explains Dashboard lifecycle, existing apth inspection, follow versus pinned, and layered readiness."
audience: "developer"
section: "apth"
order: 110
tags: ["skill", "marketplace", "readiness"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "design/platform/marketplace-apps/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/app_installations.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/delivery.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/components.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "platform-api/internal/handler/app_installation.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "AGENTS.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# AppThrust marketplace operations

Target only Project `{{.ProjectID}}` through `{{.PlatformAPIURL}}`. Use this skill for a catalog app, not for building a custom source application or changing a platform release.

## Bootstrap

```bash
apth login --api-url {{.PlatformAPIURL}} --project {{.ProjectID}}
apth whoami
apth context show
```

Keep all keys and tokens private. This guide grants no mutation authority. Bind the task to the exact installation and confirm data-loss implications before uninstalling anything.

> **Known CLI gap:** At the cited source revision, the marketplace CLI group has only `retry-release`. There is no install/create, list, get, update, or uninstall/delete command. Do not invent these commands or use deprecated addon commands. Use the Dashboard for those actions and existing `apth` commands for inspection.

## 1. Install in the Dashboard

Open the correct Project → **Marketplace**. Select the definition, inspect supported versions, required configuration, and dependencies. Install with the authorized version/policy; Automatic dependencies are installed as their own resources first.

The underlying `AppInstallation` API collection is `/api/v1/projects/{{.ProjectID}}/app-installations`. Collection POST creates and GET lists; item GET/PATCH/DELETE read, update, and uninstall. The API projects an ordinary user-owned ApplicationStack graph. This resource description is not an instruction to bypass authentication or expose tokens.

Record the installation name, stack and Component IDs, selected version, update policy, resolved image, and returned URL from the Dashboard's **Marketplace / Applications** views.

## 2. Choose follow or pinned deliberately

- **Follow** selects only catalog-admitted tags in the entry's declared stream. It does not mean arbitrary registry latest, unrestricted semver range, or automatic graph migration.
- **Pinned** selects an admitted digest without tag-filter intent. `UpdateAvailable` informs the user; changing to a new version is explicit.
- A version change re-renders the graph, including changed members. An image-path change can require reviewed repository replacement.
- The declared version, resolved image, and public release metadata can differ. Inspect each; do not hide a mismatch behind a single version label.

Apply authorized version/policy changes through the installation controls. Do not patch the admitted-image list or delete/recreate a database to force an update.

## 3. Inspect through the available CLI

```bash
apth application-stacks list {{.ProjectID}}
apth application-stacks get {{.ProjectID}} "$STACK"
apth components list {{.ProjectID}}
apth components get {{.ProjectID}} "$COMPONENT"
apth components delivery {{.ProjectID}} "$COMPONENT"
apth components release-state {{.ProjectID}} "$COMPONENT"
apth components runtime-status {{.ProjectID}} "$COMPONENT"
apth publishes readiness {{.ProjectID}}
```

Use returned exact IDs. Observe the selected/stable release and current-generation conditions, not only a friendly phase.

## 4. Retry a blocked release without uninstalling

Correct the cause first. For one authorized recovery request, choose a non-secret `$RETRY_KEY` and reuse it only for the same request:

```bash
apth app-installations retry-release "$INSTALLATION" --project {{.ProjectID}} --idempotency-key "$RETRY_KEY" --wait --timeout 2m
apth components release-state {{.ProjectID}} "$COMPONENT"
```

Acceptance acknowledges a recovery occurrence, not convergence. If it remains blocked, inspect the typed reason; do not loop or uninstall. HTTP 401 needs login, `delivery_pending` already has bounded SDK retry, and `delivery_blocked` needs an operator rather than another attempt.

## 5. Walk the Ready ladder

Check accepted intent, current graph readiness, resolved dependencies, declared requirements, app health, and the real user action separately:

- `Pending`: incomplete progress; read the missing condition.
- `NeedsConfiguration`: graph Ready but configuration missing. Bind only authorized credentials/providers.
- `Degraded`: inspect the exact failure; an older stable workload may still serve.
- `UpdateAvailable`: an available pinned update, not automatically a serving outage.
- Ready link: addressable dependency, not necessarily a configured or useful capability.

Use a fresh public connection and complete required authentication. Exercise the app's actual purpose and read state back. Do not use another app's release endpoint as proof.

## 6. Uninstall safely

In the Dashboard installation controls, review dependents, ownership, and retention, then confirm deletion of exactly the requested installation. The lifecycle deletes its record and stack; dependents can degrade and are not automatically in scope. Observe completion/absence and report retained resources or missing visibility honestly. Do not substitute direct child deletion or a fabricated CLI delete command.

Report the installation and observed image identity, policy, current readiness layers, exact user action, and any unmet prerequisite.
