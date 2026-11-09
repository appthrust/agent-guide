import { describe, expect, test } from 'bun:test'
import { guideRoutes } from '../dev/mock-guide'
import { createGuideApi, GuideApiError, rawPaths, slugPath } from './guide'

type Call = { input: string; init: RequestInit }

function recordingApi(respond: (input: string) => Response, reauth = () => false) {
  const calls: Call[] = []
  const api = createGuideApi(async (input, init) => {
    calls.push({ input, init })
    return respond(input)
  }, reauth)
  return { api, calls }
}

const mockFetch = (contextMode?: string) => (input: string) => guideRoutes(new Request(new URL(input, 'http://guide.test')), new URL(input, 'http://guide.test'), contextMode) ?? new Response('', { status: 404 })

describe('guide API client', () => {
  test('reads the design.md shapes from the app origin without ever sending a token', async () => {
    const { api, calls } = recordingApi(mockFetch())
    const config = await api.config()
    expect(Object.keys(config).sort()).toEqual(['accessUrl', 'baseDomain', 'platformApiUrl', 'projectId', 'publicUrl', 'releaseVersion'])
    const docs = await api.docs()
    expect(docs.length).toBeGreaterThanOrEqual(6)
    const doc = await api.doc('apth/cookbook/apps')
    expect(doc.title).toBe('Apps cookbook')
    expect(doc.sources[0].path).toBe('apth-cli/README.md')
    expect((await api.skills()).map((skill) => skill.name)).toEqual(['appthrust-app-dev', 'appthrust-marketplace-apps'])
    expect((await api.context()).me.login).toBe('hana.sato@acme.example')
    expect(await api.llmsTxt()).toStartWith('# Agent Guide')

    expect(calls.map((call) => call.input)).toEqual([
      '/api/agent-guide/v1/config',
      '/api/agent-guide/v1/docs',
      '/api/agent-guide/v1/docs/apth/cookbook/apps',
      '/api/agent-guide/v1/skills',
      '/api/agent-guide/v1/context',
      '/llms.txt',
    ])
    for (const call of calls) {
      expect(call.init.credentials).toBe('same-origin')
      expect(new Headers(call.init.headers).has('Authorization')).toBe(false)
    }
  })

  test('maps the error envelope: a 404 slug, a key subject on /context, and an unanswered call', async () => {
    const { api } = recordingApi(mockFetch('403'))
    const missing = await api.doc('nope').catch((error: unknown) => error)
    expect(missing).toBeInstanceOf(GuideApiError)
    expect((missing as GuideApiError).code).toBe('not_found')
    const keySubject = (await api.context().catch((error: unknown) => error)) as GuideApiError
    expect([keySubject.status, keySubject.code, keySubject.transient]).toEqual([403, 'key_subject', false])

    const unavailable = (await recordingApi(mockFetch('503')).api.context().catch((error: unknown) => error)) as GuideApiError
    expect([unavailable.status, unavailable.code, unavailable.transient]).toEqual([503, 'platform_unavailable', false])

    const proxy = (await recordingApi(() => new Response('<html>bad gateway</html>', { status: 502 })).api.docs().catch((error: unknown) => error)) as GuideApiError
    expect(proxy.transient).toBe(true)
  })

  test('a 401 hands over to the re-auth redirect instead of failing', async () => {
    const redirected = Promise.withResolvers<void>()
    const { api } = recordingApi(
      () => Response.json({ error: 'unauthenticated', message: '' }, { status: 401 }),
      () => {
        redirected.resolve()
        return true
      }
    )
    let settled = false
    void api.docs().then(
      () => (settled = true),
      () => (settled = true)
    )
    await redirected.promise
    for (let tick = 0; tick < 5; tick++) await Promise.resolve()
    expect(settled).toBe(false)
  })

  test('slugs keep their slashes but escape each segment', () => {
    expect(slugPath('apth/cookbook/apps')).toBe('apth/cookbook/apps')
    expect(slugPath('lessons/a b?')).toBe('lessons/a%20b%3F')
    expect(rawPaths.markdown('apth/install')).toBe('/md/apth/install.md')
  })
})
