---
title: "Connect an app to the platform"
summary: "Add a platform connection, require sign-in on the publish, and handle the user token the edge forwards to your server."
audience: "developer"
section: "build"
order: 20
tags: ["apps", "platform-connection", "sign-in", "oidc"]
sources:
  - { path: "apth-cli/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "apth-cli/internal/cmd/apth/component_connections.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "apth-cli/internal/cmd/apth/publish.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "sdk/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "appthrust-operator/pkg/controllers/core/componentconnection/platform.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "appthrust-operator/pkg/controllers/core/publish/accesspolicy/render.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "platform-api/internal/handler/publish_access.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "design/platform/application-access/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
---

# Connect an app to the platform

This page is for an Application you own in Project `{{.ProjectID}}`. A marketplace app gets the same wiring from its definition; see [Build a marketplace app]({{.PublicURL}}/md/build/marketplace-app.md).

Resolve `$APP`, `$COMPONENT`, and `$PUBLISH` from the task and from returned inventory. Do not guess them.

```bash
apth apps get "$APP"
apth components list {{.ProjectID}}
apth publishes list {{.ProjectID}}
```

## 1. Add the platform connection

```bash
apth component-connections create {{.ProjectID}} "$COMPONENT" --destination-platform --name platform
apth component-connections list {{.ProjectID}}
apth apps env get "$APP"
```

- The source must be a Container Component of this Project. The call needs the Editor or Admin role.
- A component has at most one platform connection, whatever its name. A second request returns a conflict.
- The response acknowledges the request. Read the connection with `apth component-connections get` and wait until the variables appear in the component's environment before relying on them. A connection waiting with reason `PlatformEndpointUnresolved` means the installation has not published its endpoint or issuer yet; that is an operator matter, not a retry loop.

The variable prefix is the connection name in upper case, with hyphens replaced by underscores. With `--name platform`:

| Variable | Meaning |
| --- | --- |
| `PLATFORM_API_URL` | Platform API origin for server-side calls. In this environment: `{{.PlatformAPIURL}}` |
| `PLATFORM_PROJECT_ID` | The Project the component belongs to. Here: `{{.ProjectID}}` |
| `PLATFORM_OIDC_ISSUER` | Issuer of the user tokens the edge forwards |
| `PLATFORM_OIDC_ISSUER_CA_PEM` | Certificate bundle for that issuer when it uses a private CA; may be empty |
| `PLATFORM_ACCESS_ISSUER` | Issuer of platform-signed Assertions; its keys are at `<issuer>/jwks.json` |
| `PLATFORM_APPLICATION` | Resource name of the Application the component belongs to; absent for a component outside any Application |

The connection carries endpoint metadata, not authority. It grants the app no access to the Platform API, and `PLATFORM_APPLICATION` is configuration: the platform derives the Application from the caller's token, never from this name. Read the values from the environment at start-up; never hardcode an origin or Project ID in source.

## 2. Require sign-in on the publish

```bash
apth publishes access get {{.ProjectID}} "$PUBLISH"
apth publishes access set {{.ProjectID}} "$PUBLISH" --mode Authenticated
```

`set` **replaces** the authentication settings: an omitted `--audience` resets the audiences to empty and an omitted `--bearer-pass-through` resets it to false. Read the current settings first and pass every value you intend to keep. The IP allowlist is the exception: it stays unless `--allow-cidr` or `--clear-allow-cidrs` is given. Changing who can reach a live app needs task authority.

| Mode | What reaches the server |
| --- | --- |
| `Public` | Anonymous requests. No user token, so the app cannot identify the caller |
| `Authenticated` | Only requests from a signed-in user, each with that user's access token |

With `Authenticated`, the platform registers an OIDC client for this publish. The edge redirects a browser without a session to sign in, keeps the session in a cookie on the app's origin, refreshes the token, and serves `/logout` and `/oauth2/callback` on the app's host. Do not implement those paths or a second login in the app.

**Signed in is not authorized.** `Authenticated` with no further rule admits every user who can sign in to this installation's identity provider, not only members of this Project. Decide what each user may do inside the app; see [app permissions]({{.PublicURL}}/md/build/app-permissions.md).

`--bearer-pass-through` additionally accepts a request that presents a verified JWT in `Authorization` without a session cookie. Enable it only for an API that non-browser clients call.

## 3. Handle the forwarded token

Every request that passes the edge carries `Authorization: Bearer <access token>`.

- The token is a JWT signed by `PLATFORM_OIDC_ISSUER`. Its `azp` claim is the OIDC client of this publish.
- It carries no Platform API audience unless the publish access settings request one. See [Call the Platform API from an app]({{.PublicURL}}/md/build/call-platform-api.md) before adding one.
- A person is identified by the pair issuer and subject (`iss`, `sub`). Email and display name are profile data and never grant access.

Do not decode the token and trust its claims. Use one of these:

| Need | Do |
| --- | --- |
| Permissions and a durable person key | Exchange the token with the platform; the platform verifies it and returns a signed Assertion. This is the [app permissions]({{.PublicURL}}/md/build/app-permissions.md) contract |
| Only "is this a signed-in user, and which one" | Verify the JWT against the issuer's published keys (discover them from `<issuer>/.well-known/openid-configuration`), then check issuer and expiry, and use `iss` plus `sub` as the identity |

Keep the token on the server. Never return it to the browser, write it to logs, persist it, or send it to an origin other than `PLATFORM_API_URL`.

## 4. Local development

A local run has no edge in front of it, so no `Authorization` header arrives and no sign-in happens. Prove the non-authenticated logic locally and the authenticated path on the published URL. If the code has a development mode that accepts unverified claims, bind it to a loopback listener only and make it impossible to enable through deployed configuration.

## 5. Prove it

```bash
apth apps wait "$APP" --released-after "$(git log -1 --format=%cI)" --timeout 10m
apth apps get "$APP"
```

Open the returned URL in a fresh browser session, complete the sign-in, and perform one action that depends on the caller's identity. A redirect to the sign-in page proves the edge policy, not that the app received and handled the token.

## When it does not work

| Symptom | Likely cause |
| --- | --- |
| `PLATFORM_*` variables missing | The connection is still pending, or it was created with another `--name` and uses that prefix |
| No `Authorization` header on the server | The publish is `Public`, or the request did not come through the published URL |
| Sign-in loops or ends with an error | Read `apth publishes access get` and `apth publishes readiness {{.ProjectID}}`; report the typed reason instead of reinstalling |
| A user outside the Project can open the app | Expected with `Authenticated` alone; add app permissions |
