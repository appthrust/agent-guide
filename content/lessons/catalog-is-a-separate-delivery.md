---
title: "Catalog delivery is separate from platform delivery"
summary: "Follow the app image through catalog admission and the installed runtime, not only the platform release."
audience: "both"
section: "lessons"
order: 10
tags: ["marketplace", "delivery"]
sources:
  - { path: "design/platform/marketplace-apps/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/engineering/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/engineering/2026-11-05-demo-driven-defect-discovery-lessons.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/issues/2026-11-05-marketplace-first-party-apps-own-repositories.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# Catalog delivery is separate from platform delivery

## Historical observation

A November 2026 incident delivered a platform fix while the affected marketplace app still ran an older catalog-pinned image. The platform rollout succeeded; the app fix had not reached the serving workload. Later first-party repository separation established an independent image-and-catalog publication path.

## Reusable rule

Trace the complete edge: app source → image digest → catalog version/digest → catalog-source observation → installation policy → selected/stable image → public behavior. A platform image inventory entry is not marketplace image authority. A merged commit or successful publishing workflow is not proof that the installation consumed it.

For pinned installations, inspect the available version and make an authorized version change. For follow, inspect the actual admitted stream and resolved image. Neither policy can consume a catalog update the environment has not received.

## Agent response

Record which stage is stale and the identity observed at that stage. Ask the owning publisher/operator to repair that edge; do not restart a working old release or uninstall the app to hide missing publication. After delivery, read the app's own public release identity and exercise its product path. Do not use another surface's release endpoint as evidence for this app.

The incident is historical evidence for this failure class, not a claim that your current catalog or installation is stale.
