---
title: "Schema consumers live outside the repository"
summary: "A tightened component schema needs migration and real catalog-to-runtime evidence."
audience: "both"
section: "lessons"
order: 30
tags: ["schema", "probes", "marketplace"]
sources:
  - { path: "design/platform/marketplace-apps/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/engineering/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/engineering/2026-11-05-demo-driven-defect-discovery-lessons.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/issues/2026-11-05-marketplace-nested-probes-mismatch-web-service-schema.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# Schema consumers live outside the repository

## Historical observation

A catalog supplied nested health-probe values while `web-service` consumed flat keys. The intended health endpoints were not the actual workload probes. Later, rejecting nested keys exposed another problem: existing stored values and the distributed catalog still used the rejected shape. Some stable workloads remained healthy while the current graph became Degraded.

The incident's final source resolution introduced migrations applied before validation and compatibility checks on catalog/release selection. Its earlier temporary live repairs are not a general permission to edit projections.

## Reusable rule

The schema's consumers include published artifacts, persisted application values, and running renderers, not just current repository fixtures. Test the same values through producer → signed/distributed catalog → installation graph → Component renderer → actual probe. A correct fixture does not prove the distributed artifact is correct.

For `web-service`, the relevant flat keys are `readinessProbePath` and `livenessProbePath`; do not assume a nested object with similar spelling is accepted. Preserve all unrelated values and ownership labels during any authorized migration.

## Agent response

When a graph reports a validation/render failure, inspect the exact schema reason and current generation. Do not diagnose capacity, a bad health endpoint, or an application crash merely from a nearby symptom. `ExitCode0` alone is not a root cause.

Escalate the producer/consumer mismatch with redacted input shape, schema identity, actual rendered probe, and before/after observations. Do not weaken validation or add a compatibility fallback to make stale catalog values appear healthy.
