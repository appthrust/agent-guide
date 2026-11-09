import { describe, expect, test } from 'bun:test'
import { mockConfig, mockSkills } from '../dev/mock-guide'
import { llmsTxtCommand, loginCommand, shellQuote, skillInstallScript } from '../model/commands'
import { accessKeyCreateCommand, agentBootstrapScript, agentKeyRequest } from './platform'

describe('agent key commands', () => {
  test('the key request is the agent-guide space, read scope only, with the trimmed label', () => {
    expect(agentKeyRequest('  claude laptop ')).toEqual({ space: 'agent-guide', scopes: ['read'], label: 'claude laptop' })
  })

  test('access-keys create mirrors apth flags and quotes a label with spaces or quotes', () => {
    expect(accessKeyCreateCommand('pj-1', agentKeyRequest('codex'))).toBe('apth access-keys create --project pj-1 --space agent-guide --scope read --label codex --env')
    expect(accessKeyCreateCommand('pj-1', agentKeyRequest("Hana's $HOME laptop"))).toBe(
      "apth access-keys create --project pj-1 --space agent-guide --scope read --label 'Hana'\\''s $HOME laptop' --env"
    )
  })

  test('the bootstrap creates without echoing, exchanges at the Platform API URL apth set, and reads llms.txt from this app', () => {
    const script = agentBootstrapScript(mockConfig, agentKeyRequest('ci'))
    expect(script).toContain(`eval "$(apth access-keys create --project ${mockConfig.projectId} --space agent-guide --scope read --label ci --env)"`)
    expect(script).toContain('apth access-keys exchange --access-url "$AGENT_GUIDE_ACCESS_URL" <<<"$AGENT_GUIDE_API_KEY"')
    expect(script).toContain(`curl -fsSL -H "Authorization: Bearer $AGENT_GUIDE_ASSERTION" ${mockConfig.publicUrl}/llms.txt`)
    expect(script).not.toContain(`${mockConfig.accessUrl}/llms.txt`)
    expect(script).not.toMatch(/agg_[A-Za-z0-9]/)
  })
})

describe('environment commands', () => {
  test('login targets the installation Platform API and Project', () => {
    expect(loginCommand(mockConfig)).toBe(`apth login --api-url ${mockConfig.platformApiUrl} --project ${mockConfig.projectId}`)
  })

  test('shell quoting leaves safe words alone and single-quotes the rest', () => {
    expect(shellQuote('https://a.example/x?y=1')).toBe("'https://a.example/x?y=1'")
    expect(shellQuote('pj-3f9a1c2d7e4b')).toBe('pj-3f9a1c2d7e4b')
    expect(shellQuote('')).toBe("''")
  })

  test('a skill installs every listed file, creating nested directories first', () => {
    const script = skillInstallScript(`${mockConfig.publicUrl}/`, mockSkills[0])
    expect(script.split('\n')).toEqual([
      `src=${mockConfig.publicUrl}/skills/appthrust-app-dev`,
      'dir="${SKILLS_DIR:-$HOME/.claude/skills}/appthrust-app-dev"',
      'mkdir -p "$dir" "$dir/references"',
      'curl -fsSL -H "Authorization: Bearer $AGENT_GUIDE_ASSERTION" "$src/SKILL.md" -o "$dir/SKILL.md"',
      'curl -fsSL -H "Authorization: Bearer $AGENT_GUIDE_ASSERTION" "$src/references/troubleshooting.md" -o "$dir/references/troubleshooting.md"',
    ])
    expect(llmsTxtCommand(mockConfig.publicUrl)).toEndWith(`${mockConfig.publicUrl}/llms.txt`)
  })
})
