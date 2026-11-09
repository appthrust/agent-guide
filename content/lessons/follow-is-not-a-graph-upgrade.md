---
title: "Follow is not a graph upgrade"
summary: "Keep image selection, declared version, release environment, and graph migration as separate identities."
audience: "both"
section: "lessons"
order: 20
tags: ["marketplace", "follow", "versions"]
sources:
  - { path: "design/platform/marketplace-apps/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/engineering/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/engineering/2026-11-06-first-party-app-repo-separation-lessons.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/issues/2026-11-05-marketplace-catalog-publisher-and-follow-semantics.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# Follow is not a graph upgrade

## Historical observation

The first external app publication proved that follow could advance the resolved image without changing the installation's declared version. Its release endpoint still reported version-derived environment from the declared version. A separate repository-path migration needed explicit repository replacement because image-path identity was immutable.

## Reusable rule

Track four things independently:

1. Declared installation version and update policy.
2. Catalog-admitted digest/tag in the declared stream.
3. Actual stable serving image.
4. Runtime configuration and graph shape derived from the declaration.

A version label alone is insufficient when these disagree. A follow policy is not an arbitrary semver-range selector, an admission bypass, or automatic re-rendering of added/removed members. Switching to pinned changes selector intent; it does not mean any registry digest becomes trusted.

## Agent response

Inspect the installation and runtime read models, and compare the app's public release identity without hiding discrepancies. Use a reviewed Dashboard version change for graph changes. Treat an image repository move as an explicit identity migration, not a tag-filter tweak. Never patch the controller-owned admitted-image list to force a release.

The cited publisher-authentication and stream-granularity issue records open questions at its writing date. Do not present its proposed semver constraints or broader publisher identity model as implemented capability. Current behavior is bounded by the pinned platform contract and the installed version.
