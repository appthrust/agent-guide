---
title: "What apth covers without a kubeconfig"
summary: "apth needs only the Platform API and a login. This page lists what that covers and the exact points where a kubeconfig and the operator tool begin."
audience: "both"
section: "apth"
order: 5
tags: ["scope", "authority", "kubeconfig"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/root.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "cmd/apthctl/ARCHITECTURE.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "docs/reference/cli/cluster.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# What apth covers without a kubeconfig

`apth` talks only to the Platform API at `{{.PlatformAPIURL}}`. It never reads a kubeconfig, `KUBECONFIG`, or `~/.kube/config`, and it never runs `kubectl`. Everything in the first table works with nothing more than:

```bash
apth login --api-url {{.PlatformAPIURL}} --project {{.ProjectID}}
apth whoami
```

If a task for Project `{{.ProjectID}}` seems to need a kubeconfig, first check the tables below. Most Project work does not.

## Works with apth alone

Your Project role decides which of these calls are permitted; none of them needs cluster credentials.

| Task | Command groups |
| --- | --- |
| Sign in, select the Project, manage profiles | `login`, `whoami`, `profiles`, `context`, `projects` |
| Create, configure, publish, and delete applications | `apps`, `applications`, `application-stacks`, `components`, `component-connections`, `publishes` |
| Read recent application logs and wait for readiness | `apps logs`, `apps wait` |
| Releases and container release state | `releases`, `container-instances` |
| Data services | `databases`, `caches`, `storage` |
| Marketplace apps | `app-installations` |
| Registries, source repositories, GitHub connection | `registries`, `registry-connections`, `source-connections`, `github` |
| Domains, DNS zones, gateways | `domains`, `zones`, `gateways` |
| Clusters as Project resources: create, update, status, connectivity check | `clusters` |
| Read models for operations, monitoring, and runtime | `operations`, `monitoring`, `runtime` |
| Access keys and agent skills | `access-keys`, `skills` |

`apth clusters` manages a cluster through the Platform API: it reports status and changes declared intent. It does not hand you a kubeconfig and is not a substitute for `kubectl`.

Run `apth --help` and `apth <group> --help` for the exact subcommands and flags. Do not invent them.

## Needs a kubeconfig: operators only

These are outside `apth`. They use `apthctl` or `kubectl`, and each needs a credential that this guide and its access key do not grant.

| Task | Tool | Credential you must be given |
| --- | --- | --- |
| `kubectl` inside a workload cluster (Pods, events, exec) | `kubectl` | Gateway kubeconfig issued for that exact cluster |
| Platform release selection, rollout, channel status | `apthctl pmc ...` | Management (PMC) kubeconfig and context for this environment |
| Runtime-path and cluster diagnostics | `apthctl runtime-path ...`, `apthctl cluster check` | Management (PMC) kubeconfig and context for this environment |
| Platform updates | `apthctl pmc update` | The above, plus the PMC writer lease and explicit authority |

## A kubeconfig on your machine is not this environment's

A kubeconfig already present in `~/.kube/config` or `KUBECONFIG` almost certainly points at a different environment. Do not aim `apthctl` or `kubectl` at it to operate this Project: it will fail, or worse, reach the wrong cluster.

- For Project work, stay on `apth`. No kubeconfig is involved.
- If `apth` rejects a request, read [troubleshooting]({{.PublicURL}}/md/apth/troubleshooting.md). A rejected Project request is a permission or input problem, not a reason to switch tools.
- If the task truly is in the second table, stop and ask the environment's operator for the exact credential. Then read the [operator overview]({{.PublicURL}}/md/apthctl/overview.md).
