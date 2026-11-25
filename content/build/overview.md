---
title: "Build features on the Platform API"
summary: "What an app receives from the platform at runtime, the integration paths that exist, and which of them apply to your own Application versus a marketplace app."
audience: "developer"
section: "build"
order: 10
tags: ["apps", "platform-api", "authorization", "marketplace"]
sources:
  - { path: "design/platform/application-access/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "design/platform/marketplace-apps/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "design/platform/marketplace-apps/app-authorization.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "dashboard/packages/app-access/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "sdk/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
---

# Build features on the Platform API

The `apth` pages operate Project `{{.ProjectID}}` from a terminal. This section covers the other direction: code that runs **inside an app** and uses the platform to know who is calling, decide what they may do, read or change Project resources, or accept machine callers.

## Two kinds of app

| | Your own Application | Marketplace app |
| --- | --- | --- |
| What it is | An Application your team creates in this Project with `apth apps create` or the Dashboard | A catalog definition (`ApplicationStackDefinition`) that a Project installs as an `AppInstallation` |
| Who wires the platform in | You, in this Project: a platform connection and the publish access settings | The definition declares it once; installing renders it |
| Sign-in | Publish access mode `Authenticated` | `spec.access` in the definition |
| App permissions (roles) | An access model on the Application, accepted by a Project manager | `spec.access.permissions`, `roles`, `defaultBindings`, accepted per installation |
| Platform API audience on the user's token | Only when the publish access settings request it | `spec.access.audiences` |
| Access Keys for machine callers | Not covered by this guide | `spec.access.accessKeys` |
| Server helper | `@appthrust/app-access` (TypeScript), or the HTTP contract in any language | `github.com/appthrust/appserver-go` (Go) |
| How it ships | Push to its repository; the release follows | A signed catalog publication, which needs catalog publisher authority |

Start with your own Application unless several Projects must install the same app.

## What the platform gives an app at runtime

- **Sign-in at the edge.** With authenticated access, the gateway in front of the app runs the OIDC sign-in, keeps the session in a cookie on the app's origin, and forwards the user's access token to the backend as `Authorization: Bearer ...`. The browser never holds the token.
- **A platform connection.** It injects where the Platform API is, which Project the component belongs to, and which issuers to trust. It mints no credential.
- **Managed data connections.** A database connection injects `DATABASE_URL` and its parts; see the [databases cookbook]({{.PublicURL}}/md/apth/cookbook/databases.md).
- **Credential slots** for third-party secrets the app needs. A Project admin binds the value; it is never returned by a read.

**An app has no identity of its own toward the Platform API.** Every call it makes carries the signed-in user's bearer and is authorized as that user. Nothing in this section gives an app a service credential, and none should be invented.

## Choose a path

| You want to | Read |
| --- | --- |
| Require sign-in and learn who is calling | [Connect an app to the platform]({{.PublicURL}}/md/build/platform-connection.md) |
| Let Project managers decide who may do what inside the app | [Authorize app users with roles and permissions]({{.PublicURL}}/md/build/app-permissions.md) |
| Read or change Project resources on behalf of the user | [Call the Platform API from an app]({{.PublicURL}}/md/build/call-platform-api.md) |
| Ship an app that any Project can install | [Build a marketplace app]({{.PublicURL}}/md/build/marketplace-app.md) |

An agent doing this work can fetch the condensed procedure as a skill: [Platform API app skill]({{.PublicURL}}/skills/appthrust-platform-api-app/SKILL.md).

## Two authority planes

| Plane | Question | Granted by | Enforced by |
| --- | --- | --- | --- |
| Platform | May this caller operate the Project? | Project role bindings | The Platform API |
| App | What may this caller do inside the app? | App role bindings | The app, from a platform-signed Assertion |

The planes do not leak into each other. An app permission grants no Platform action. A Project role grants no app permission unless a manager binds an app role to holders of a Project action. Do not derive in-app authorization from Project role names or from the raw `groups` claim.

## Rules on every path

- Authorize on the server. Hiding a button is not authorization.
- Fail closed. When the platform cannot be reached or a signed fact does not verify, answer 503. Never fall back to unverified claims or a previous answer.
- Keep the bearer on the server. Do not send it to the browser, log it, store it, or forward it to any origin other than the Platform API.
- Treat names in configuration as configuration. The signed Assertion, not an environment variable, says which Application and Project a grant belongs to.
- Prove the feature as a user on the published URL. A successful build or a Ready component is a different claim; see [readiness]({{.PublicURL}}/md/concepts/readiness.md).

## Check what this installation supports

These pages describe the contracts at the cited platform revision. An installation runs whichever platform release it was given, so confirm a route exists before building on it. These requests carry no credential and change nothing:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' -X POST '{{.PlatformAPIURL}}/api/v1/access/user-token'
curl -sS -o /dev/null -w '%{http_code}\n' '{{.PlatformAPIURL}}/access/jwks.json'
apth component-connections create --help
```

`401` from the first request means the user-token exchange is served and refused the missing bearer; `404` means this platform release predates it. `200` from the second means the Access issuer publishes its keys. The help text must list `--destination-platform`. If a contract is missing, report the exact route to the environment's operator. Do not work around it with a different credential.
