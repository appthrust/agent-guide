// Dev-only Agent Guide contract (design.md "HTTP surface") over sample
// content: three sections, seven documents and two skills, already rendered
// with a fictional installation's values. Start here, the apps cookbook and
// the app-dev skill have Japanese variants (`?lang=ja`); the rest falls back
// to English like the server. No auth. `MOCK_CONTEXT=403|503` makes
// `/api/agent-guide/v1/context` answer like an Access Key subject or a
// failing Platform API.
import type { Doc, DocSummary, GuideConfig, GuideContext, Lang, Skill } from '../api/guide'

const PROJECT = 'pj-3f9a1c2d7e4b'
const PLATFORM_API = 'https://dashboard.acme.example'
const PUBLIC_URL = `https://agent-guide.${PROJECT}.acme.example`

export const mockConfig: GuideConfig = {
  projectId: PROJECT,
  publicUrl: PUBLIC_URL,
  platformApiUrl: PLATFORM_API,
  baseDomain: 'acme.example',
  accessUrl: PLATFORM_API,
  releaseVersion: 'v0.1.0',
}

export const mockContext: GuideContext = {
  me: { login: 'hana.sato@acme.example', role: 'Editor' },
  installations: [
    { name: 'agent-guide', version: 'v0.1.0', url: PUBLIC_URL, phase: 'Ready' },
    { name: 'knowledge', version: 'v0.4.2', url: `https://knowledge.${PROJECT}.acme.example`, phase: 'Ready' },
    { name: 'memo', version: 'v0.3.0', url: `https://memo.${PROJECT}.acme.example`, phase: 'Upgrading' },
  ],
}

const REVISION = '1572ae7afa15df418cad36501f237b4595349428'
const fence = '```'

type MockDoc = Omit<Doc, 'lang' | 'availableLangs'> & { order: number }
type Variant = Pick<Doc, 'title' | 'summary' | 'markdown'>

const SECTION_ORDER: Record<string, number> = { 'start-here': 0, apth: 1, apthctl: 2 }

