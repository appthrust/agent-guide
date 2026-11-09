---
title: "Authority, leases, and safe ownership"
summary: "Separate authorization from writer coordination, and retain evidence without leaking temporary access."
audience: "operator"
section: "apthctl"
order: 40
tags: ["operators", "authority", "leases"]
sources:
  - { path: "cmd/apthctl/ARCHITECTURE.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "docs/reference/cli/pmc.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "docs/apthctl/platform.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "AGENTS.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "skills/apthctl-kubernetes-debug/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "skills/apthctl-live-cluster-retention/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "skills/apthctl-issue-evidence/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# Authority, leases, and safe ownership

**Required authority:** task-scoped permission for the exact environment; management kubeconfig or product Gateway access appropriate to the observation point; and a canonical PMC writer lease before a shared management write. **Agent Guide grants none.** A key that reads this guide cannot approve a release, mint cluster credentials, or establish a lease.

## Three separate questions

1. **May this identity perform this operation on this target?** Authorization.
2. **Who is the sole writer in this collision domain now?** Lease and coordination.
3. **Which input does the owning controller accept?** Ownership and lifecycle contract.

A lease answers only the second question. A successful dry-run answers neither the first nor the third on its own. A kubeconfig file existing locally is not proof of valid target binding or continuing authority.

The canonical PMC lease is acquired through the environment's operator workflow, not through an invented CLI lease command. The source PMC reference explicitly says its workflow wrapper enforces this requirement, not the CLI itself. Do not treat a command succeeding without a lease as permission to skip one.

## Before any shared write

- Resolve exact environment, account, context, namespace, component, and intent.
- Bind credentials to that target and keep their contents out of output.
- Read before state; establish one writer and a bounded operation window.
- Use the supported owner input/API and any applicable dry-run.
- Stop if another controller or scheduled delivery owns the same change unless a supported fenced handoff exists.

Do not manually alter a projection, impersonate a field manager, forge status, or add another grant to bypass its owner. Restart, deletion, publication, identity expansion, and a broader target each need their own explicit scope.

## After the operation

Read back the intended change immediately; compare non-target state with the snapshot. Test the affected product with a fresh connection rather than only reading rollout status. Record target, authority, writer, bounded commands, outcome, and remaining resources. Revoke/expire temporary grants and verify denial where that was part of the authorization contract. Remove task-owned private files and release the writer lease; do not delete someone else's evidence.

## Retained diagnostic environments

A preserved disposable cluster has a separate evidence-retention lease, not a shared-PMC mutation grant. Reuse a credible exact issue/snapshot environment before bootstrapping another. Preserve failed state while it still explains the blocker. Superseded, released, or expired unpinned environments are cleanup candidates only after the owning operator's handoff and authorization.

If cleanup or absence cannot be observed, say so. Never label an environment clean because an API record disappeared while its underlying resources were unobserved.
