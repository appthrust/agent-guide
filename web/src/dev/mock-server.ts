// Dev-only API mock: `bun src/dev/mock-server.ts` (or `bun run mock`). Serves
// the Agent Guide contract (./mock-guide) and the app switcher's
// `GET /launcher` on one port; Vite proxies both here (vite.config.ts).
import { createMockLauncherHandler, mockLauncherEntries, type Entry } from '@appthrust/app-launcher'
import { guideRoutes, mockConfig } from './mock-guide'

const port = Number(process.env.AGENT_GUIDE_MOCK_PORT ?? 5246)
const self: Entry = {
  definitionId: 'agent-guide',
  name: 'Agent Guide',
  description: 'Environment-bound guide, skills and llms.txt for coding agents.',
  icon: 'agent-guide',
  url: mockConfig.publicUrl,
  phase: 'Ready',
  current: true,
}
const launcher = createMockLauncherHandler([self, ...mockLauncherEntries('agent-guide')])

const server = Bun.serve({
  port,
  hostname: '127.0.0.1',
  fetch(request) {
    const url = new URL(request.url)
    return launcher(request) ?? guideRoutes(request, url) ?? Response.json({ error: 'not_found', message: `no mock for ${request.method} ${url.pathname}` }, { status: 404 })
  },
})

console.log(`agent-guide mock API on http://${server.hostname}:${server.port} (MOCK_CONTEXT=${process.env.MOCK_CONTEXT ?? 'ok'})`)
