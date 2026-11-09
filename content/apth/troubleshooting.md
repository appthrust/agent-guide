---
title: "Troubleshoot from the failed boundary"
summary: "Separate authentication, delivery, image, runtime, publication, and product failures before changing anything."
audience: "developer"
section: "apth"
order: 90
tags: ["troubleshooting", "readiness"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/skills/appthrust-app-dev/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "design/platform/marketplace-apps/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/components.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "AGENTS.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# Troubleshoot from the failed boundary

Record what failed, the exact Project/application, observation time, selected release, and typed reason. A hypothesis is not a root cause. Start with the smallest read that separates likely causes:

```bash
apth whoami
apth apps get "$APP"
apth apps logs "$APP" --tail 200
apth components delivery {{.ProjectID}} "$COMPONENT"
apth components release-state {{.ProjectID}} "$COMPONENT"
apth components runtime-status {{.ProjectID}} "$COMPONENT"
apth publishes readiness {{.ProjectID}}
```

Use IDs returned for this application; never guess a Component from its display title. Logs may contain application secrets even when the CLI protects its own credentials: bound and redact them.

## Interpret the result

| Observation | Meaning and next step |
| --- | --- |
| HTTP 401 or invalid `whoami` | Follow the emitted login hint for this profile. Credential expiry is not a workload failure. |
| HTTP 409 `delivery_pending` | GitOps delivery is converging; SDK retry already spent about 30 seconds. Inspect progress before one bounded replay. |
| HTTP 409 `delivery_blocked` | Delivery root unhealthy; involve the operator, do not loop. |
| `project is required` | Set `apth context set --project {{.ProjectID}}`, or supply the command's required positional Project. |
| Ambiguous placement | Inspect `apth placement-zones list`; select an authorized returned zone. |
| `SecretNotFound` for generated web env | Connection projection may still be pending; historically about one minute after creation. Inspect progress instead of inventing credentials. |
| `ImagePullBackOff` or no resolved image | Check image visibility, pull authorization, and the build result. |
| Publish DNS pending | Inspect publish readiness and certificate/DNS state; historical propagation was usually under three minutes, not a deadline guarantee. |
| Application wait returns immediately after push | It observed an old healthy release; add the commit-time/version fence. |
| No newer release after five minutes | Inspect the source build with `gh run list` and its failure log; do not restart a healthy older workload. |
| Marketplace `NeedsConfiguration` | Satisfy the declared credential/link requirements using authorized inputs. No secret belongs in a report. |
| Marketplace `Degraded` | Read its conditions; a current graph/schema failure can coexist with a healthy old stable release. |

For a newly pushed commit:

```bash
apth apps wait "$APP" --released-after "$(git log -1 --format=%cI)" --timeout 10m
```

## Walk the readiness ladder

1. **Identity**: correct API, Project, credential, application, and release.
2. **Accepted intent**: graph/schema and placement decisions accepted.
3. **Delivery and release**: current generation observed; desired image reaches stable state.
4. **Runtime**: relevant workloads and database connection work.
5. **Publication**: route, DNS, TLS, and authorization work on the actual returned URL.
6. **Product**: a fresh authenticated request performs the requested action and persisted state reads back.

A redirect proves neither sign-in nor product behavior. An old browser session proves neither new-token issuance nor fresh OAuth login. Do not clear status, delete the Project, broaden permissions, or uninstall/reinstall to make a readiness badge change. If the failing boundary is infrastructure you cannot observe, send the operator the redacted evidence and exact missing authority.
