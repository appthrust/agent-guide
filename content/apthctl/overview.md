---
title: "Operator track and authority boundary"
summary: "Choose the operator observation point without confusing Project access with management-cluster authority."
audience: "operator"
section: "apthctl"
order: 10
tags: ["operators", "authority"]
sources:
  - { path: "cmd/apthctl/ARCHITECTURE.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "docs/reference/cli/pmc.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "docs/apthctl/platform.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "AGENTS.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "skills/apthctl-kubernetes-debug/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "docs/reference/cli/cluster.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:appthrust/cli/install.sh", revision: "cf7ae703425a682d97a84a204baf8a455014087b" }
---

# Operator track and authority boundary

**Required authority:** an operator-authorized identity, an exact management kubeconfig/context for PMC reads, or a product-issued Gateway kubeconfig for tenant reads. Shared PMC writes additionally require the environment's canonical PMC writer lease and explicit target-scoped mutation authority. **Agent Guide grants none of these.** A read-only guide key is not an operator credential.

`apth` operates Project resources through the Public API and needs no kubeconfig. `apthctl` operates infrastructure and release lifecycle. If your task is Project work, this section does not apply: go back to [what apth covers]({{.PublicURL}}/md/apth/scope.md). Do not switch to the operator tool just because a developer API rejected a request.

Never point `apthctl` at the default `~/.kube/config` or an ambient `KUBECONFIG`. A kubeconfig already on the machine likely belongs to another environment; use only the one issued for this environment, passed explicitly.

## Install

Use the public installer from `appthrust/cli`. No authentication or token is needed:

```bash
curl -fsSL https://raw.githubusercontent.com/appthrust/cli/main/install.sh | sh -s -- apthctl
```

- Without a version argument, the installer selects the newest `apthctl` release. To select a published version, append the tag without its tool prefix: for example, `v0.1.0`, not `apthctl-v0.1.0`.
- The installer supports Linux and macOS (`linux`/`darwin`) on `amd64` and `arm64`, and verifies the archive against the release's `SHA256SUMS` before installing.
- The default destination is `~/.local/bin`. Export `APTH_INSTALL_DIR` before running the command to choose another directory, and add that directory to your shell's `PATH`.

Read back the installed binary's `version`, `revision`, and `commitDate`:

```bash
apthctl version
```

A `dev` build defaults to Helm chart version `dev`. When a released chart is required, pass `--chart-version <released>` with the intended published chart version on commands that select a chart.

Installing the binary grants no operator identity, cluster access, PMC writer lease, or mutation authority. The authority requirements above still apply.

## Choose the observation point

| Question | Required observation point |
| --- | --- |
| Application, Component, publish, or marketplace lifecycle | Project API and `apth` first |
| Platform release selection, derived rollout, delivery | Authorized PMC management context |
| Tenant workloads and logs | Product Gateway kubeconfig with the appropriate read permissions |
| Hosting/control-plane substrate or machine health | Separately authorized substrate or machine-management access |

PMC means platform management cluster. A workload cluster, storage cluster, and hosting/control-plane substrate are different roles; a context name does not prove which one you reached.

The source bring-up document describes an isolated local bootstrap topology. Do not copy its local registry, names, kubeconfig paths, or broad bootstrap operations into a shared environment.

## Read before acting

Have the operator resolve `$PMC_KUBECONFIG` and `$PMC_CONTEXT` to the exact authorized target. Never print the kubeconfig:

```bash
apthctl --kubeconfig "$PMC_KUBECONFIG" --kubeconfig-context "$PMC_CONTEXT" pmc status
apthctl --kubeconfig "$PMC_KUBECONFIG" --kubeconfig-context "$PMC_CONTEXT" pmc channel status
```

A missing channel can be legitimate; its status command failing does not authorize enabling one. Record selected release identity and observed conditions separately from a product health claim.

For tenant access, the documented product flow is operator login followed by `apthctl cluster kubeconfig` with `--from-platform-api` and an output file. Have an authorized operator supply the exact identity and cluster; do not derive a Gateway URL from `{{.BaseDomain}}` or extract administrative keys.

Next: [diagnostics]({{.PublicURL}}/md/apthctl/debug.md), [release updates]({{.PublicURL}}/md/apthctl/pmc-update-and-releases.md), or [authority and leases]({{.PublicURL}}/md/apthctl/authority-and-leases.md).
