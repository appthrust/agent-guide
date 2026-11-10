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
    const docs = await api.docs('en')
    expect(docs.length).toBeGreaterThanOrEqual(6)
    const doc = await api.doc('apth/cookbook/apps', 'en')
    expect(doc.title).toBe('Apps cookbook')
    expect(doc.sources[0].path).toBe('apth-cli/README.md')
    expect((await api.skills('en')).map((skill) => skill.name)).toEqual(['appthrust-app-dev', 'appthrust-marketplace-apps'])
    expect((await api.context()).me.login).toBe('hana.sato@acme.example')
    expect(await api.llmsTxt('en')).toStartWith('# Agent Guide')

    expect(calls.map((call) => call.input)).toEqual([
      '/api/agent-guide/v1/config',
      '/api/agent-guide/v1/docs?lang=en',
      '/api/agent-guide/v1/docs/apth/cookbook/apps?lang=en',
      '/api/agent-guide/v1/skills?lang=en',
      '/api/agent-guide/v1/context',
      '/llms.txt?lang=en',
    ])
    for (const call of calls) {
      expect(call.init.credentials).toBe('same-origin')
      expect(new Headers(call.init.headers).has('Authorization')).toBe(false)
    }
  })

  test('reads Japanese variants with ?lang=ja and gets English where a document has none', async () => {
    const { api, calls } = recordingApi(mockFetch())
    const translated = await api.doc('apth/cookbook/apps', 'ja')
    expect([translated.title, translated.lang, translated.availableLangs]).toEqual(['アプリのクックブック', 'ja', ['en', 'ja']])
    const fallback = await api.doc('apthctl/debug', 'ja')
    expect([fallback.title, fallback.lang, fallback.availableLangs]).toEqual(['Debug with apthctl', 'en', ['en']])
    expect((await api.docs('ja'))[0].title).toBe('はじめに')
    expect((await api.skills('ja'))[0].lang).toBe('ja')
    expect(await api.llmsTxt('ja')).toContain('/md/start-here.md?lang=ja')
    expect(calls.map((call) => new URL(call.input, 'http://guide.test').searchParams.get('lang'))).toEqual(['ja', 'ja', 'ja', 'ja', 'ja'])
  })

  test('maps the error envelope: a 404 slug, a key subject on /context, and an unanswered call', async () => {
    const { api } = recordingApi(mockFetch('403'))
    const missing = await api.doc('nope', 'en').catch((error: unknown) => error)
    expect(missing).toBeInstanceOf(GuideApiError)
    expect((missing as GuideApiError).code).toBe('not_found')
    const keySubject = (await api.context().catch((error: unknown) => error)) as GuideApiError
    expect([keySubject.status, keySubject.code, keySubject.transient]).toEqual([403, 'key_subject', false])

    const unavailable = (await recordingApi(mockFetch('503')).api.context().catch((error: unknown) => error)) as GuideApiError
    expect([unavailable.status, unavailable.code, unavailable.transient]).toEqual([503, 'platform_unavailable', false])

    const proxy = (await recordingApi(() => new Response('<html>bad gateway</html>', { status: 502 })).api.docs('en').catch((error: unknown) => error)) as GuideApiError
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
    void api.docs('en').then(
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
    expect(rawPaths.markdown('apth/install', 'en')).toBe('/md/apth/install.md')
    expect(rawPaths.markdown('apth/install', 'ja')).toBe('/md/apth/install.md?lang=ja')
    expect(rawPaths.llmsTxt('en')).toBe('/llms.txt')
    expect(rawPaths.llmsFullTxt('ja')).toBe('/llms-full.txt?lang=ja')
    expect(rawPaths.skillFile('appthrust-app-dev', 'references/a b.md', 'ja')).toBe('/skills/appthrust-app-dev/references/a%20b.md?lang=ja')
  })
})
