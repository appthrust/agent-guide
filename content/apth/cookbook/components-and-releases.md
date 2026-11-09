---
title: "Inspect components and releases"
summary: "Trace a stack through delivery, runtime status, and its current release using the Component surface."
audience: "developer"
section: "apth"
order: 40
tags: ["components", "releases"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/components.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/delivery.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "AGENTS.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# Inspect components and releases

Start with the owning stack; do not assume the stack name, Application ID, and Component ID are interchangeable.

```bash
apth application-stacks list {{.ProjectID}}
apth application-stacks get {{.ProjectID}} "$STACK"
apth components list {{.ProjectID}}
apth components get {{.ProjectID}} "$COMPONENT"
```

Set `$STACK` and `$COMPONENT` from the returned IDs for the assigned application. These commands require the Project as a positional argument even when the profile has a default.

## Follow the evidence chain

```bash
apth components delivery {{.ProjectID}} "$COMPONENT"
apth components release-state {{.ProjectID}} "$COMPONENT"
apth components runtime-status {{.ProjectID}} "$COMPONENT"
```

- **Delivery**: was the declared input delivered to the runtime target?
- **Release state**: which release is selected, transitioning, blocked, or stable?
- **Runtime status**: what does the actual workload report?
- **Product readback**: does the exact public endpoint accept a fresh authenticated request and perform the intended action?

Capture identity, generation, condition type/reason, and observation time. A successful delivery does not prove the latest image is serving. A stable older release can remain usable while a new transition fails.

## Use the modern release surface

Prefer Component release operations. The README explicitly describes ContainerInstance release commands as legacy compatibility access; do not build a new workflow around them.

If automatic releases were intentionally paused, first establish why and who owns that decision. After explicit authority to resume:

```bash
apth components resume-auto {{.ProjectID}} "$COMPONENT" --wait --timeout 2m
apth components release-state {{.ProjectID}} "$COMPONENT"
```

Rollback and workload restart have distinct consequences. Inspect their exact contract before proposing one:

```bash
apth components rollback --help
apth components restart-workload --help
```

Do not fabricate a rollback request body, restart all components, or clear failed status to make a dashboard green. Fix the owning source/input and use the supported release mechanism; managed projections may otherwise be overwritten by reconciliation.
