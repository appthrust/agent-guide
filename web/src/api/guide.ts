// Agent Guide API (`/api/agent-guide/v1/*` and the plain-text `/llms.txt`,
// served by cmd/server from the SPA's own origin). The OIDC edge (Envoy) in
// front of the server attaches the caller's bearer token; the SPA never sees or
// requests one. Shapes are the design.md "HTTP surface" contract; errors are
// the appserver/httpx envelope `{error, message}`.

export type Audience = 'developer' | 'operator' | 'both'

/** `GET /api/agent-guide/v1/config`: the installation's environment, rendered into every command the SPA shows. */
export type GuideConfig = {
  projectId: string
  publicUrl: string
  platformApiUrl: string
  baseDomain: string
  /** Where Access Keys are exchanged for assertions: the Platform API base, not this app. */
  accessUrl: string
  releaseVersion: string
}

/** One entry of `GET /api/agent-guide/v1/docs`, already sorted by (section order, order, title). */
export type DocSummary = {
  slug: string
  title: string
  summary: string
  audience: Audience
  section: string
  order: number
  tags: string[]
}

/** A platform-repository file the document was distilled from, pinned to the commit it was read at. */
export type DocSource = { path: string; revision: string }

/** `GET /api/agent-guide/v1/docs/{slug}`: `markdown` is already rendered with the installation's values. */
export type Doc = {
  slug: string
  title: string
  summary: string
  audience: Audience
  section: string
  tags: string[]
  sources: DocSource[]
  markdown: string
}

/** `GET /api/agent-guide/v1/skills` (= `/skills/index.json`); `files` are relative to `/skills/<name>/`. */
export type Skill = { name: string; description: string; files: string[] }

export type ContextInstallation = { name: string; version: string; url: string; phase: string }

/** `GET /api/agent-guide/v1/context`: user bearers only (403 `key_subject` for Access Keys, 503 `platform_unavailable`). */
export type GuideContext = { me: { login: string; role: string }; installations: ContextInstallation[] }

export type ApiError = { error: string; message: string }

/**
 * Non-2xx guide response. `code` is the server's stable snake_case error.
 * `transient` = no error envelope came back: a 5xx from a proxy in front of the
 * server (e.g. during a rollout), or no response at all (status 0).
 */
export class GuideApiError extends Error {
  readonly status: number
  readonly code: string
  readonly transient: boolean

  constructor(status: number, body: Partial<ApiError> | undefined) {
    const code = typeof body?.error === 'string' ? body.error : undefined
    super(body?.message || `agent-guide api ${status}`)
    this.name = 'GuideApiError'
    this.status = status
    this.code = code ?? (status === 404 ? 'not_found' : 'unknown')
    this.transient = code === undefined && (status === 0 || status >= 500)
  }
}

export function isGuideError(error: unknown, code?: string): error is GuideApiError {
  return error instanceof GuideApiError && (code === undefined || error.code === code)
}

export const BASE = '/api/agent-guide/v1'
const READ_TIMEOUT_MS = 8_000
// A 401 first sends the browser to `/` so the edge re-runs sign-in. Another 401
// within this window means the edge forwards a token the server rejects;
// redirecting again would loop, so that 401 reaches the screens instead.
const REAUTH_WINDOW_MS = 60_000
const REAUTH_AT_KEY = 'agent-guide:reauth-at'

type Fetcher = (input: string, init: RequestInit) => Promise<Response>

export interface GuideApi {
  config(): Promise<GuideConfig>
  docs(): Promise<DocSummary[]>
  /** 404 `not_found` for an unknown slug. */
  doc(slug: string): Promise<Doc>
  skills(): Promise<Skill[]>
  context(): Promise<GuideContext>
  /** The agent index exactly as an agent receives it. */
  llmsTxt(): Promise<string>
}

/** Each segment escaped, the slashes kept: the server route is `{slug...}` (`apth/cookbook/apps`). */
export function slugPath(slug: string): string {
  return slug.split('/').map(encodeURIComponent).join('/')
}

export function createGuideApi(fetcher: Fetcher = (input, init) => fetch(input, init), reauth = browserReauth): GuideApi {
  async function send(path: string, accept: string): Promise<Response> {
    let response: Response
    try {
      response = await fetcher(path, {
        method: 'GET',
        headers: { Accept: accept },
        credentials: 'same-origin',
        signal: AbortSignal.timeout(READ_TIMEOUT_MS),
      })
    } catch {
      // Network failure or read timeout: nothing answered.
      throw new GuideApiError(0, undefined)
    }
    if (response.status === 401 && reauth()) return new Promise<Response>(() => {})
    if (!response.ok) {
      let parsed: Partial<ApiError> | undefined
      try {
        parsed = (await response.json()) as Partial<ApiError>
      } catch {
        parsed = undefined
      }
      throw new GuideApiError(response.status, parsed)
    }
    return response
  }
  const json = async <T>(path: string) => (await (await send(`${BASE}${path}`, 'application/json')).json()) as T

  return {
    config: () => json<GuideConfig>('/config'),
    docs: async () => (await json<{ docs: DocSummary[] }>('/docs')).docs,
    doc: (slug) => json<Doc>(`/docs/${slugPath(slug)}`),
    skills: async () => (await json<{ skills: Skill[] }>('/skills')).skills,
    context: () => json<GuideContext>('/context'),
    llmsTxt: async () => (await send('/llms.txt', 'text/markdown, text/plain')).text(),
  }
}

function browserReauth(): boolean {
  const lastReauthAt = Number(sessionStorage.getItem(REAUTH_AT_KEY))
  if (Date.now() - lastReauthAt < REAUTH_WINDOW_MS) return false
  sessionStorage.setItem(REAUTH_AT_KEY, String(Date.now()))
  window.location.assign('/')
  return true
}

export const guideApi = createGuideApi()

/** Server routes the SPA links to (opened as plain documents, not SPA pages). */
export const rawPaths = {
  markdown: (slug: string) => `/md/${slugPath(slug)}.md`,
  llmsTxt: '/llms.txt',
  llmsFullTxt: '/llms-full.txt',
  skillsIndex: '/skills/index.json',
}
