---
title: "One writer, owner inputs, and honest cleanup"
summary: "Coordinate the collision domain without mistaking a lease for permission or API absence for complete cleanup."
audience: "both"
section: "lessons"
order: 70
tags: ["ownership", "safety", "cleanup"]
sources:
  - { path: "AGENTS.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/engineering/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/operations/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/engineering/2026-09-10-auth-basepath-and-legacy-env-retirement.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/engineering/2026-11-06-dev-throughput-lessons.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# One writer, owner inputs, and honest cleanup

## Historical observation

Auth environment retirement showed that omitting a field in server-side apply did not remove an entry still owned by an older manager. A running new image therefore did not establish exact desired-state delivery. The durable fix belonged to the owning migration logic, with identity/concurrency checks and preservation of unrelated fields.

## Reusable rule

A declared intent and its controller-owned projection are not interchangeable write surfaces. Changing a projection can be overwritten, compete with an active controller, or silently broaden ownership. Resolve the current owner and the supported input before changing anything.

A writer lease coordinates collisions; it does not create authorization. Before a shared write, name the target, authority, sole writer, expected delta, and observation boundary. Acquire operator authority separately when the task crosses into PMC or Gateway work; this guide cannot grant it.

## Agent response

Capture before state, use the narrow authorized owner input, read back immediately, and compare non-target state. Preserve evidence of failed state while it still explains the issue. Do not delete/recreate an environment just to get a cleaner result or remove another worker's resources during your cleanup.

At closeout, state what was removed, what was deliberately retained, and which absence checks were actually possible. Removing a Project/API record is not proof that every cluster or provider resource disappeared. Revoke task-owned temporary grants, remove private material, and release coordination leases through their owner.

No lesson in this guide authorizes manipulating managed fields, bypassing a controller, or operating a live cluster.
