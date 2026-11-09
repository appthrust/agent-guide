---
title: "PMC updates and release evidence"
summary: "Understand verified release selection, typed waits, and the additional public readback required after an authorized update."
audience: "operator"
section: "apthctl"
order: 20
tags: ["operators", "releases", "pmc"]
sources:
  - { path: "cmd/apthctl/ARCHITECTURE.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "docs/reference/cli/pmc.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "docs/apthctl/platform.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "AGENTS.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "skills/apthctl-kubernetes-debug/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# PMC updates and release evidence

**Required authority:** exact PMC management kubeconfig/context, explicit authority for the release and target, and the canonical shared-PMC writer lease. Gateway-only tenant access is insufficient. **Agent Guide grants no credential, mutation permission, or lease.** These commands are a contract reference, not authorization to update an environment.

## Before the write

Bind the target to its actual account/context/namespace, confirm one writer, and capture the selected release, channel state, rollout conditions, and affected public surface. Inspect the immutable intended release and its signatures. Choose a fresh evidence directory; do not reuse a prior attempt's timeline.

```bash
apthctl --kubeconfig "$PMC_KUBECONFIG" --kubeconfig-context "$PMC_CONTEXT" pmc status --output json
apthctl --kubeconfig "$PMC_KUBECONFIG" --kubeconfig-context "$PMC_CONTEXT" pmc channel status --output json
```

`$RELEASE_REF` below is the independently selected **PlatformRelease**, not Agent Guide's app version. After authority and preflight are established:

```bash
apthctl --kubeconfig "$PMC_KUBECONFIG" --kubeconfig-context "$PMC_CONTEXT" pmc update --release "$RELEASE_REF" --require-verified --wait --timeout 3m --evidence-dir "$EVIDENCE_DIR"
```

Three minutes bounds this observation window, not the environment's expected completion time. On timeout, preserve evidence and inspect the owner-reported blocker; do not replay the same write blindly.

## What update changes

The command verifies the release and artifacts, checks installed-schema compatibility, and updates the selected release through its owning API. It may also reconcile the declared self-Klusterlet feedback settings through its dedicated dry-run-first manager. It does not repair delivery by editing derived rollouts, Argo resources, or ManifestWorks.

`--require-verified` requires matching signed release/verification digest evidence. The default can admit pending CI evidence; that is a different claim. Do not add unverified, force, or fence-bypass flags to make a refused update pass.

An ordinary release change waits for the previous exact selection to settle. Supersession and rollback are separate decisions; neither is implicit retry. Rollback must coordinate channel pause so automatic intake cannot immediately advance again. A lease alone does not authorize either operation.

## Read the typed result

- **Ready**: current-generation acceptance and matching release identity plus current Ready condition.
- **Skipped**: accepted rollout with `Placed=False/NoClustersSelected`; count separately, never call it Ready.
- **Failed**: a terminal rejection or delivery failure. Preserve its reason and owning child.
- **Pending/timeout**: unmet observation, not fabricated failure or success.

After the command, read back the exact selection and affected rollout, compare non-target resources with the before snapshot, then exercise the real public endpoint using a fresh connection. Settled rollouts and healthy Pods cannot replace product proof. Preserve the bounded evidence, remove only task-owned temporary access material, and release the PMC lease through its owning workflow.

For an old installed schema, `apthctl release hops --from "$CURRENT_RELEASE" --to "$RELEASE_REF"` plans an admissible published bridge chain. This is registry/signature/schema evidence, not a live rollout or rollback proof.