const docs: MockDoc[] = [
  {
    slug: 'start-here',
    title: 'Start here',
    summary: 'What this guide covers, the environment it is bound to, and the first three commands an agent runs.',
    audience: 'both',
    section: 'start-here',
    order: 0,
    tags: ['overview'],
    sources: [
      { path: 'apth-cli/README.md', revision: REVISION },
      { path: 'docs/getting-started/README.md', revision: REVISION },
    ],
    markdown: `This guide teaches a coding agent to operate the AppThrust Project **${PROJECT}** with \`apth\` (developers) and \`apthctl\` (operators). Every command below already carries this environment's values; copy them as they are.

## This environment

| Value | |
| --- | --- |
| Platform API | \`${PLATFORM_API}\` |
| Project | \`${PROJECT}\` |
| Guide | \`${PUBLIC_URL}\` |

## First commands

${fence}bash
apth login --api-url ${PLATFORM_API} --project ${PROJECT}
apth whoami
apth apps list --project ${PROJECT}
${fence}

## Rules every agent follows

- Use \`apth\` before raw HTTP: commands handle auth, idempotency and waits.
- Never print, paste or log a token or an Access Key secret.
- Every wait is bounded: \`--wait --timeout 5m\`.
- Destructive commands need an explicit \`--yes\`; ask the person first.
- **Pod Ready is not product Ready.** An app is done when \`apth apps get\` reports it Ready *and* its public URL answers.

## Where to go next

1. [Install apth](/docs/apth/install) on the machine the agent uses.
2. Read [Apps cookbook](/docs/apth/cookbook/apps) for create, publish, logs and delete.
3. When something is stuck, open [Troubleshooting](/docs/apth/troubleshooting).
`,
  },
  {
    slug: 'apth/install',
    title: 'Install apth',
    summary: 'Get the apth binary, check its version and install the bundled agent skill.',
    audience: 'developer',
    section: 'apth',
    order: 10,
    tags: ['install', 'cli'],
    sources: [{ path: 'apth-cli/README.md', revision: REVISION }],
    markdown: `\`apth\` is the developer-facing AppThrust CLI. It talks to the Platform API only through the Go SDK.

${fence}bash
go install github.com/appthrust/platform/apth-cli/cmd/apth@latest
apth --version
${fence}

The binary needs no configuration until you log in. Profiles live in \`~/.config/apth\`; never commit that directory.
`,
  },
  {
    slug: 'apth/login-and-profiles',
    title: 'Log in and choose a Project',
    summary: "Device login against this environment's Platform API and profile selection.",
    audience: 'developer',
    section: 'apth',
    order: 20,
    tags: ['auth', 'profiles'],
    sources: [{ path: 'apth-cli/README.md', revision: REVISION }],
    markdown: `Log in once per machine. \`apth\` opens a device login in the browser and stores a refreshable session in the active profile.

${fence}bash
apth login --api-url ${PLATFORM_API} --project ${PROJECT}
apth profiles list
apth context show
${fence}

A \`401\` with the hint *run apth login* means the session expired: run the login again, do not retry the failed command in a loop.
`,
  },
  {
    slug: 'apth/cookbook/apps',
    title: 'Apps cookbook',
    summary: 'Create, inspect, configure, publish and delete an app, with bounded waits.',
    audience: 'developer',
    section: 'apth',
    order: 30,
    tags: ['apps', 'publish', 'logs'],
    sources: [
      { path: 'apth-cli/README.md', revision: REVISION },
      { path: 'apth-cli/skills/appthrust-app-dev/SKILL.md', revision: REVISION },
    ],
    markdown: `## Create from a template

${fence}bash
apth apps create my-game --template nextjs-postgres --publish --wait --timeout 10m --project ${PROJECT}
${fence}

The command creates the source repository, builds the image, deploys the stack and publishes a URL under \`*.${PROJECT}.acme.example\`.

## Deploy an existing image

${fence}bash
apth apps create my-app --image 'ghcr.io/acme/app:v1.10.1' --project ${PROJECT}
${fence}

Quote the image: a tag beginning with \`^\` is a regex the registry follows.

## Inspect and configure

${fence}bash
apth apps get my-app --project ${PROJECT}
apth apps env set my-app LOG_LEVEL=debug --project ${PROJECT}
apth apps logs my-app --project ${PROJECT}
${fence}

## Delete

${fence}bash
apth apps delete my-app --project ${PROJECT} --yes
${fence}
`,
  },
  {
    slug: 'apth/troubleshooting',
    title: 'Troubleshooting',
    summary: 'Read 401 hints, tell delivery_pending from delivery_blocked, and walk the not-Ready ladder.',
    audience: 'developer',
    section: 'apth',
    order: 90,
    tags: ['errors', 'readiness', '409'],
    sources: [
      { path: 'apth-cli/README.md', revision: REVISION },
      { path: 'docs/apthctl/platform.md', revision: REVISION },
    ],
    markdown: `## 409 conflicts

- \`delivery_pending\`: a release is still rolling out. Wait with \`--wait --timeout 5m\`, then retry once.
- \`delivery_blocked\`: something needs a person (a failed gate, a missing secret). Do not retry; report the reason field.

## The not-Ready ladder

1. \`apth apps get my-app\` — which component is not Ready?
2. \`apth components runtime-status my-app web\` — is the workload running?
3. \`apth apps logs my-app\` — what does the process say?
4. Only then look at probes and the public URL.
`,
  },
  {
    slug: 'apthctl/overview',
    title: 'apthctl for operators',
    summary: 'What apthctl does, the authority it needs, and why this guide never hands it credentials.',
    audience: 'operator',
    section: 'apthctl',
    order: 10,
    tags: ['operators', 'authority'],
    sources: [{ path: 'docs/apthctl/platform.md', revision: REVISION }],
    markdown: `\`apthctl\` operates the platform itself: platform releases, cluster debugging and leases. It needs Gateway or kubeconfig authority that this app cannot and must not grant.

> If you do not already hold operator authority for this estate, stop here and ask the platform team.

${fence}bash
apthctl version
apthctl debug runtime-path --help
${fence}
`,
  },
  {
    slug: 'apthctl/debug',
    title: 'Debug with apthctl',
    summary: 'Runtime-path health, workload-cluster connectivity and HTTP failures, before reaching for kubectl.',
    audience: 'operator',
    section: 'apthctl',
    order: 30,
    tags: ['debug', 'connectivity'],
    sources: [{ path: 'skills/apthctl-debug/SKILL.md', revision: REVISION }],
    markdown: `Start every investigation with the read-only debug commands; they explain *where* a request stops.

${fence}bash
apthctl debug runtime-path --project ${PROJECT} --app my-app
${fence}

Read the first failing hop. Fix that hop, then run the same command again to confirm.
`,
  },
]

