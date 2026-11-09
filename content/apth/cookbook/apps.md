---
title: "Create, develop, and publish an app"
summary: "Use the high-level application workflow without confusing the initial image with the deployed release."
audience: "developer"
section: "apth"
order: 30
tags: ["apps", "deploy", "logs"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/skills/appthrust-app-dev/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# Create, develop, and publish an app

Use the exact application name authorized by the task. In the commands below, `$APP` is that DNS-label name, not a Project identifier. Confirm the current profile first:

```bash
apth context show
apth apps list
apth application-templates list {{.ProjectID}}
apth placement-zones list
```

## Create

```bash
apth apps create "$APP" --template nextjs-postgres --visibility public --publish --wait --timeout 15m
apth apps get "$APP"
```

The template path creates a source repository, image build, web/database stack, connection, and publish. Public source visibility and publication must be authorized; do not use this example for confidential code unchanged. If placement is ambiguous, use the returned placement-zone ID rather than inventing one.

For a self-contained existing image, set `$IMAGE_REF` to its verified pullable reference:

```bash
apth apps create "$APP" --image "$IMAGE_REF" --publish --wait --timeout 15m
```

A fixed image tag selects that tag; a quoted `:^edge-` selector follows matching tags. The Next.js template uses the managed `nodejs-24` runtime by default. A code-only image needs an explicit `--runtime nodejs-24`; `--runtime none` is an opt-out for a self-contained image, not a fix for a code-only artifact.

## Observe the release from your push

```bash
apth apps wait "$APP" --released-after "$(git log -1 --format=%cI)" --timeout 10m
apth apps get "$APP"
```

Run this after the intended commit is pushed. The timestamp prevents an already-healthy older release from satisfying the wait. `Release:` is what rolled out; `Image:` is the stack's original image. Do not wait for an entire build workflow before this release wait: post-push cleanup can outlast image publication.

## Configure and inspect

```bash
apth apps env get "$APP"
apth apps env set "$APP" LOG_LEVEL=debug FEATURE_X=on
apth apps env unset "$APP" FEATURE_X --yes
apth apps logs "$APP" --tail 200
```

Environment updates merge named keys and roll the web workload. Generated connection values are platform-owned. Never copy database URLs or secret values into tickets; inspect only needed non-secret fields. For a private value already held in a secure variable, disable tracing and mark it sensitive:

```bash
set +x
apth apps env set "$APP" SERVICE_SECRET="$SERVICE_SECRET" --sensitive SERVICE_SECRET
```

## Publish and prove

```bash
apth apps publish "$APP" --wait --timeout 5m
apth publishes readiness {{.ProjectID}}
```

Use the URL actually returned by the app, not a guessed hostname. `{{.BaseDomain}}` is the installation's base domain, not a promise about every application route. Start a fresh connection, exercise the relevant browser/API action, and read persisted state back. An authentication redirect is not a successful authenticated product interaction.

## Delete only the assigned app

```bash
apth apps delete "$APP" --yes --wait --timeout 5m
```

This removes the application stack and its managed graph, including database and publish resources. Confirm retention/data-loss consequences first. Do not delete an entire Project or unrelated source repository as a cleanup shortcut.
