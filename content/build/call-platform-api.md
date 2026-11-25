---
title: "Call the Platform API from an app"
summary: "An app calls the Platform API as the signed-in user: request the audience, forward the bearer from the server, and handle errors and mutations correctly."
audience: "developer"
section: "build"
order: 40
tags: ["platform-api", "bearer", "audience", "idempotency"]
sources:
  - { path: "design/platform/marketplace-apps/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "design/platform/application-access/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "apth-cli/internal/cmd/apth/publish.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "platform-api/internal/handler/publish_access.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "platform-api/internal/auth/oidc_keycloak.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "platform-api/internal/apierror/apierror.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "appthrust-operator/pkg/controllers/platformservice/oidcclient_controller.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "pkg/installation/render/surface.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "dashboard/packages/api-schema/openapi.platform-api.json", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
---

# Call the Platform API from an app

Use this when a feature must read or change resources of Project `{{.ProjectID}}`: list the installed apps, show the caller's Project role, look up people, or start a Project operation on the user's behalf.

If the feature only needs to decide what a user may do **inside the app**, use [app permissions]({{.PublicURL}}/md/build/app-permissions.md) instead. That path needs no Platform API audience.

## Whose authority

There is no app identity. The app forwards the signed-in user's bearer, and the Platform API authorizes the request by that user's Project role. So:

- The app can do exactly what that user could do with `apth`, including destructive operations. It gains nothing the user lacks.
- A user without a role in this Project gets `403` for Project routes. Handle that as a normal answer, not an outage.
- No background job can call the Platform API, because no user is present. Do not store a bearer to use later, and do not create a client or a key to get around this.

## 1. Request the Platform API audience

The Platform API accepts a user token only when it carries the audience `appthrust-platform-api`. The token the edge forwards does not have it by default.

| App kind | How the audience is requested |
| --- | --- |
| Marketplace app | `spec.access.audiences: [appthrust-platform-api]` in the definition |
| Your own Application | The publish access settings, as below |

```bash
apth publishes access get {{.ProjectID}} "$PUBLISH"
apth publishes access set {{.ProjectID}} "$PUBLISH" --mode Authenticated --audience appthrust-platform-api
apth publishes access get {{.ProjectID}} "$PUBLISH"
```

`set` replaces the authentication settings, so repeat every flag you intend to keep. The issuer allows only the audiences it lists. When it refuses one (`AudienceNotAllowed`), the access settings stay `pending` with a typed reason; read them back instead of assuming the change took effect.

**This is a real grant of trust.** From then on, every signed-in user hands your server a token that the Platform API accepts with that user's full authority. Request the audience only when the feature needs it, and review every place the bearer can travel.

## 2. Make the call from the server

Use the `Authorization` header of the request being served, unchanged, against `PLATFORM_API_URL`:

```ts
// Server code only. Never run this in the browser.
const base = process.env.PLATFORM_API_URL
const project = process.env.PLATFORM_PROJECT_ID

export async function projectAccess(request: Request) {
  const authorization = request.headers.get('authorization')
  if (!authorization) return new Response(null, { status: 401 })
  const response = await fetch(`${base}/api/v1/projects/${project}/access`, {
    headers: { authorization },
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
  })
  if (response.status === 401 || response.status === 403) return new Response(null, { status: response.status })
  if (!response.ok) return new Response(null, { status: 503 })
  return Response.json(await response.json(), { headers: { 'Cache-Control': 'no-store' } })
}
```

- Send the bearer only to `PLATFORM_API_URL`. Refuse redirects, so a redirect can never carry it elsewhere.
- Set a timeout. A slow platform must not hang your request handler.
- Do not expose a generic pass-through from the browser to the Platform API. Offer the specific operations the feature needs and validate their input.
- Never share a response across users. If you cache, key by issuer and subject and keep it short.
- Use the header from the current request each time. The token is short-lived and the edge refreshes it; a copy you kept will expire.

In Go, `github.com/appthrust/appserver-go/appserver/platformclient` wraps the read models below with the same rules.

## Routes apps commonly use

| Route | Returns |
| --- | --- |
| `GET /api/v1/auth/whoami` | The caller as the Platform API sees them |
| `GET /api/v1/projects/{id}/access` | The caller's standing in the Project: `member`, `roles`, `actions`, `platformRoles` |
| `GET /api/v1/projects/{id}` | The Project's display identity |
| `GET /api/v1/projects/{projectId}/app-installations` | Installed marketplace apps, their URLs, and links |
| `GET /api/v1/application-stack-definitions` | The catalog, for a launcher |
| `GET /api/v1/identity/search?q=...` | People the caller is permitted to discover |

Every Project resource that `apth` manages has a route under `/api/v1/projects/{projectId}/...`; the [apth scope page]({{.PublicURL}}/md/apth/scope.md) lists the groups. The Platform API does not serve an OpenAPI document. When you need a request or response shape, run the matching `apth` command with `--json` and read `apth <group> --help` for its inputs. Do not guess a route or a field.

`roles` from the access route are Project roles. They answer "may this user operate the Project", not "what may this user do in my app". Do not use them as app permissions.

## Errors

Every non-2xx response has one envelope:

```json
{ "error": { "code": "forbidden", "message": "...", "details": {} } }
```

| Status | `code` | What the app should do |
| --- | --- | --- |
| 400 | `invalid_argument` | Fix the request; do not retry it unchanged |
| 401 | `unauthenticated` | Answer 401; the user must sign in again |
| 403 | `forbidden` | Answer 403; the user's Project role does not allow it |
| 404 | `not_found` | Treat as absent; it can also mean the caller may not see the resource |
| 409 | `conflict`, `failed_precondition`, `idempotency_conflict` | Read the reason. `delivery_pending` is transient; `delivery_blocked` needs an operator |
| 429 | `resource_exhausted` | Back off for `Retry-After` |
| 5xx | `internal`, `service_unavailable` | Answer 503; never substitute a default |

Branch on `code` and typed `details`, never on the human `message`. See [troubleshooting]({{.PublicURL}}/md/apth/troubleshooting.md) for the delivery reasons.

## Mutations

- Send an `Idempotency-Key` header: one non-secret key per logical user action, reused when you retry that same action. Some routes reject a mutation without it.
- An accepted mutation is not a finished one. The response describes the resource and an operation; fields such as `pendingSync` say that convergence is still in progress. Read the resource back before telling the user it is done.
- Retry only what is typed as transient, a bounded number of times. A different 409 can be a final refusal.
- Destructive operations need the user's explicit action in your UI. An app must not delete Project resources as a side effect.

## Prove it

Sign in on the published URL as a Project member and as a user with no role in the Project, each in a fresh session. The feature must work for the first and show a clear "no access" state for the second. Then confirm in your server logs that no bearer, key, or database URL was written.
