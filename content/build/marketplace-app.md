---
title: "Build a marketplace app"
summary: "The contract between a catalog app and the platform: the definition, the environment and HTTP surface, the Go server SDK, access and Access Keys, and what publishing requires."
audience: "developer"
section: "build"
order: 50
tags: ["marketplace", "catalog", "definition", "appserver-go", "access-keys"]
sources:
  - { path: "design/platform/marketplace-apps/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "design/platform/marketplace-apps/first-party-app-repositories.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "design/platform/marketplace-apps/app-authorization.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "design/platform/access-keys/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "model/api/core/v1alpha1/application_stack_definition.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "appthrust-operator/pkg/controllers/core/publish/accesspolicy/render.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
---

# Build a marketplace app

A marketplace app is one catalog definition that any Project can install. Installing creates an `AppInstallation` and an ordinary Application graph that the Project owns. To operate an installed app, read the [marketplace cookbook]({{.PublicURL}}/md/apth/cookbook/marketplace-apps.md); this page is for the author of the app.

## Before you start

- **Publishing needs catalog publisher authority.** A definition reaches a platform only through the signed catalog. At the cited revision the publishers are first-party repositories holding a catalog credential; there is no third-party publisher path, and app roles are for first-party catalog apps.
- If you do not hold that authority, build [your own Application]({{.PublicURL}}/md/build/platform-connection.md) in this Project. It gets the same sign-in, permissions, and Platform API access.
- Agent Guide grants no publication authority. Nothing on this page authorizes a publish.

## Repository shape

An app lives in its own repository and is built and released independently of the platform:

```text
<app>/
  cmd/server/           Go server: API, static SPA, probes
  web/                  SPA
  catalog/entry.yaml    the ApplicationStackDefinition document
  Dockerfile            multi-stage; a non-root runtime image
  .github/workflows/    CI and the tag-driven publish
```

The server needs no platform checkout and no private module: it depends on the public `github.com/appthrust/appserver-go`.

## The definition

`catalog/entry.yaml` declares everything the installer renders. A web app with a database that signs users in and calls the Platform API:

```yaml
apiVersion: appthrust.io/v1alpha1
kind: ApplicationStackDefinition
metadata: { name: expense }
spec:
  display: { title: Expense, category: collaborate, description: "Submit and approve expense reports." }
  components:
    - id: web
      definitionRef: { name: web-service, version: v1 }
      defaultValues: { port: 8080, minScale: 1, readinessProbePath: /readyz, livenessProbePath: /healthz, publicURLEnv: EXPENSE_PUBLIC_URL }
    - id: database
      definitionRef: { name: postgresql, version: v1 }
      defaultValues: { provider: CNPG, storageSize: 2Gi }
  connections:
    - { name: database, from: web, to: database }
  publish: { hostnameLabel: expense }
  access:
    audiences: [appthrust-platform-api]
    scopes: [openid, profile, email]
    tokenClaims: [groups]
    permissions:
      - { name: "reports:read" }
      - { name: "reports:approve" }
    roles:
      - { name: member, permissions: ["reports:read"] }
      - { name: approver, permissions: ["reports:read", "reports:approve"] }
    defaultBindings:
      - { role: member, subject: { kind: Authenticated } }
  releaseIdentityEnvPrefix: EXPENSE
  updatePolicy: { default: pinned, allowed: [pinned, follow] }
  versions: []   # written by the publisher on each release
```

| Field | Meaning |
| --- | --- |
| `metadata.name` | The definition name. It is also the installation name: a Project has at most one installation of a definition |
| `components`, `connections` | The graph: slots that reference component definitions, and slot-to-slot wiring |
| `publish.hostnameLabel` | The host label of the app's URL in a Project |
| `access` | Edge sign-in and app authorization; see below |
| `dependencies[]` | Other definitions this app links to: `definition`, `urlEnv`, optional `publicURLEnv`, `installPolicy` |
| `requirements[]` | Configuration the app needs before it is usable (at most eight). They drive the installation's `Configured` condition, not `Ready` |
| `releaseIdentityEnvPrefix` | Prefix of the release variables the platform injects |
| `updatePolicy` | `follow` or `pinned`, and which of them an installer may choose |
| `versions[]` | Released versions: `name`, `images`, `stream`, `served`, `default`, `minPlatformVersion` |

The catalog is decoded strictly. A platform release that predates a field cannot read an entry that uses it, so publish a schema addition in a new version whose `minPlatformVersion` is the first release that understands it.

## Access

| `access` field | Effect |
| --- | --- |
| `scopes` | OIDC scopes the edge requests; defaults to `openid`, `profile`, `email` |
| `audiences` | Audiences required in the forwarded token. `appthrust-platform-api` lets the app [call the Platform API as the user]({{.PublicURL}}/md/build/call-platform-api.md) |
| `tokenClaims` | Extra claims to request, without adding an edge rule |
| `bearerPassThrough` | Accept a verified JWT in `Authorization` without a sign-in cookie; needed for API clients and Access Keys |
| `permissions`, `roles`, `defaultBindings` | The app's access model |
| `accessKeys` | Publishes an Access Key Space for the app's API |

The access model follows the rules in [app permissions]({{.PublicURL}}/md/build/app-permissions.md), with the installation in place of the Application:

- Role permissions must be declared permissions, default bindings must name declared roles, and Access Key scope names must be declared permissions once any are declared.
- Permission and role names are append-only across versions.
- A Project manager accepts the model per installation. Installing without `project.manage` creates no grant, and a catalog update alone changes nothing for an existing installation until its model is accepted again.
- A link callee receives the caller app's bearer, not the user's own session, so an app that is only called through links does not declare roles.

## What the server receives

| Variable | Source |
| --- | --- |
| `PLATFORM_API_URL`, `PLATFORM_PROJECT_ID`, `PLATFORM_OIDC_ISSUER`, `PLATFORM_OIDC_ISSUER_CA_PEM`, `PLATFORM_ACCESS_ISSUER`, `PLATFORM_APPLICATION` | The `platform` connection the installer adds |
| `DATABASE_URL` | The database connection |
| `<PREFIX>_PUBLIC_URL` | The published origin, under the name in `publicURLEnv` |
| `<PREFIX>_OIDC_AUDIENCES` | The audiences from `access.audiences` |
| `<PREFIX>_ACCESS_AUDIENCE` | The Access Key audience, under the name in `accessKeys.audienceEnv` |
| `<PREFIX>_RELEASE_VERSION`, `<PREFIX>_ARTIFACT_DIGEST` | The catalog version being run |
| The names in each dependency's `urlEnv` and `publicURLEnv` | Addresses of linked apps |

Never hardcode an estate host, a Project ID, or an issuer. The same image must be correct on every installation.

## What the server must serve

| Route | Purpose |
| --- | --- |
| `/readyz`, `/healthz` | Probes. Report not ready while a required dependency is still connecting; stay alive |
| `GET /config` | Public, non-secret configuration for the SPA |
| `GET /releasez` | The catalog version and digest being served |
| `GET /.well-known/appthrust/health` | The app's own health report for the installation read model |
| `/authz` (optional) | An external authorization endpoint, when other publishes delegate their access decision to this app |

The edge serves sign-in, `/logout`, and the callback. The app implements none of them.

## The Go server SDK

`github.com/appthrust/appserver-go` is the versioned contract shared by the platform and its apps. Each minor maps to a minimum platform version; read its `COMPATIBILITY.md` before upgrading, and update the Platform API before adopting a newer SDK on an older installation.

| Package | Use |
| --- | --- |
| `appserver/platformenv` | Read and validate the platform connection |
| `appserver/identity` | Verify the forwarded user token or an Access Key Assertion; middleware; opt-in app permissions |
| `appserver/platformclient` | Read models of the Platform API, called with the user's bearer |
| `appserver/link` | Resolve and call a linked app |
| `appserver/launcher` | The shared app switcher's data |
| `appserver/health`, `appserver/releaseidentity`, `apphealth` | Probes, `/releasez`, and the health report |
| `appserver/httpx`, `appserver/requestlog` | The shared JSON error envelope and one structured log line per request |
| `appserver/pgstore` | PostgreSQL transactions and embedded migrations |
| `accesskey` | Assertion claims, verifier, and JWKS handling |

App permissions in Go:

```go
trust := identity.FromEnv("EXPENSE")
appAccess := identity.AppAccessFromEnv("expense") // the definition name
appAccess.RequirePermissions = true
trust.AppAccess = &appAccess
auth, err := identity.New(trust)
if err != nil {
    return err
}
handler := auth.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    user, _ := identity.FromContext(r.Context())
    if !user.Principal.Has("reports:approve") {
        httpx.WriteError(w, httpx.Forbidden(), "expense")
        return
    }
    // Perform the app-owned operation.
}))
```

People and keys use the same `Principal.Has` check. `Identity.Access.Principal` is the durable person key to store. An exchange or verification failure becomes 503 `access_unavailable`; there is no fallback to claims.

## Access Keys for machine callers

Declare a Space so that scripts, agents, and other components can call the app's API without a browser session:

```yaml
access:
  bearerPassThrough: true
  accessKeys:
    audience: expense
    audienceEnv: EXPENSE_ACCESS_AUDIENCE
    keyPrefix: exp
    scopes: [{ name: "reports:read", description: "Read expense reports" }]
    defaultConnectionScopes: ["reports:read"]
    defaultTTL: 720h0m0s
    maxTTL: 8760h0m0s
```

1. A user creates a key in the Space and receives its secret once: `apth access-keys create --project {{.ProjectID}} --space expense --scope reports:read --env`.
2. The caller exchanges the key at `{{.AccessURL}}/api/v1/access/token` for a short-lived Assertion and sends the Assertion, never the key, as the bearer.
3. The edge verifies the Assertion's issuer and audience. The server verifies it again with `appserver/identity` and checks `Principal.Has(scope)`.

When the app declares roles, a user's key cannot carry a scope outside that user's effective app permissions at the time it is issued, and it must expire. The app must reject a raw key presented as a bearer. See the [Access Key cookbook]({{.PublicURL}}/md/apth/cookbook/access-keys.md) for the caller's side.

## Release

A SemVer tag builds the multi-architecture image, signs its index, submits the catalog entry with the new `versions[]` element, and waits until the signed catalog contains that exact version and digest. A dispatched workflow is not proof of publication; the signed catalog is. Published images are immutable and earlier versions stay served.

How an installation picks up the release depends on its policy. `follow` advances the image within the declared stream. `pinned` reports that an update is available and waits for a person. Adding or removing graph members always needs a version change by the installer.

## Prove it

Install the released version in a Project, then walk the ready ladder in the [marketplace cookbook]({{.PublicURL}}/md/apth/cookbook/marketplace-apps.md): accepted, graph ready, dependencies resolved, configured, healthy. Finish with a real signed-in action on the published URL and, when the app declares roles, the allowed-and-refused pair of users from [app permissions]({{.PublicURL}}/md/build/app-permissions.md).
