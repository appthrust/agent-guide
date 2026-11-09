---
title: "The Project application model"
summary: "Understand the resources and owners behind developer and marketplace workflows."
audience: "both"
section: "concepts"
order: 10
tags: ["model", "ownership"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/skills/appthrust-app-dev/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "design/platform/marketplace-apps/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# The Project application model

| Concept | Meaning | Agent operating rule |
| --- | --- | --- |
| Project | Scope for application resources, permissions, and context | Bind every request to `{{.ProjectID}}`; never reuse another environment's context |
| Application | Product-level grouping of components, branches, configuration, and releases | Read IDs and ownership rather than equating display names |
| Component | A declared workload, database, cache, or other building block | Change its owner input; inspect delivery and runtime separately |
| ApplicationStack | Declarative graph of components, connections, and associated resources | Treat it as the lifecycle owner when a child is stack-managed |
| ComponentConnection | Declared connection that projects required runtime configuration | Do not hardcode generated endpoints or secrets |
| Publish | Intent to expose an application through an endpoint | Verify route, DNS/TLS, authorization, and the actual public action |
| Release | Selected immutable runtime incarnation and its transition | Distinguish initial image, target release, and stable serving release |
| Marketplace definition | Signed catalog-sourced ApplicationStackDefinition with versions | Catalog admission is image authority, not arbitrary registry contents |
| AppInstallation | Project record of a catalog installation, policy, requirements, and read model | It owns installation lifecycle/dependency information, not every graph field |
| Operation | Acknowledgement and observable progress for a requested change | Accepted is not completed; completed is not product acceptance |

## Two control paths

Developer workflow: source → image publication → repository selection → release → runtime → public product behavior.

Marketplace workflow: app publisher → signed catalog → verified catalog source → definition → installation and stack → admitted image → release. A Platform release and a marketplace app release are independent. Updating one does not prove the other changed.

Marketplace graphs are user-owned through the Platform API. The installation controller manages its dependency connections and admitted-image set, plus status such as links, health, and available version. It does not silently recreate a user-deleted dependency or repair every edited graph member.

## Follow the correct owner

Use `apth apps get` for the high-level app view, `apth application-stacks list` to discover stack IDs, and `apth components list` to discover component IDs (see the cookbooks for complete invocation syntax). Manage marketplace installation lifecycle in the Dashboard where the pinned CLI lacks commands.

Do not revive retired addon terminology as a second ownership model. A Component's accepted intent, a ready link, a configured provider, and a working user action are related but separate facts.