const japanese: Record<string, Variant> = {
  'start-here': {
    title: 'はじめに',
    summary: 'このガイドの範囲、結びついている環境、エージェントが最初に実行する 3 つのコマンドを説明します。',
    markdown: `このガイドは、コーディングエージェントが \`apth\`（開発者）と \`apthctl\`（運用者）で AppThrust Project **${PROJECT}** を操作するためのものです。以下のコマンドには、この環境の値がすでに入っています。そのままコピーしてください。

## この環境

| 値 | |
| --- | --- |
| Platform API | \`${PLATFORM_API}\` |
| Project | \`${PROJECT}\` |
| ガイド | \`${PUBLIC_URL}\` |

## 最初のコマンド

${fence}bash
apth login --api-url ${PLATFORM_API} --project ${PROJECT}
apth whoami
apth apps list --project ${PROJECT}
${fence}

## エージェントが守るルール

- 生の HTTP より先に \`apth\` を使ってください。認証、冪等性、待機はコマンドが扱います。
- トークンやアクセスキーのシークレットを出力したり、貼り付けたり、ログに残したりしないでください。
- 待機には必ず上限を設けてください: \`--wait --timeout 5m\`。
- 破壊的なコマンドには明示的な \`--yes\` が必要です。先に人に確認してください。
- **Pod の Ready はプロダクトの Ready ではありません。** \`apth apps get\` が Ready を報告し、*かつ* 公開 URL が応答したときに完了です。

## 次に読むもの

1. エージェントを動かすマシンに [apth をインストール](/docs/apth/install) します。
2. 作成、公開、ログ、削除は [アプリのクックブック](/docs/apth/cookbook/apps) を読んでください。
3. 詰まったら [トラブルシューティング](/docs/apth/troubleshooting) を開いてください。
`,
  },
  'apth/cookbook/apps': {
    title: 'アプリのクックブック',
    summary: '上限付きの待機で、アプリを作成、確認、設定、公開、削除します。',
    markdown: `## テンプレートから作成する

${fence}bash
apth apps create my-game --template nextjs-postgres --publish --wait --timeout 10m --project ${PROJECT}
${fence}

このコマンドはソースリポジトリを作り、イメージをビルドし、スタックをデプロイして、\`*.${PROJECT}.acme.example\` の URL で公開します。

## 削除する

${fence}bash
apth apps delete my-app --project ${PROJECT} --yes
${fence}
`,
  },
}

type MockSkill = Omit<Skill, 'lang' | 'availableLangs'> & { contents: Record<string, string>; japanese?: { description: string; contents: Record<string, string> } }

const skills: MockSkill[] = [
  {
    name: 'appthrust-app-dev',
    description: `Create, deploy, update and debug apps on the AppThrust Project ${PROJECT} with apth.`,
    files: ['SKILL.md', 'references/troubleshooting.md'],
    contents: {
      'SKILL.md': `---\nname: appthrust-app-dev\ndescription: Create, deploy, update and debug apps on the AppThrust Project ${PROJECT} with apth.\n---\n\n# AppThrust app development\n\nLog in with \`apth login --api-url ${PLATFORM_API} --project ${PROJECT}\`.\n`,
      'references/troubleshooting.md': '# Troubleshooting\n\nSee the not-Ready ladder.\n',
    },
    japanese: {
      description: `apth で AppThrust Project ${PROJECT} のアプリを作成、デプロイ、更新、デバッグします。`,
      contents: {
        'SKILL.md': `---\nname: appthrust-app-dev\ndescription: apth で AppThrust Project ${PROJECT} のアプリを作成、デプロイ、更新、デバッグします。\n---\n\n# AppThrust アプリ開発\n\n\`apth login --api-url ${PLATFORM_API} --project ${PROJECT}\` でログインします。\n`,
      },
    },
  },
  {
    name: 'appthrust-marketplace-apps',
    description: 'Install, update and pin marketplace apps in this Project; follow vs pinned and retry-release.',
    files: ['SKILL.md'],
    contents: {
      'SKILL.md': `---\nname: appthrust-marketplace-apps\ndescription: Install, update and pin marketplace apps in this Project.\n---\n\n# Marketplace apps\n\nUse \`apth app-installations retry-release <name> --project ${PROJECT}\` after a failed release.\n`,
    },
  },
]

/** A document in `lang`, falling back to English like the server. */
function docIn({ order: _order, ...doc }: MockDoc, lang: Lang): Doc {
  const variant = japanese[doc.slug]
  const availableLangs: Lang[] = variant ? ['en', 'ja'] : ['en']
  return lang === 'ja' && variant ? { ...doc, ...variant, lang: 'ja', availableLangs } : { ...doc, lang: 'en', availableLangs }
}

const summaryOf = (doc: MockDoc, lang: Lang): DocSummary => {
  const { slug, title, summary, audience, section, tags, lang: served, availableLangs } = docIn(doc, lang)
  return { slug, title, summary, audience, section, order: doc.order, tags, lang: served, availableLangs }
}

