---
title: "Operate marketplace installations"
summary: "Install and update through the Dashboard, inspect with apth, and retry a blocked release without reinstalling."
audience: "developer"
section: "apth"
order: 60
tags: ["marketplace", "follow", "pinned"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "design/platform/marketplace-apps/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/app_installations.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/delivery.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/components.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "platform-api/internal/handler/app_installation.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# Operate marketplace installations

A marketplace app is a catalog-sourced Application, not a platform-owned addon. Installing creates an `AppInstallation` and an ordinary, user-owned `ApplicationStack` graph. At most one installation of a definition exists per Project.

> **Known CLI gap:** At the cited revision, the marketplace CLI group implements only `retry-release`. It has no install/create, list, get, update, or uninstall/delete subcommands. Do not invent them. Use the Dashboard for lifecycle actions and the existing developer commands for inspection.

## Install, update, uninstall

1. In the Dashboard select Project `{{.ProjectID}}`, then **Marketplace**. Inspect the definition, supported version, dependencies, and configuration requirements before installing.
2. Choose the intended update policy. Installation may create Automatic dependencies first; those are separate installations, not disposable implementation details.
3. Inspect the installed app under the Project's **Marketplace / Applications** views. Record its installation name, stack ID, selected version, resolved image, and returned URL.
4. For a version or policy change, use the installation controls. A version change re-renders the graph; review member changes and any repository replacement before applying it.
5. For uninstall, review `dependents` and data-retention consequences, then explicitly confirm deletion in the Dashboard. The lifecycle removes the installation record and stack. Dependents can degrade; do not uninstall them automatically.

The underlying Platform API resource is `AppInstallation`, with collection `/api/v1/projects/{{.ProjectID}}/app-installations` and item `/api/v1/projects/{{.ProjectID}}/app-installations/<name>`. Collection POST creates; GET reads; item PATCH changes version/policy; DELETE uninstalls. This describes the supported API boundary, not permission to bypass the Dashboard or to print bearer credentials.

## Follow versus pinned

| Policy | Selection | What it does not promise |
| --- | --- | --- |
| `follow` | Catalog-admitted image tags in the entry's declared stream | Arbitrary registry tags, a guessed semver range, or automatic graph/schema migration |
| `pinned` | A catalog-admitted digest; no tag-filter selector | Automatic adoption of an available version |

Pinned installations report `UpdateAvailable`; the user chooses a version. Follow can advance the running image while the installation's declared version remains unchanged. Adding/removing graph members requires a version change. Digest and tag-filter intent are mutually exclusive. An image repository path change is a reviewed repository replacement, not a normal follow update.

## Inspect and recover

```bash
apth application-stacks list {{.ProjectID}}
apth application-stacks get {{.ProjectID}} "$STACK"
apth components list {{.ProjectID}}
apth components release-state {{.ProjectID}} "$COMPONENT"
apth publishes readiness {{.ProjectID}}
```

When the cause of a blocked release has been corrected and retry is authorized:

```bash
apth app-installations retry-release "$INSTALLATION" --project {{.ProjectID}} --idempotency-key "$RETRY_KEY" --wait --timeout 2m
apth components release-state {{.ProjectID}} "$COMPONENT"
```

Use one non-secret idempotency key for the same logical request. The response acknowledges a new recovery occurrence; it does **not** establish release convergence. Never uninstall to retry a release.

## Ready ladder

Check `Accepted` → graph/current generation `Ready` → `DependenciesResolved` → requirements `Configured` when declared → `Healthy` → a real authenticated user action. These are diagnostic layers, not a guaranteed temporal sequence.

`Pending` means progress is incomplete. `NeedsConfiguration` means the graph can be Ready while requirements are unsatisfied. `Degraded` needs its exact reason; it is not proof every stable workload stopped. `UpdateAvailable` is not itself a serving failure. An addressable but Unconfigured dependency can resolve a link without being usable. Read [readiness]({{.PublicURL}}/md/concepts/readiness.md) before declaring success.
