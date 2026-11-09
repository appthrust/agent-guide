import { execFile } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs, promisify } from 'node:util'
import { YAML } from 'bun'

const exec = promisify(execFile)

async function markdownFiles(directory: string): Promise<string[]> {
  const files: string[] = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await markdownFiles(path))
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path)
  }
  return files.sort()
}

export async function checkSources(platform: string, contentRoot: string): Promise<string[]> {
  const failures: string[] = []
  const checked = new Map<string, boolean>()
  for (const file of await markdownFiles(contentRoot)) {
    const name = relative(contentRoot, file)
    const text = (await readFile(file, 'utf8')).replaceAll('\r\n', '\n')
    const frontmatter = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(text)
    if (!frontmatter) {
      failures.push(`${name}: missing frontmatter`)
      continue
    }
    let metadata: { sources?: unknown }
    try {
      metadata = YAML.parse(frontmatter[1]!) as { sources?: unknown }
    } catch {
      failures.push(`${name}: invalid YAML frontmatter`)
      continue
    }
    const sources = metadata?.sources
    // Skills may use only the agent-skill name/description frontmatter.
    if (sources === undefined && name.startsWith('skills/')) continue
    if (!Array.isArray(sources) || sources.length === 0) {
      failures.push(`${name}: sources must be a non-empty array`)
      continue
    }
    for (const source of sources) {
      if (!source || typeof source.path !== 'string' || typeof source.revision !== 'string' ||
        !source.path || source.path.startsWith('/') || source.path.split('/').some((part: string) => part === '..' || part === '.' || part === '') ||
        !/^[a-f0-9]{40}$/.test(source.revision)) {
        failures.push(`${name}: source requires a repository-relative path and full Git revision`)
        continue
      }
      // Nexus vault sources (`vault:<path>`) are not in the platform checkout.
      if (source.path.startsWith('vault:')) continue
      const object = `${source.revision}:${source.path}`
      if (!checked.has(object)) {
        try {
          await exec('git', ['-C', platform, 'cat-file', '-e', object], { timeout: 10_000 })
          checked.set(object, true)
        } catch {
          checked.set(object, false)
        }
      }
      if (!checked.get(object)) failures.push(`${name}: missing ${object}`)
    }
  }
  return failures
}

async function main(): Promise<void> {
  const { values } = parseArgs({ args: Bun.argv.slice(2), options: { platform: { type: 'string' } }, strict: true })
  if (!values.platform) throw new Error('usage: bun hack/check-sources.ts --platform <checkout>')
  const contentRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../content')
  const failures = await checkSources(resolve(values.platform), contentRoot)
  if (failures.length > 0) throw new Error(failures.join('\n'))
  console.log('All content sources exist at their pinned platform revisions')
}

if (import.meta.main) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
