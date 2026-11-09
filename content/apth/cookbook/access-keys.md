---
title: "Read the guide with an Access Key"
summary: "Create a least-privilege guide key, capture its assertion privately, and revoke it when no longer needed."
audience: "developer"
section: "apth"
order: 70
tags: ["auth", "access-keys", "agents"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/accesskeys.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "sdk/access.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# Read the guide with an Access Key

An Agent Guide key authorizes reading this guide, not managing a Project or operating a cluster. The `agent-guide` space grants only scope `read`. A user's Platform CLI login and an app Access Key are different credentials; never substitute one for the other.

## Discover and create

```bash
apth access-keys spaces list --project {{.ProjectID}}
apth access-keys list --project {{.ProjectID}} --space agent-guide
```

The **Agent setup** panel creates a key using the signed-in user's authority and shows its secret once. Keep it in a secret manager; the app does not store it for later retrieval.

For CLI creation, the supported command uses `--space agent-guide --scope read --env`. Its stdout contains the secret, so route it directly to a private file, never the terminal, transcript, or a CI log:

```bash
set +x
umask 077
key_file="$(mktemp)" || exit
apth access-keys create --project {{.ProjectID}} --space agent-guide --scope read --label agent-session --env > "$key_file"
```

The file contains `AGENT_GUIDE_API_KEY` and `AGENT_GUIDE_ACCESS_URL` assignments. Transfer these through your approved private secret-loading mechanism, then remove the file. Do not `cat` it, attach it, or source unreviewed shell text. If creation fails, remove the file before retrying; do not assume a missing CLI response proves no key was created. `--external` requires Project-admin authority and is unnecessary for this flow.

## Exchange and fetch without printing tokens

`AGENT_GUIDE_ACCESS_URL` is the Platform API origin (`{{.AccessURL}}`). The exchange posts to that origin's `/api/v1/access/token`. It is **not** the guide's public origin.

With the key privately loaded:

```bash
set +x
assertion="$(apth access-keys exchange --access-url '{{.AccessURL}}' <<<"${AGENT_GUIDE_API_KEY:?Supply the key privately}")" || exit
printf 'Authorization: Bearer %s\n' "$assertion" |
  curl --fail --silent --show-error --header @- '{{.PublicURL}}/llms.txt'
unset assertion
```

This captures the short-lived assertion in memory and passes the header through stdin rather than an HTTP command-line argument. Do not enable shell tracing, HTTP verbose mode, or header logging. Do not send the long-lived key directly to a document endpoint.

The assertion can read `/md/<slug>.md`, `/llms-full.txt`, and `/skills/<name>/SKILL.md`. It cannot use this app's user-only context endpoint: `403 key_subject` is expected there, not a reason to widen the key's scope.

## Inspect and retire

`get` returns key metadata, not the secret. Choose `$KEY_NAME` from the scoped list:

```bash
apth access-keys get "$KEY_NAME" --project {{.ProjectID}}
apth access-keys disable "$KEY_NAME" --project {{.ProjectID}} --yes
apth access-keys enable "$KEY_NAME" --project {{.ProjectID}}
apth access-keys revoke "$KEY_NAME" --project {{.ProjectID}} --reason completed --yes
```

These are alternatives, not a sequence to run blindly. Disable is reversible; revoke is permanent. Remove local key material when finished. On `access_key_expired`, `access_key_revoked`, or `access_key_disabled`, stop and have the owner repair the key's lifecycle; do not scrape browser cookies.
