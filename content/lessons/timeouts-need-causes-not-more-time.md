---
title: "Timeouts need causes, not more time"
summary: "Measure the stalled stage and obey typed retry contracts instead of extending deadlines blindly."
audience: "both"
section: "lessons"
order: 60
tags: ["timeouts", "retry", "diagnostics"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "AGENTS.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/engineering/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/engineering/2026-11-06-dev-throughput-lessons.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# Timeouts need causes, not more time

## Historical observation

A development-throughput review found that perceived slow CI often meant an unattended stuck rollout or checkout contention, not slow compilation. Several timeout failures had different owners: controller ordering, proof classification, bridge planning, and hidden wrapper errors. Increasing every timeout would have preserved the defects.

## Reusable rule

Measure the stages separately: request/CI gate → artifact publication → selection → rollout settlement → product probe. Preserve the exact selection's progress reason; healthy lower-level applications can coexist with an unsettled higher-level selection.

A typed retry contract is narrow. A conflict known to be transient may justify bounded replay; a different 409 may be a terminal ownership/admission refusal. SDK handling of `delivery_pending` does not justify retrying `delivery_blocked` or every marketplace error.

## Agent response

On deadline, record the last state, release/operation identity, elapsed window, and missing predicate. Inspect the owning error before extending time. When diagnosis was not captured, add the smallest authorized, bounded observation on the next attempt rather than guessing a retry fix.

For application development, overlap independent implementation with provisioning, but retain visibility into the provisioning result. Do not hide a failed operation in a detached loop. Report timeout as timeout even if a later independent observation sees progress.

The historical development-channel supersession policy is not a universal operator permission. This Project's app task cannot change a release channel or bypass its owner.
