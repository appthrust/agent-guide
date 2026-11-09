import { describe, expect, test } from 'bun:test'
import { guideRoutes, mockDocs } from './mock-guide'

const get = (path: string, contextMode?: string) => {
  const url = new URL(path, 'http://guide.test')
  return guideRoutes(new Request(url), url, contextMode)
}

describe('mock Agent Guide server', () => {
  test('serves the documented sample: three sections, at least six documents, two skills', async () => {
    const { docs } = (await get('/api/agent-guide/v1/docs')?.json()) as { docs: typeof mockDocs }
    expect(new Set(docs.map((doc) => doc.section)).size).toBe(3)
    expect(docs.length).toBeGreaterThanOrEqual(6)
    for (const doc of docs) expect(Object.keys(doc).sort()).toEqual(['audience', 'order', 'section', 'slug', 'summary', 'tags', 'title'])
    const detail = (await get('/api/agent-guide/v1/docs/apthctl/debug')?.json()) as Record<string, unknown>
    expect(Object.keys(detail).sort()).toEqual(['audience', 'markdown', 'section', 'slug', 'sources', 'summary', 'tags', 'title'])
    const skills = (await get('/skills/index.json')?.json()) as { skills: unknown[] }
    expect(skills).toEqual((await get('/api/agent-guide/v1/skills')?.json()) as { skills: unknown[] })
    expect(skills.skills).toHaveLength(2)
    expect(await get('/config')?.json()).toEqual({ projectId: 'pj-3f9a1c2d7e4b', publicUrl: 'https://agent-guide.pj-3f9a1c2d7e4b.acme.example' })
  })

  test('agent text routes are Markdown and every llms.txt link resolves', async () => {
    const llms = get('/llms.txt')
    expect(llms?.headers.get('content-type')).toBe('text/markdown; charset=utf-8')
    const text = (await llms?.text()) ?? ''
    expect(text).toContain('## Skills')
    for (const [, href] of text.matchAll(/\]\((https:[^)]+)\)/g)) expect(get(new URL(href).pathname)?.status).toBe(200)
    expect(await get('/md/apth/install.md')?.text()).toContain('apth --version')
    expect((await get('/llms-full.txt')?.text())?.startsWith('# Start here')).toBe(true)
  })

  test('context answers like the server for users, key subjects and a failing Platform API', () => {
    expect(get('/api/agent-guide/v1/context')?.status).toBe(200)
    expect(get('/api/agent-guide/v1/context', '403')?.status).toBe(403)
    expect(get('/api/agent-guide/v1/context', '503')?.status).toBe(503)
  })

  test('unknown documents and skill files are 404; other paths are not the mock’s', () => {
    expect(get('/api/agent-guide/v1/docs/missing')?.status).toBe(404)
    expect(get('/skills/appthrust-app-dev/missing.md')?.status).toBe(404)
    expect(get('/launcher')).toBeUndefined()
  })
})
