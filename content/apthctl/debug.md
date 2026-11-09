---
title: "Diagnose infrastructure with apthctl"
summary: "Use current runtime-path and cluster diagnostics, keeping stored health separate from active product evidence."
audience: "operator"
section: "apthctl"
order: 30
tags: ["operators", "diagnostics", "gateway"]
sources:
  - { path: "cmd/apthctl/ARCHITECTURE.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "docs/reference/cli/pmc.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "docs/apthctl/platform.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "AGENTS.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "skills/apthctl-kubernetes-debug/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# Diagnose infrastructure with apthctl

**Required authority:** authorized PMC kubeconfig/context for management reads; independently granted product Gateway access for member/tenant inspection. Shared PMC mutations require explicit target authority and the canonical PMC lease. **This app grants none of them.** Diagnosis below is read-only; observing a failure does not grant permission to repair it.

At the cited revision there is no generic `apthctl debug` command. The actual diagnostic interfaces include `runtime-path status`, `runtime-path check`, `cluster check`, and PMC status. Do not invent a command from the page's title.

## Start with an exact runtime path

The operator must obtain `$RUNTIME_PATH` and `$NAMESPACE` from the authorized target's inventory; they are not inferred from a Project ID.

```bash
apthctl --kubeconfig "$PMC_KUBECONFIG" --kubeconfig-context "$PMC_CONTEXT" runtime-path status --id "$RUNTIME_PATH" --namespace "$NAMESPACE" --output json
apthctl --kubeconfig "$PMC_KUBECONFIG" --kubeconfig-context "$PMC_CONTEXT" runtime-path check --id "$RUNTIME_PATH" --namespace "$NAMESPACE" --output json
```

`status` reports stored seven-layer health and generation-bound active evidence. Healthy status with absent, disabled, stale, or mismatched active evidence is only partial proof. `check` correlates fresh management resources and bounded provider DNS observations; an old Gateway status alone does not establish a systemic root cause.

By default, the check does not enter members. Explicit member diagnostics require separate authorized Product API/Gateway access. Do not enable them simply to get more output. Read-only observation has no patch, restart, exec, or secret-dump step.

## Cluster-level conditions

The local bring-up guide also provides this bounded check. Use it only when the entire scope selected by that kubeconfig is authorized; do not aim a broad scope at unrelated shared clusters:

```bash
apthctl cluster check --scope all --wait --timeout 3m --kubeconfig "$PMC_KUBECONFIG" --kubeconfig-context "$PMC_CONTEXT"
```

If closer workload evidence is needed, follow the operator triage order: non-ready Pods → recent events → exact failing resource → bounded controller/job logs → scoped bundle only when needed. Use the approved Gateway path; do not substitute substrate admin access. `BackoffLimitExceeded`, `EOF`, and `ExitCode0` are symptoms until the owning events and runtime configuration explain them.

## Report the boundary, not a guess

Runtime-path status/check uses exits 0 for sufficient current success, 1 for read/access/unexpected errors, 2 for failed or partial/inconclusive evidence, 3 for parent timeout, and 4 for configuration/identity ambiguity. A partial or unreadable path is not evidence of absence.

Report the exact path, time, generation/identity, failing layer, typed reason, and missing authority. Keep tokens, kubeconfig contents, internal addresses, and sensitive application logs out of the report. Escalate the concrete missing observation; do not patch status or rerun with expanded permissions.
