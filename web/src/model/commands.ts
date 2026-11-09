// Shell commands the SPA shows for copy and paste. Every environment value
// comes from `GET /api/agent-guide/v1/config`, never from a literal, so the
// same build is correct on every estate.
import type { GuideConfig, Skill } from '../api/guide'

const SAFE_WORD = /^[A-Za-z0-9_@%+=:,./-]+$/

/** A POSIX-shell word: unchanged when it has no special characters, else single-quoted. */
export function shellQuote(value: string): string {
  if (SAFE_WORD.test(value)) return value
  return `'${value.replaceAll("'", `'\\''`)}'`
}

/** Device login against this installation's Platform API, selecting its Project. */
export function loginCommand(config: Pick<GuideConfig, 'platformApiUrl' | 'projectId'>): string {
  return `apth login --api-url ${shellQuote(config.platformApiUrl)} --project ${shellQuote(config.projectId)}`
}

/** The variable the setup block exports the short-lived assertion into; skill snippets read it. */
export const ASSERTION_ENV = 'AGENT_GUIDE_ASSERTION'

const trimSlash = (url: string) => url.replace(/\/+$/, '')

/** A GET with the assertion, as the guide's text routes expect. `url` and `output` are shell words, already quoted. */
function curlWithAssertion(url: string, output?: string): string {
  const out = output ? ` -o ${output}` : ''
  return `curl -fsSL -H "Authorization: Bearer $${ASSERTION_ENV}" ${url}${out}`
}

/**
 * Installs one skill into `$SKILLS_DIR` (default: Claude Code's
 * `~/.claude/skills`), fetching every file the skills index lists.
 */
export function skillInstallScript(publicUrl: string, skill: Skill): string {
  const subdirs = [...new Set(skill.files.filter((file) => file.includes('/')).map((file) => file.slice(0, file.lastIndexOf('/'))))].sort()
  return [
    `src=${shellQuote(`${trimSlash(publicUrl)}/skills/${encodeURIComponent(skill.name)}`)}`,
    `dir="\${SKILLS_DIR:-$HOME/.claude/skills}/${skill.name}"`,
    `mkdir -p ${['"$dir"', ...subdirs.map((subdir) => `"$dir/${subdir}"`)].join(' ')}`,
    ...skill.files.map((file) => curlWithAssertion(`"$src/${file.split('/').map(encodeURIComponent).join('/')}"`, `"$dir/${file}"`)),
  ].join('\n')
}

/** Fetches the agent index (`/llms.txt`) from the app's public URL with the assertion. */
export function llmsTxtCommand(publicUrl: string): string {
  return curlWithAssertion(shellQuote(`${trimSlash(publicUrl)}/llms.txt`))
}
