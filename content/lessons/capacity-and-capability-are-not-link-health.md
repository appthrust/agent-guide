---
title: "Capacity and capability are not link health"
summary: "Check branch-level capacity and the actual requested capability before accepting a healthy dependency link."
audience: "both"
section: "lessons"
order: 40
tags: ["readiness", "capacity", "dependencies"]
sources:
  - { path: "design/platform/marketplace-apps/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/engineering/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/engineering/2026-11-05-demo-driven-defect-discovery-lessons.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/issues/2026-11-05-marketplace-managed-staging-consumes-only-gpu.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# Capacity and capability are not link health

## Historical observation

A marketplace inference app created production and staging workloads that each requested a GPU. With only one GPU available, staging obtained it and production remained pending. A dependency link could look ready without the production capability being usable. Separately, a model-list endpoint responded while the consumer's prompt exceeded the supported context budget.

The branch-policy fix provided owner-level enabled-branch intent. The incident also recorded a catalog-distribution follow-up; source resolution alone did not prove every catalog had adopted it.

## Reusable rule

Ask what the next consumer actually needs: the correct branch, sufficient capacity, provider configuration, and a capability contract such as a model's input budget. A reachable Service or successful model list is weaker evidence than a safe representative invocation.

Count resources across every enabled branch before requesting scarce hardware. Adding nodes can fail on quota or cost and is not automatically authorized by an application task.

## Agent response

Inspect branch-level release state and allocation before blaming the model, network, or retry policy. If a stack manages a branch, change the owning supported intent; do not delete the child or strip ownership so it stops reconciling. Do not reroute production to staging as an unreviewed workaround.

Keep two claims separate in the report: infrastructure capacity was available to the requested branch, and the actual product action succeeded. If either is unobserved, say so. These incidents describe historical failure classes, not the live capacity of this Project.
