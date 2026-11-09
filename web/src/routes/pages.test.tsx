import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { JSDOM } from 'jsdom'
import { renderToString } from 'react-dom/server'
import { createGuideApi } from '../api/guide'
import { configQuery, contextQuery, docQuery, docsQuery, llmsTxtQuery, skillsQuery } from '../api/queries'
import { guideRoutes, mockConfig } from '../dev/mock-guide'
import { I18nProvider } from '../i18n'
import { START_HERE_SLUG } from '../model/docs'
import { routeTree } from './pages'

const mockFetch = (input: string) => {
  const url = new URL(input, 'http://guide.test')
  return Promise.resolve(guideRoutes(new Request(url), url) ?? new Response('', { status: 404 }))
}
const api = createGuideApi(mockFetch)

// Route loaders read through the app's own client (global `fetch`); document bodies are sanitized against a DOM `window`.
const globals = globalThis as unknown as Record<string, unknown>
const saved = { fetch: globals.fetch, window: globals.window }
beforeAll(() => {
  globals.fetch = mockFetch
  globals.window = new JSDOM('', { url: 'http://guide.test/' }).window
})
afterAll(() => {
  globals.fetch = saved.fetch
  globals.window = saved.window
})

/** Renders `path` from a cache seeded through the mock; `context: false` leaves `/context` unanswered (403/503/pending). */
async function renderRoute(path: string, language: 'ja' | 'en', { context = true }: { context?: boolean } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  client.setQueryData(configQuery.queryKey, await api.config())
  client.setQueryData(docsQuery.queryKey, await api.docs())
  client.setQueryData(docQuery(START_HERE_SLUG).queryKey, await api.doc(START_HERE_SLUG))
  client.setQueryData(skillsQuery.queryKey, await api.skills())
  client.setQueryData(llmsTxtQuery.queryKey, await api.llmsTxt())
  if (context) client.setQueryData(contextQuery.queryKey, await api.context())
  const router = createRouter({ routeTree, context: { queryClient: client }, history: createMemoryHistory({ initialEntries: [path] }) })
  await router.load()
  const html = renderToString(
    <QueryClientProvider client={client}>
      <I18nProvider language={language}>
        <RouterProvider router={router} />
      </I18nProvider>
    </QueryClientProvider>
  )
  client.clear()
  return html.replaceAll('<!-- -->', '')
}

describe('Agent Guide screens with mock API data', () => {
  test('home: Start here beside Agent setup with the environment login and the key form', async () => {
    const html = await renderRoute('/', 'en')
    expect(html).toContain('>Start here</h1>')
    expect(html).toContain('Agent setup')
    expect(html).toContain(`apth login --api-url ${mockConfig.platformApiUrl} --project ${mockConfig.projectId}`)
    expect(html).toContain('Signed in as hana.sato@acme.example')
    expect(html).toContain('Role: Editor')
    expect(html).toContain('Apps in this Project')
    expect(html).toContain('Create agent key')
    expect(html).toContain('aria-label="Switch app"')
    expect(await renderRoute('/', 'ja')).toContain('エージェントの設定')
  })

  test('home without /context (Access Key subject or Platform API down) still offers setup', async () => {
    const html = await renderRoute('/', 'en', { context: false })
    expect(html).not.toContain('Signed in as')
    expect(html).not.toContain('Apps in this Project')
    expect(html).toContain('Create agent key')
  })

  test('navigation groups documents by section with audience badges', async () => {
    const html = await renderRoute('/skills', 'ja')
    expect(html).toContain('apthctl（運用者向け）')
    expect(html).toContain('>運用者</span>')
    expect(html).toContain('href="/docs/apth/cookbook/apps"')
    expect(html).toContain('placeholder="ドキュメントを絞り込む"')
  })

  test('document: rendered body with copyable code, raw .md link and sources', async () => {
    const html = await renderRoute('/docs/apth/cookbook/apps', 'en')
    expect(html).toContain('>Apps cookbook</h1>')
    expect(html).toContain('href="/md/apth/cookbook/apps.md"')
    expect(html).toContain('Copy as Markdown')
    expect(html).toContain('data-copy-code')
    expect(html).toContain('apth-cli/skills/appthrust-app-dev/SKILL.md')
    expect(html).toContain('@1572ae7afa15')
    expect(html).toContain('aria-current="page"')
  })

  test('an unknown document renders the not-found page', async () => {
    expect(await renderRoute('/docs/does/not/exist', 'en')).toContain('Page not found')
  })

  test('skills: each card has an install snippet against the app public URL', async () => {
    const html = await renderRoute('/skills', 'en')
    expect(html).toContain('appthrust-marketplace-apps')
    expect(html).toContain(`src=${mockConfig.publicUrl}/skills/appthrust-app-dev`)
    expect(html).toContain('&quot;$src/references/troubleshooting.md&quot; -o &quot;$dir/references/troubleshooting.md&quot;')
    expect(html).toContain('href="/skills/appthrust-app-dev/SKILL.md"')
  })

  test('llms: the index with its fetch command', async () => {
    const html = await renderRoute('/llms', 'en')
    expect(html).toContain('# Agent Guide')
    expect(html).toContain(`${mockConfig.publicUrl}/llms.txt`)
    expect(html).toContain('href="/llms-full.txt"')
  })
})
