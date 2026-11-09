---
title: "Fresh connections and fresh login are separate proofs"
summary: "An existing session can hide authentication and routing defects that a fresh user encounters."
audience: "both"
section: "lessons"
order: 50
tags: ["auth", "readiness", "verification"]
sources:
  - { path: "AGENTS.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/engineering/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/operations/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/engineering/2026-09-10-auth-basepath-and-legacy-env-retirement.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# Fresh connections and fresh login are separate proofs

## Historical observation

An auth-service change passed public endpoint checks and an already signed-in browser showed the expected identity after reload. The investigation explicitly did not claim a new password-to-provider-to-callback login had succeeded. Another stage had a new image running while obsolete environment ownership prevented desired-state equivalence.

## Reusable rule

Separate image readiness, exact desired-state delivery, accepted authority, authenticated access, and fresh login. Existing cookies and long-lived network connections can hide the failing boundary. A redirect to an identity provider proves routing only; it is not a completed authentication flow.

When changing auth behavior, test the path the change affects. For a new-login claim, start a new session and observe the full callback path without recording passwords, cookies, tokens, or CSRF values. For a public routing claim, establish a fresh connection to the exact surface.

## Agent response

Record which session state was used, what action was exercised, the response/result, and what remains untested. A reload that resolves a transient screen is an observation, not proof the underlying issue is fixed.

If a removed environment entry survives delivery, investigate the owning producer and field ownership. Do not suppress warnings or strip another manager's fields from a live projection. Source migration and a supported, fenced ownership transition are different from a manual environment edit.

The operations index warns against inferring live readiness from stored runbooks. Historical successful auth evidence cannot be reused as today's acceptance result.
