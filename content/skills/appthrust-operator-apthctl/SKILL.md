---
name: "appthrust-operator-apthctl"
description: "Operators only, not for Project work with apth: requires a kubeconfig issued for this environment. Use for authorized infrastructure diagnosis with apthctl, exact PMC or Gateway access, bounded evidence, and safe escalation; this skill grants no credentials, lease, or mutation authority."
title: "AppThrust operator diagnostics"
summary: "Operators only, not for Project work with apth: requires a kubeconfig issued for this environment. Use for authorized infrastructure diagnosis with apthctl, exact PMC or Gateway access, bounded evidence, and safe escalation; this skill grants no credentials, lease, or mutation authority."
audience: "operator"
section: "apthctl"
order: 100
tags: ["skill", "operators", "diagnostics"]
sources:
  - { path: "cmd/apthctl/ARCHITECTURE.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "docs/reference/cli/pmc.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "docs/apthctl/platform.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "AGENTS.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "skills/apthctl-kubernetes-debug/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "docs/reference/cli/cluster.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "skills/apthctl-live-cluster-retention/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:appthrust/cli/install.sh", revision: "cf7ae703425a682d97a84a204baf8a455014087b" }
---

# AppThrust operator diagnostics

**Authority required:** an operator-approved identity and exact target; management kubeconfig/context for PMC reads; product-issued Gateway access for tenant/member reads. Shared PMC writes additionally require explicit scope and the canonical PMC writer lease. **Agent Guide and its Access Key grant none of these.** Do not turn a Project app task into an infrastructure repair without that authority.

This guide's Project is `{{.ProjectID}}` and its Platform API is `{{.PlatformAPIURL}}`. Neither value identifies a management context or grants cluster access.

## Install apthctl

If `apthctl` is not installed, use the public installer; it needs no authentication or token:

```bash
curl -fsSL https://raw.githubusercontent.com/appthrust/cli/main/install.sh | sh -s -- apthctl
```

Add the installation directory (default `~/.local/bin`, overridable with `APTH_INSTALL_DIR`) to `PATH`. Read [the operator overview]({{.PublicURL}}/md/apthctl/overview.md) for version selection, checksum verification, `apthctl version` readback, and the `dev` chart default. Installing the binary grants none of the authority required above.

## 1. Resolve the boundary before reading

Determine whether the failure belongs to an application, release delivery, Gateway path, tenant workload, or substrate. Keep PMC, workload, storage, and hosting/control-plane roles distinct. Verify the actual context binding and use only the authorized path; a familiar name in local kubeconfig is insufficient.

Prefer the Project API for app questions. Tenant inspection uses the product Gateway kubeconfig rather than raw admin keys. Do not print kubeconfigs, tokens, certificates, private keys, provider credentials, or Secret contents.

## 2. Use actual diagnostic commands

At this source revision there is no generic `apthctl debug` command. Use the current source-coupled interfaces. Resolve variables from authorized inventory:

```bash
apthctl --kubeconfig "$PMC_KUBECONFIG" --kubeconfig-context "$PMC_CONTEXT" pmc status --output json
apthctl --kubeconfig "$PMC_KUBECONFIG" --kubeconfig-context "$PMC_CONTEXT" pmc channel status --output json
apthctl --kubeconfig "$PMC_KUBECONFIG" --kubeconfig-context "$PMC_CONTEXT" runtime-path status --id "$RUNTIME_PATH" --namespace "$NAMESPACE" --output json
apthctl --kubeconfig "$PMC_KUBECONFIG" --kubeconfig-context "$PMC_CONTEXT" runtime-path check --id "$RUNTIME_PATH" --namespace "$NAMESPACE" --output json
```

A missing release channel is not permission to create one. Runtime-path status separates stored health from current generation-bound active evidence. Missing or stale evidence is partial, not product acceptance. The default check reads exact management resources and bounded DNS evidence; it does not enter members or mutate anything. Member diagnostics require a separate explicit authorized choice.

For an authorized scope covering all clusters selected by the kubeconfig:

```bash
apthctl cluster check --scope all --wait --timeout 3m --kubeconfig "$PMC_KUBECONFIG" --kubeconfig-context "$PMC_CONTEXT"
```

Do not widen a shared read scope merely because this example says all. Prefer exact target inventory and the least broad useful observation.

## 3. Gather the failing layer's evidence

If cluster conditions do not explain the failure, the operator triage sequence is non-ready Pods → recent events → exact resource description → bounded controller/job logs → scoped bundle when necessary. Use the approved Gateway/management observation point and existing operator tooling. Do not scrape raw credentials or send Secret payloads into an LLM.

`EOF`, `BackoffLimitExceeded`, and `ExitCode0` are not root causes without corroborating evidence. Preserve exact resource identity, generation, typed condition/reason, and observation time. Do not merge observations from different incarnations after an identity changes during collection.

Runtime-path diagnostics distinguish sufficient success (0), read/access/unexpected failure (1), failed/partial evidence (2), timeout (3), and configuration/identity ambiguity (4). Missing visibility is not absence.

## 4. Stop before unauthorized repair

Do not patch a controller projection, forge status, restart a workload, grant broader access, or supersede a release simply because diagnosis found a problem. A lease coordinates writers but does not grant permission. Use the owning API/input for a separately authorized change.

For a release task, read [PMC updates]({{.PublicURL}}/md/apthctl/pmc-update-and-releases.md): bind immutable release identity, capture before state, hold one writer lease, use the supported verified update with `--wait --timeout`, and read back the affected selection and non-target state. Do not import the local bring-up document's registry/context assumptions into a shared environment.

## 5. Report and clean up honestly

Report the exact target/path, failed layer, reason, evidence window, access limitations, and smallest next owner action. Pod Ready, release settlement, fresh authentication, and product acceptance are separate claims; a public product check needs a fresh connection and actual user action.

Retain a failed disposable environment only while it has evidence value under its owner's retention policy. Its retention lease is not a PMC mutation lease. Remove task-owned private files, revoke temporary grants through their owner, and release writer coordination when done. Never delete unrelated resources or claim complete cleanup without observing the relevant boundaries.
