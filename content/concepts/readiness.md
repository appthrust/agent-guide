---
title: "Pod Ready is not product Ready"
summary: "Use layered, identity-bound evidence instead of treating a green condition as end-to-end acceptance."
audience: "both"
section: "concepts"
order: 20
tags: ["readiness", "verification"]
sources:
  - { path: "AGENTS.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "design/platform/marketplace-apps/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "docs/reference/cli/pmc.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# Pod Ready is not product Ready

Readiness is a set of claims, not one universal boolean. State which claim your evidence proves and which it does not.

| Claim | Useful evidence | Not established by that evidence |
| --- | --- | --- |
| Intent accepted | Current-generation admission/graph conditions | Delivery or usability |
| Delivery completed | Exact release/rollout identity and terminal outcomes | Working data plane |
| Workload ready | Current runtime and probe state | Fresh authentication, correct external routing, or useful capability |
| Dependency addressable | Resolved installation link | Provider credentials/configuration or the requested model/action |
| Product usable | Fresh public connection and actual authenticated interaction | Untested routes, other environments, or long-term stability |

## Settlement is not success

For platform delivery, **settled** means derived rollouts have terminal outcomes: Ready, Skipped, or Failed. Count them separately. Old Ready status without a matching observed generation and selected release is not proof of a new delivery. Existing connections can mask a data-plane regression, so manual readback must use a fresh connection to the exact public surface.

## Marketplace conditions

`Ready` covers the projected graph; `Healthy` covers the declared app health report. A definition with setup requirements also gets `Configured`. Ready with Configured false becomes `NeedsConfiguration`; the health observer reports `Healthy=Unknown/NotConfigured` rather than probing an intentionally unconfigured app. Definitions without requirements need not have Configured at all.

An Unconfigured dependency can be addressable and therefore resolve a dependency link. That does not prove a model can answer a prompt or an app can perform its function.

Health outcomes distinguish transport/proxy failure (`ServiceUnreachable`), application non-success (`AppResponded`), invalid successful-response shape (`InvalidReport`), and a changing serving incarnation (`Transitioning`). A proxy 401 is not automatically an application credential failure. Inspect the failing boundary before rotating a secret.

## Proportionate acceptance

For a code change, exercise the smallest check that can expose the affected contract. For visible behavior, use the actual browser path. For persistence, perform a safe authorized write and read it back. Check new login separately from an already authenticated session.

A useful report contains: intended source/image, observed release/generation, exact surface, observation window, action, result, and limits. Never upgrade a redirect into authenticated success, a short probe into a soak, or an unobserved state into absence. This guide release `{{.ReleaseVersion}}` records instructions, not live readiness.
