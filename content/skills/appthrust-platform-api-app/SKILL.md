---
name: "appthrust-platform-api-app"
description: "Build an app feature that uses the AppThrust platform from inside the app in this Project: require sign-in, identify the user, authorize with app roles and permissions, or call the Platform API as the signed-in user. Use for your own Application or a marketplace app; not for operating the Project with apth."
title: "AppThrust Platform API app development"
summary: "Build an app feature that uses the AppThrust platform from inside the app in this Project: require sign-in, identify the user, authorize with app roles and permissions, or call the Platform API as the signed-in user. Use for your own Application or a marketplace app; not for operating the Project with apth."
audience: "developer"
section: "build"
order: 100
tags: ["skill", "platform-api", "authorization", "apps"]
sources:
  - { path: "design/platform/application-access/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "design/platform/marketplace-apps/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "design/platform/marketplace-apps/app-authorization.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "dashboard/packages/app-access/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "apth-cli/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "apth-cli/internal/cmd/apth/component_connections.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "apth-cli/internal/cmd/apth/publish.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "sdk/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
---

# AppThrust Platform API app development

Use this skill when the task is code **inside an app** that depends on the platform: who is calling, what they may do, or Project data the app shows or changes. To create, deploy, or debug the app itself, use the [app development skill]({{.PublicURL}}/skills/appthrust-app-dev/SKILL.md) first.

## Environment and safety

- Platform API: `{{.PlatformAPIURL}}`
- Project: `{{.ProjectID}}`
- Guide: `{{.PublicURL}}`

An app has no identity toward the Platform API. Every call carries the signed-in user's bearer and runs with that user's authority. Do not create a client, a key, or a stored token to give the app its own access.

Keep bearers, keys, and database URLs out of the browser, source, logs, and chat. Resolve `$APP`, `$COMPONENT`, and `$PUBLISH` from the task and from returned inventory. Changing who can reach a live app, requesting the Platform API audience, and changing an access model all need task authority. This guide's Access Key grants none of it.

## 0. Classify the feature

| The feature needs | Do | Detail |
| --- | --- | --- |
| Only signed-in users | Steps 1 and 2 | [platform connection]({{.PublicURL}}/md/build/platform-connection.md) |
| Different users allowed different things | Steps 1 to 4 | [app permissions]({{.PublicURL}}/md/build/app-permissions.md) |
| Project data or Project operations as the user | Steps 1, 2 and 5 | [call the Platform API]({{.PublicURL}}/md/build/call-platform-api.md) |
| The same app installable in any Project | Stop and read | [marketplace app]({{.PublicURL}}/md/build/marketplace-app.md); publishing needs catalog authority |

Pick the smallest row that satisfies the task. App permissions need no Platform API audience; do not request one for them.

## 1. Confirm the installation supports it

```bash
apth whoami
apth component-connections create --help
curl -sS -o /dev/null -w '%{http_code}\n' -X POST '{{.PlatformAPIURL}}/api/v1/access/user-token'
```

The help must list `--destination-platform`. The unauthenticated probe must answer `401`; `404` means this platform release has no user-token exchange. Report a missing contract to the operator instead of substituting another mechanism.

## 2. Wire the app to the platform

```bash
apth apps get "$APP"
apth components list {{.ProjectID}}
apth component-connections create {{.ProjectID}} "$COMPONENT" --destination-platform --name platform
apth publishes list {{.ProjectID}}
apth publishes access get {{.ProjectID}} "$PUBLISH"
apth publishes access set {{.ProjectID}} "$PUBLISH" --mode Authenticated
apth apps env get "$APP"
```

- `publishes access set` replaces the authentication settings. Read first and pass every flag that must stay.
- The connection injects `PLATFORM_API_URL`, `PLATFORM_PROJECT_ID`, `PLATFORM_OIDC_ISSUER`, `PLATFORM_OIDC_ISSUER_CA_PEM`, `PLATFORM_ACCESS_ISSUER`, and `PLATFORM_APPLICATION`. Read them from the environment; hardcode none of them.
- After this, each request reaches the server with `Authorization: Bearer <user access token>`. The edge owns sign-in, the callback, and `/logout`.
- `Authenticated` admits every user who can sign in to this installation, not only Project members.

## 3. Declare the access model

Write permissions as `<type>:<action>` and group them into roles. Use the Application's **Access** tab in the Dashboard, or a document:

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
```

```bash
apth apply -f access.yaml --dry-run --output table
apth apply -f access.yaml
```

Never pass `--prune`. A model grants nothing until a `project.manage` holder accepts it and binds roles to users or Groups in the Access tab. If you cannot accept it, stop and hand the manager the exact model; do not look for another way to grant access. Names are append-only.

## 4. Enforce on the server

In TypeScript, use `@appthrust/app-access` (GitHub Packages; the install needs a `read:packages` token supplied as a build secret):

```ts
import { fromEnv, toResponse } from '@appthrust/app-access'

const appAccess = fromEnv('PLATFORM') // one instance per server process

export async function POST(request: Request) {
  try {
    const access = await appAccess.getAppAccess(request)
    access.require('reports:approve')
    // Perform the operation; store access.principal as the actor.
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return toResponse(error)
  }
}
```

In any other language, implement the contract:

1. `POST {PLATFORM_API_URL}/api/v1/access/user-token` with the forwarded `Authorization` header and no body.
2. Verify the returned ES256 Assertion against `{PLATFORM_ACCESS_ISSUER}/jwks.json`: issuer, expiry, `aud` equal to the bearer's `azp`, `appthrust.io/project`, `appthrust.io/application`.
3. Authorize on the signed `scope` claim only. Ignore the response's plain `roles` and `scopes` for decisions.
4. Map exchange `401` to 401, and `429`, other statuses, timeouts, and verification failures to 503. Cache per issuer, subject, and `azp` until just before expiry; never cache a failure.

Check the permission in every handler that reads or changes protected data. Store the signed `principal` (`u_...`) as the owner key, never a value derived from token claims.

## 5. Call the Platform API as the user

Only when the feature needs Project resources:

```bash
apth publishes access set {{.ProjectID}} "$PUBLISH" --mode Authenticated --audience appthrust-platform-api
apth publishes access get {{.ProjectID}} "$PUBLISH"
```

Then forward the current request's `Authorization` header from the server to `{PLATFORM_API_URL}/api/v1/...`, with a timeout and redirects refused. The user's Project role decides the answer; show `403` as "no access", not as an error page. Send an `Idempotency-Key` on mutations and read the resource back before reporting success. Take request and response shapes from `apth <group> ... --json`; do not guess routes.

This makes every user's token usable against the Platform API from your server. Do not build a generic proxy, a background job that reuses a bearer, or a cache shared between users.

## 6. Prove it as users

```bash
apth apps wait "$APP" --released-after "$(git log -1 --format=%cI)" --timeout 10m
apth apps get "$APP"
```

On the published URL, in fresh sessions:

1. A user holding the role completes the protected action.
2. A user without it receives 403 from the server.
3. After the binding is removed, the first user is refused within about a minute.

A redirect to sign-in, a Ready component, or a passing local run proves none of these.

## Diagnose before retrying

- No `PLATFORM_*` variables: the connection is pending, or its name gives another prefix.
- No `Authorization` header: the publish is `Public`, or the request bypassed the published URL.
- Exchange `401` for everyone: the Application has no access model, or the token is not from this publish's client.
- Exchange `404`: the platform release predates the route; involve the operator.
- Everyone gets 403 from `require`: the model is pending acceptance, or no binding matches.
- Platform API `401` with a valid session: the token lacks the Platform API audience; read the publish access settings.
- `503` from the helper: the platform or its key set was unreachable. Do not add a fallback.

## Report

State which path was implemented, the exact publish access settings and model that were applied, who accepted and bound them, the two-user proof on the published URL, and any boundary you could not observe. Do not describe a pending model or an unverified token path as working authorization.
