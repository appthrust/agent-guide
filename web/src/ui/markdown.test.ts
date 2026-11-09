import { describe, expect, test } from 'bun:test'
import { JSDOM } from 'jsdom'
import { createMarkdownRenderer } from './markdown'

// DOMPurify's documented server-side DOM; the browser passes its own `window`.
const { window } = new JSDOM('', { url: 'https://agent-guide.pj-1.acme.example/docs/start-here' })
const render = createMarkdownRenderer(window as unknown as Parameters<typeof createMarkdownRenderer>[0], {
  copy: 'Copy',
  copied: 'Copied',
  failed: "Couldn't copy",
  copyCode: 'Copy code',
})

describe('document Markdown rendering', () => {
  test('renders GFM and strips script, event handlers and javascript: URLs', () => {
    const html = render(['# Title', '**bold** and `code`', '| a | b |\n| --- | --- |\n| 1 | 2 |', '<script>alert(1)</script>', '<img src="x.png" onerror="alert(2)">', '[bad](javascript:alert(3))'].join('\n\n'))
    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<code>code</code>')
    expect(html).toContain('<td>1</td>')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('onerror')
    expect(html).not.toContain('javascript:')
    expect(html).toContain('loading="lazy"')
  })

  test('fenced code gets a language tag and a copy button, with the code escaped', () => {
    const html = render('```bash\necho "<b>hi</b>" && apth whoami\n```')
    expect(html).toContain('<div class="code-block">')
    expect(html).toContain('<span data-code-lang="">bash</span>')
    expect(html).toContain('<button type="button" data-copy-code="" aria-label="Copy code">Copy</button>')
    expect(html).toContain('<pre><code class="language-bash">echo "&lt;b&gt;hi&lt;/b&gt;" &amp;&amp; apth whoami</code></pre>')
  })

  test('code nested in a list keeps its copy button', () => {
    expect(render('1. Run:\n\n   ```\n   apth login\n   ```\n')).toContain('data-copy-code')
  })

  test('other sites open in a new tab without the opener; this app’s routes stay in place', () => {
    const external = render('[docs](https://example.com/guide)')
    expect(external).toContain('target="_blank"')
    expect(external).toContain('rel="noopener noreferrer"')
    const internal = render('[next](/docs/apth/install) and [self](https://agent-guide.pj-1.acme.example/llms.txt)')
    expect(internal).toContain('href="/docs/apth/install"')
    expect(internal).not.toContain('target=')
  })
})
