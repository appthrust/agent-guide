---
title: "Observe operations without blind retries"
summary: "Bound waits, bind them to the intended release, and distinguish transport retry from a new recovery request."
audience: "developer"
section: "apth"
order: 80
tags: ["operations", "waits", "idempotency"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/skills/appthrust-app-dev/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/app_installations.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "design/platform/marketplace-apps/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# Observe operations without blind retries

A successful write response can mean accepted intent, not a running product. Preserve the operation ID, exact target, idempotency key, and last condition when reporting progress.

## Pick the wait that answers the question

| Question | Mechanism |
| --- | --- |
| Has an operation envelope completed? | Mutation `--wait --timeout 2m` when the response has `operation.links.self` |
| Is the image from my pushed commit serving? | Dedicated application release wait with a commit-time or version fence |
| Has registry tag listing completed? | Registry sync wait; this does not wait for an app release |
| Does the product work? | Fresh public connection plus the relevant authenticated interaction |

```bash
apth apps wait "$APP" --released-after "$(git log -1 --format=%cI)" --timeout 10m
apth apps get "$APP"
apth registries sync {{.ProjectID}} "$REGISTRY" --wait --timeout 2m
apth operations overview --project {{.ProjectID}}
```

The dedicated `apps wait` command does not need a redundant `--wait`. A bare current-health wait can return immediately after a push by observing the previous release; bind it to the intended commit. Registry sync returns when tag listing leaves `pending`; `failed` and timeout are errors, not app deployment proof.

## Idempotency is not unlimited retry

Mutations accept `--idempotency-key`. Reuse a key only to replay the same logical request and body safely. Do not generate a new key on every uncertain network result; first inspect the resource or operation.

For a partially failed marketplace graph, correct the cause before a new logical attempt. The marketplace contract retains a completed failed key's error; a corrected graph attempt needs a fresh key rather than expecting the old one to resume. This is distinct from a blocked release's explicit recovery occurrence:

```bash
apth app-installations retry-release "$INSTALLATION" --project {{.ProjectID}} --idempotency-key "$RETRY_KEY" --wait --timeout 2m
```

The retry acknowledgement does not prove that release recovery finished. Read the Component release state afterward.

## Treat errors by their typed meaning

- **401**: follow the CLI's profile-specific login hint; do not retry with an unrelated credential.
- **409 `delivery_pending`**: the SDK already retries for roughly 30 seconds. If still pending, inspect progress, allow a short bounded interval, then retry the same request once.
- **409 `delivery_blocked`**: stop and involve the platform operator. More retries do not repair the delivery root.
- **Other conflicts or terminal failure**: preserve the exact code and diagnose it. A rule for one typed conflict does not authorize retrying all 409s.
- **Timeout**: report the last observed state and the unmet predicate. Inspect evidence before extending a deadline or changing anything.

Overlap independent development work with provisioning, but never hide a failure in an unattended retry loop.
