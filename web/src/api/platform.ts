// The Agent setup panel's one Platform API operation: creating an Access Key
// in this app's `agent-guide` space for a coding agent.
//
// The Platform API route is `POST /api/v1/projects/{project}/access-keys` with
// an `AccessKeyCreateRequest` body `{space, scopes, ttl?, expiresAt?, label?,
// meta?, subject?}` and the caller's bearer (platform `sdk/access.go`:
// `AccessKeyCreateRequest` and `accessRequest`). The SPA cannot send it: like
// every marketplace SPA it never holds the caller's token — the OIDC edge
// attaches the bearer only to requests for this app's own origin, and the app
// API is called `credentials: 'same-origin'` without an Authorization header.
// A cross-origin call to the Platform API would carry no bearer. So the panel
// renders the equivalent `apth access-keys create … --env` (apth-cli
// `access-keys create`), which the person runs with their own `apth login`.
// The secret is then printed by apth exactly once, in their terminal; this app
// never sees, stores or logs it.
import type { GuideConfig, Lang } from './guide'
import { ASSERTION_ENV, llmsTxtCommand, shellQuote } from '../model/commands'

/** The fields of the Platform API `AccessKeyCreateRequest` the panel sets. */
export type AgentKeyRequest = { space: string; scopes: string[]; label: string }

/** The key every agent gets: this app's space, read-only (catalog/entry.yaml `access.accessKeys`). */
export function agentKeyRequest(label: string): AgentKeyRequest {
  return { space: 'agent-guide', scopes: ['read'], label: label.trim() }
}

/**
 * `apth access-keys create` for `request`. `--env` prints
 * `AGENT_GUIDE_API_KEY=<secret>` and `AGENT_GUIDE_ACCESS_URL=<Platform API>`
 * (the space audience upper-cased), the latter being where the key is exchanged.
 */
export function accessKeyCreateCommand(projectId: string, request: AgentKeyRequest): string {
  return [
    'apth access-keys create',
    `--project ${shellQuote(projectId)}`,
    `--space ${shellQuote(request.space)}`,
    ...request.scopes.map((scope) => `--scope ${shellQuote(scope)}`),
    ...(request.label ? [`--label ${shellQuote(request.label)}`] : []),
    '--env',
  ].join(' ')
}

/** The bootstrap's step comments, in the display language. */
export type BootstrapComments = { create: string; exchange: string; read: string }

/**
 * The paste-once bootstrap: create the key without echoing it, exchange it for
 * a short-lived assertion at the Platform API (`AGENT_GUIDE_ACCESS_URL`, which
 * apth sets to the same value as config `accessUrl`), and read this guide's
 * `llms.txt` in `lang` from the app's public URL with that assertion.
 */
export function agentBootstrapScript(
  config: Pick<GuideConfig, 'projectId' | 'publicUrl'>,
  request: AgentKeyRequest,
  { comments, lang }: { comments: BootstrapComments; lang: Lang }
): string {
  return [
    `# 1. ${comments.create}`,
    `eval "$(${accessKeyCreateCommand(config.projectId, request)})"`,
    'export AGENT_GUIDE_API_KEY AGENT_GUIDE_ACCESS_URL',
    `# 2. ${comments.exchange}`,
    `export ${ASSERTION_ENV}="$(apth access-keys exchange --access-url "$AGENT_GUIDE_ACCESS_URL" <<<"$AGENT_GUIDE_API_KEY")"`,
    `# 3. ${comments.read}`,
    llmsTxtCommand(config.publicUrl, lang),
  ].join('\n')
}
