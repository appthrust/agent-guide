// Documents arrive as Markdown already rendered with the installation's values;
// the SPA turns them into HTML with marked (GFM) and then DOMPurify, so a
// document can never inject script, event handlers or `javascript:` URLs.
// Fenced code blocks get a copy button; one delegated click handler serves
// every block, including blocks nested in lists.
import DOMPurify, { type WindowLike } from 'dompurify'
import { Marked, type Tokens } from 'marked'
import { useMemo, type MouseEvent } from 'react'
import { useText } from '../i18n'
import { cn } from './cn'
import { COPIED_MS, copyText } from './copy'

export type CodeLabels = { copy: string; copied: string; failed: string; copyCode: string }

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char])

/** Markdown → sanitized HTML against `window`'s DOM (a test passes a jsdom window). */
export function createMarkdownRenderer(window: WindowLike & { location: { origin: string } }, labels: CodeLabels): (markdown: string) => string {
  const purify = DOMPurify(window)
  const origin = window.location.origin
  purify.addHook('afterSanitizeAttributes', (node) => {
    // Links to other sites open in a new tab without handing them `window.opener`; this app's own routes stay in place.
    if (node.tagName === 'A' && node.hasAttribute('href')) {
      const href = node.getAttribute('href') ?? ''
      if (/^https?:\/\//i.test(href) && new URL(href).origin !== origin) {
        node.setAttribute('target', '_blank')
        node.setAttribute('rel', 'noopener noreferrer')
      }
    }
    if (node.tagName === 'IMG') node.setAttribute('loading', 'lazy')
  })
  const marked = new Marked({
    gfm: true,
    renderer: {
      code({ text, lang }: Tokens.Code) {
        const language = (lang ?? '').trim().split(/\s+/)[0]
        return [
          '<div class="code-block">',
          language ? `<span data-code-lang="">${escapeHtml(language)}</span>` : '',
          `<button type="button" data-copy-code="" aria-label="${escapeHtml(labels.copyCode)}">${escapeHtml(labels.copy)}</button>`,
          `<pre><code${language ? ` class="language-${escapeHtml(language)}"` : ''}>${escapeHtml(text)}</code></pre>`,
          '</div>\n',
        ].join('')
      },
    },
  })
  return (markdown) => purify.sanitize(marked.parse(markdown, { async: false }))
}

/** Hands a plain left click on a same-origin link to `navigate`; it returns whether it handled the URL. */
function onLinkClick(event: MouseEvent<HTMLDivElement>, navigate: (url: URL) => boolean) {
  const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href]')
  if (!anchor || anchor.target || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const url = new URL(anchor.href)
  if (url.origin === window.location.origin && navigate(url)) event.preventDefault()
}

/** Copies the `<pre>` next to a clicked copy button and shows the result on the button for a moment. */
function onCodeCopyClick(event: MouseEvent<HTMLDivElement>, labels: CodeLabels) {
  const button = (event.target as Element).closest<HTMLButtonElement>('[data-copy-code]')
  if (!button || !event.currentTarget.contains(button)) return
  const code = button.parentElement?.querySelector('pre')?.textContent ?? ''
  void copyText(code).then((ok) => {
    button.textContent = ok ? labels.copied : labels.failed
    button.toggleAttribute('data-copied', ok)
    setTimeout(() => {
      button.textContent = labels.copy
      button.removeAttribute('data-copied')
    }, COPIED_MS)
  })
}

const renderers = new Map<string, (markdown: string) => string>()

/** A rendered document body. `navigate` turns same-origin links into in-app navigation where it returns true. */
export function Markdown({ source, className, navigate }: { source: string; className?: string; navigate?: (url: URL) => boolean }) {
  const { t, language } = useText()
  const labels: CodeLabels = { copy: t('guide.copy.copy'), copied: t('guide.copy.copied'), failed: t('guide.copy.failed'), copyCode: t('guide.copy.code') }
  const html = useMemo(() => {
    let render = renderers.get(language)
    if (!render) {
      render = createMarkdownRenderer(window, labels)
      renderers.set(language, render)
    }
    return render(source)
    // `labels` depends only on `language`, which is a dependency.
  }, [source, language])
  return (
    <div
      className={cn('guide-prose', className)}
      onClick={(event) => {
        onCodeCopyClick(event, labels)
        if (navigate) onLinkClick(event, navigate)
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
