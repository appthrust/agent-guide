---
title: "Verify published output and pull permissions"
summary: "A published package, dispatched workflow, and usable runtime artifact are different outcomes."
audience: "both"
section: "lessons"
order: 80
tags: ["publication", "permissions", "artifacts"]
sources:
  - { path: "design/platform/marketplace-apps/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/engineering/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/engineering/2026-11-06-first-party-app-repo-separation-lessons.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/issues/2026-11-05-marketplace-first-party-apps-own-repositories.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/issues/2026-11-05-marketplace-catalog-publisher-and-follow-semantics.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# Verify published output and pull permissions

## Historical observation

First-party app separation uncovered a publication path that existed in source but lacked its deployed configuration. A catalog API acknowledgement did not itself prove a signed artifact had been published. Separate failures came from credentials with the wrong GitHub permission and packages whose visibility prevented consumers from pulling them.

## Reusable rule

Verify the product output consumed by the next stage: signed catalog contents, exact image digest, reachable dependency package, and runtime pullability. Workflow dispatch and API acceptance are intermediate events, not the final evidence.

Permissions are purpose-specific. Repository access does not imply workflow dispatch, package access, catalog publication, or runtime image pull authority. A successful publisher identity does not prove the runtime has the same access. Never copy an administrative credential into a new app repository merely to get publication working.

## Agent response

For an image-pull failure, inspect the failed build/publish step, image reference, package visibility, and authorized runtime access before altering application code or restarting workloads. Confirm external packages are consumable by the actual toolchain, not just the publisher's local workspace.

If publication is outside the Project task's authority, report the missing artifact or permission to its owner. Do not widen scopes, reuse a different estate's token, or replace signed-catalog verification with an arbitrary image override.

These are historical lessons. Proposed per-publisher scoping and stream extensions in the cited issue must not be represented as current delivered features.