/** Sorted like the server: (section order, order, English title); a translation keeps the English order. */
const sortedDocs = [...docs].sort((a, b) => (SECTION_ORDER[a.section] ?? 99) - (SECTION_ORDER[b.section] ?? 99) || a.order - b.order || a.title.localeCompare(b.title))

export const mockDocsIn = (lang: Lang): DocSummary[] => sortedDocs.map((doc) => summaryOf(doc, lang))

export const mockDocs: DocSummary[] = mockDocsIn('en')

export const mockSkillsIn = (lang: Lang): Skill[] =>
  skills.map(({ name, description, files, japanese: variant }) => {
    const availableLangs: Lang[] = variant ? ['en', 'ja'] : ['en']
    return lang === 'ja' && variant ? { name, description: variant.description, files, lang: 'ja', availableLangs } : { name, description, files, lang: 'en', availableLangs }
  })

export const mockSkills: Skill[] = mockSkillsIn('en')

const langSuffix = (lang: Lang) => (lang === 'en' ? '' : `?lang=${lang}`)

export function mockLlmsTxt(lang: Lang = 'en'): string {
  const lines = ['# Agent Guide', '', `> How to operate the AppThrust Project ${PROJECT} with apth and apthctl.`, '']
  let section = ''
  for (const doc of mockDocsIn(lang)) {
    if (doc.section !== section) {
      if (section) lines.push('')
      section = doc.section
      lines.push(`## ${section}`, '')
    }
    lines.push(`- [${doc.title}](${PUBLIC_URL}/md/${doc.slug}.md${langSuffix(doc.lang)}): ${doc.summary}`)
  }
  lines.push('', '## Skills', '', ...mockSkillsIn(lang).map((skill) => `- [${skill.name}](${PUBLIC_URL}/skills/${skill.name}/SKILL.md${langSuffix(skill.lang)}): ${skill.description}`), '')
  return lines.join('\n')
}

function mockLlmsFullTxt(lang: Lang): string {
  return sortedDocs.map((doc) => docIn(doc, lang)).map((doc) => `# ${doc.title}\n\n${doc.markdown}`).join('\n\n')
}

const notFound = (what: string) => Response.json({ error: 'not_found', message: `${what} not found` }, { status: 404 })
const markdown = (body: string) => new Response(body, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } })

/** Answers one guide request, or `undefined` when the path is not part of the contract. */
export function guideRoutes(request: Request, url: URL, contextMode = process.env.MOCK_CONTEXT): Response | undefined {
  if (request.method !== 'GET') return undefined
  const path = decodeURIComponent(url.pathname)
  const lang: Lang = url.searchParams.get('lang') === 'ja' ? 'ja' : 'en'
  const api = '/api/agent-guide/v1'
  if (path === '/config') return Response.json({ projectId: mockConfig.projectId, publicUrl: mockConfig.publicUrl })
  if (path === `${api}/config`) return Response.json(mockConfig)
  if (path === `${api}/docs`) return Response.json({ lang, docs: mockDocsIn(lang) })
  if (path.startsWith(`${api}/docs/`)) {
    const doc = docs.find((candidate) => candidate.slug === path.slice(`${api}/docs/`.length))
    return doc ? Response.json(docIn(doc, lang)) : notFound('document')
  }
  if (path === `${api}/skills` || path === '/skills/index.json') return Response.json({ lang, skills: mockSkillsIn(lang) })
  if (path === `${api}/context`) {
    if (contextMode === '403') return Response.json({ error: 'key_subject', message: 'context is only available to user sessions' }, { status: 403 })
    if (contextMode === '503') return Response.json({ error: 'platform_unavailable', message: 'Platform API did not answer' }, { status: 503 })
    return Response.json(mockContext)
  }
  if (path === '/llms.txt') return markdown(mockLlmsTxt(lang))
  if (path === '/llms-full.txt') return markdown(mockLlmsFullTxt(lang))
  if (path.startsWith('/md/') && path.endsWith('.md')) {
    const doc = docs.find((candidate) => candidate.slug === path.slice('/md/'.length, -'.md'.length))
    return doc ? markdown(docIn(doc, lang).markdown) : notFound('document')
  }
  if (path.startsWith('/skills/')) {
    const [name, ...file] = path.slice('/skills/'.length).split('/')
    const skill = skills.find((candidate) => candidate.name === name)
    const body = (lang === 'ja' ? skill?.japanese?.contents[file.join('/')] : undefined) ?? skill?.contents[file.join('/')]
    return body === undefined ? notFound('skill file') : markdown(body)
  }
  return undefined
}
