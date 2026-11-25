---
title: "Authorize app users with roles and permissions"
summary: "Declare an access model for an Application, have a Project manager accept it and bind roles, then check permissions on the server from a platform-signed Assertion."
audience: "developer"
section: "build"
order: 30
tags: ["authorization", "roles", "permissions", "assertion"]
sources:
  - { path: "design/platform/application-access/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "design/platform/marketplace-apps/app-authorization.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "dashboard/packages/app-access/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "dashboard/packages/api-schema/openapi.platform-api.json", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "sdk/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "sdk/document_validation_test.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "apth-cli/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "platform-api/internal/handler/access_user_token.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
---

# Authorize app users with roles and permissions

Use this when different users of one app must be allowed different things: "members of the accounting group may approve, everyone else may read". The app names its permissions, the Project decides who holds them, and the platform signs the answer.

Prerequisites: the app has a [platform connection and an `Authenticated` publish]({{.PublicURL}}/md/build/platform-connection.md).

## Vocabulary

| Term | Meaning | Who owns it |
| --- | --- | --- |
| Permission | An app-defined unit such as `reports:approve`. Case-sensitive, matched exactly, no wildcard | The app |
| Role | A named set of permissions | The app |
| Access model | The app's permissions, roles, and default bindings | The app; written by a `project.write` holder |
| Acceptance | A Project manager's approval of one exact version of the model | A `project.manage` holder |
| Binding | A role granted to subjects. The only grant | A `project.manage` holder |
| Assertion | A platform-signed JWT, valid for 60 seconds, carrying the caller's permissions for this app | The Platform API |

Declaring a permission grants it to nobody. An accepted model plus a binding does.

## 1. Declare the access model

Name permissions `<type>:<action>` in lower case, for example `reports:read`. The Dashboard groups them by type and reads the actions `read`, `write`, and `manage` as increasing levels.

In the Dashboard, open the Application and use its **Access** tab. The same model can be written as a document:

```yaml
kind: ApplicationAccess
id: expense
projectId: {{.ProjectID}}
spec:
  applicationRef: { name: expense }
  model:
    permissions:
      - { name: "reports:read" }
      - { name: "reports:approve" }
    roles:
      - { name: member, permissions: ["reports:read"] }
      - { name: approver, permissions: ["reports:read", "reports:approve"] }
    defaultBindings:
      - { role: member, subject: { kind: Authenticated } }
```

```bash
apth apply -f access.yaml --dry-run --output table
apth apply -f access.yaml
```

`id` and `applicationRef.name` are the Application's resource name. Run the dry run first and read the plan; never add `--prune` for this task. If this `apth` release rejects the kind, use the Dashboard rather than inventing another command.

Limits and rules:

- 1 to 64 permissions and 1 to 16 roles; a role lists 1 to 64 declared permissions; at most 8 default bindings.
- A default binding's subject is `Authenticated` or `ProjectAccess` with one of `project.read`, `project.write`, `project.manage`. Default bindings are created once when the model is accepted; a deleted one is not recreated.
- Permission and role names are append-only. To remove the vocabulary, delete the whole model, which also deletes its bindings.
- An Application installed from the marketplace is governed by its installation's model. Declaring one here is refused.

## 2. Acceptance

The model has no effect until a `project.manage` holder accepts it.

- A manager who saves the model in the Access tab accepts it in the same step.
- A model written by anyone else, or as a document, is pending and grants nothing until a manager accepts it.
- A changed model keeps the previously accepted version in force until the new one is accepted.

A document cannot carry the acceptance; `apth apply` rejects one that tries. Acceptance and bindings are done by a manager in the Access tab. The underlying routes are `PUT /api/v1/projects/{projectId}/applications/{app}/access/acceptance` and `POST` or `DELETE .../applications/{app}/role-bindings`, both requiring `project.manage`. At the cited revision `apth` has no dedicated command for them; do not invent one.

## 3. Bind roles to people

A binding grants one role to subjects:

| Subject kind | Matches |
| --- | --- |
| `User` | One person, by exact issuer and subject |
| `Group` | Members of an existing platform Group |
| `ProjectAccess` | Holders of one Project action: `project.read`, `project.write`, or `project.manage` |
| `Authenticated` | Every identity the installation's issuer verified |

A binding to a role that is not in the accepted model grants nothing.

## 4. Check permissions on the server

The contract is the same in every language:

1. Take the `Authorization` header the edge forwarded.
2. `POST {PLATFORM_API_URL}/api/v1/access/user-token` with that same header and no body.
3. Verify the returned `token`: an ES256 JWT of type `appthrust-access+jwt`, signed by `PLATFORM_ACCESS_ISSUER` (keys at `<issuer>/jwks.json`). Check the issuer, expiry, that `aud` is the forwarded token's `azp`, that `appthrust.io/project` is `PLATFORM_PROJECT_ID`, and that `appthrust.io/application` is `PLATFORM_APPLICATION`.
4. Authorize on the Assertion's signed `scope` claim, a space-delimited list of permission names.

Only the signed `scope` grants access. The response also returns `roles` and `scopes` as plain JSON; they are informational and must not be used for decisions. The Assertion is internal to your server: never accept one as a network bearer and never forward it.

| Exchange result | Answer to your caller |
| --- | --- |
| `200` and the Assertion verifies | Proceed with the permission check |
| `401` | `401`. The token is invalid or expired, or the Application has no access model |
| `429` | `503` with the `Retry-After` you received |
| Any other status, a timeout, or a failed verification | `503` |

Cache one result per issuer, subject, and `azp` until a few seconds before the Assertion expires. Never serve an expired entry, never cache a failure, and bound the cache. Each replica exchanges about once a minute per active user; a tighter loop is rate limited.

### TypeScript

`@appthrust/app-access` implements steps 2 to 4 for Node.js 20+, Bun, and edge runtimes. It is published to GitHub Packages, which needs a token with `read:packages` at install time even for a public package. Supply it as a build secret; never commit it or leave it in an image layer.

```ini
@appthrust:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```ts
// lib/app-access.ts (server code only)
import { fromEnv } from '@appthrust/app-access'

export const appAccess = fromEnv('PLATFORM')
```

```ts
// app/api/reports/[id]/approve/route.ts
import { toResponse } from '@appthrust/app-access'
import { appAccess } from '@/lib/app-access'

export async function POST(request: Request) {
  try {
    const access = await appAccess.getAppAccess(request)
    access.require('reports:approve')
    // Perform the operation; record access.principal as the actor.
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return toResponse(error)
  }
}
```

Create one helper per server process so requests share its cache. `getAppAccess` accepts a `Request` or a headers object such as the result of Next.js `await headers()`, so the same check works in a Server Action. `require` throws `Forbidden` (403), a missing or refused bearer is `Unauthenticated` (401), and every platform or verification failure is `Unavailable` (503). `toResponse` maps them.

### Go and other languages

`github.com/appthrust/appserver-go` implements the exchange for marketplace installations: its configuration names an installation, not an Application. For your own Application in Go, or in any other language, implement the four steps above with a JOSE library.

## 5. Use the signed identity

- `principal` (`u_...`) is a durable key for the person, derived by the platform from the verified issuer and subject. Store this one string as the author or owner key. Do not derive a key from the token's claims.
- `groupGrants` lists opaque per-app group keys (`g_...`) with the permissions each group contributes. They are not group names and not all of the user's IdP groups.
- To show group names, mark a permission with `platformCapabilities: [GroupDirectory]` in the model. After a manager accepts that, a caller holding the permission may `POST {PLATFORM_API_URL}/api/v1/access/groups` with the same bearer and receive key and display name pairs. Without the marking the route answers 403.

Permissions are per item type, not per item. "May edit invoices" belongs in the model; "may edit invoice 42" stays in your app's own data rules, checked after the permission.

## How changes take effect

- A binding or acceptance reaches running requests within about one minute, the lifetime of an Assertion.
- Declaring a model on an app that is already running keeps sessions alive. A user signed in before the change gets grants that come through claim-backed Groups only after the edge refreshes their token, within about five minutes by default.
- Deleting the model makes the exchange answer 401 for everyone. An app that enabled this check becomes unavailable; it never becomes unrestricted.

## Prove it

Sign in as a user who holds the role and as one who does not, on the published URL, each in a fresh session. The first must complete the protected action and the second must receive 403 from the server, not merely a hidden button. Then remove the binding and confirm the first user is refused within about a minute.
