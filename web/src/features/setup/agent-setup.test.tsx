import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { JSDOM } from 'jsdom'
import { act } from 'react'
import type { Root } from 'react-dom/client'
import { mockConfig } from '../../dev/mock-guide'
import { I18nProvider } from '../../i18n'
import { AgentKeyForm } from './agent-setup'

// The form is interactive (validation, the one-time block, start over), so it runs in a jsdom document.
// react-dom/client decides at import whether it has a DOM, so it is imported after the globals exist.
const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://agent-guide.pj-3f9a1c2d7e4b.acme.example/' })
const globals = globalThis as unknown as Record<string, unknown>
const saved = { window: globals.window, document: globals.document, actEnv: globals.IS_REACT_ACT_ENVIRONMENT }
let root: Root

let createRoot: typeof import('react-dom/client').createRoot

beforeAll(async () => {
  globals.window = dom.window
  globals.document = dom.window.document
  globals.IS_REACT_ACT_ENVIRONMENT = true
  createRoot = (await import('react-dom/client')).createRoot
})

afterAll(() => {
  act(() => root.unmount())
  globals.window = saved.window
  globals.document = saved.document
  globals.IS_REACT_ACT_ENVIRONMENT = saved.actEnv
})

const container = () => dom.window.document.getElementById('root') as HTMLElement

function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
}

const submit = () => container().querySelector('form')?.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }))

describe('Create agent key form', () => {
  test('requires a label, then shows the paste-once block and the warning, and starts over cleanly', () => {
    root = createRoot(container())
    act(() =>
      root.render(
        <I18nProvider language="en">
          <AgentKeyForm config={mockConfig} />
        </I18nProvider>
      )
    )
    const input = () => container().querySelector('input[name="label"]') as HTMLInputElement

    act(() => submit())
    expect(container().textContent).toContain('Enter a label.')
    expect(input().getAttribute('aria-invalid')).toBe('true')

    act(() => typeInto(input(), "  hana's laptop "))
    expect(input().getAttribute('aria-invalid')).toBeNull()
    act(() => submit())

    const text = container().textContent ?? ''
    expect(text).toContain('The key secret is shown only once')
    expect(text).toContain(`--project ${mockConfig.projectId} --space agent-guide --scope read --label 'hana'\\''s laptop' --env`)
    expect(text).toContain(`${mockConfig.publicUrl}/llms.txt`)
    expect(dom.window.document.activeElement?.textContent).toBe('Run this in the agent’s shell')
    expect(container().querySelector('form')).toBeNull()

    const startOver = [...container().querySelectorAll('button')].find((button) => button.textContent === 'Start over')
    act(() => startOver?.click())
    expect(input().value).toBe('')
    expect(container().textContent).not.toContain('--label')
  })
})
