// Copy to the clipboard with visible feedback. Text is copied straight from
// what the page shows; nothing is written to storage.
import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useText } from '../i18n'
import { Button, type ButtonSize, type ButtonTone } from './button'
import { cn } from './cn'

export type CopyState = 'idle' | 'copied' | 'failed'

/** How long "Copied" stays before the button reads "Copy" again. */
export const COPIED_MS = 2000

const STATE_MESSAGE = { copied: 'guide.copy.copied', failed: 'guide.copy.failed' } as const

/** `navigator.clipboard` needs a secure context and permission; a refusal is reported, never thrown. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function useCopy(): { state: CopyState; copy: (text: string) => void } {
  const [state, setState] = useState<CopyState>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  return {
    state,
    copy: (text) => {
      void copyText(text).then((ok) => {
        setState(ok ? 'copied' : 'failed')
        clearTimeout(timer.current)
        timer.current = setTimeout(() => setState('idle'), COPIED_MS)
      })
    },
  }
}

/** Announces the copy result to screen readers; the button label shows it visually. */
function CopyStatus({ state }: { state: CopyState }) {
  const { t } = useText()
  return (
    <span className="sr-only" aria-live="polite">
      {state === 'idle' ? '' : t(STATE_MESSAGE[state])}
    </span>
  )
}

/** A labelled button ("Copy as Markdown") that switches to "Copied" for a moment. */
export function CopyButton({ text, label, tone = 'secondary', size = 'sm', className }: { text: string; label?: string; tone?: ButtonTone; size?: ButtonSize; className?: string }) {
  const { t } = useText()
  const { state, copy } = useCopy()
  return (
    <>
      <Button tone={tone} size={size} icon={state === 'copied' ? <Check /> : <Copy />} onClick={() => copy(text)} className={className}>
        {state === 'idle' ? (label ?? t('guide.copy.copy')) : t(STATE_MESSAGE[state])}
      </Button>
      <CopyStatus state={state} />
    </>
  )
}

/**
 * A dark command block with its copy button in the corner, styled like the
 * code blocks inside rendered documents (`.code-block` in styles.css).
 * `wrap` folds long commands for narrow columns; the copied text is unchanged.
 */
export function CodeBlock({ code, language, className, label, wrap = false }: { code: string; language?: string; className?: string; label?: string; wrap?: boolean }) {
  const { t } = useText()
  const { state, copy } = useCopy()
  return (
    <div className={cn('code-block', className)}>
      {language ? <span data-code-lang>{language}</span> : null}
      <button type="button" data-copy-code data-copied={state === 'copied' ? '' : undefined} aria-label={label ?? t('guide.copy.code')} onClick={() => copy(code)}>
        <span aria-hidden className="mr-1 inline-flex [&_svg]:size-3.5">
          {state === 'copied' ? <Check /> : <Copy />}
        </span>
        {state === 'idle' ? t('guide.copy.copy') : t(STATE_MESSAGE[state])}
      </button>
      <CopyStatus state={state} />
      <pre className={wrap ? 'whitespace-pre-wrap [overflow-wrap:anywhere]' : undefined}>
        <code>{code}</code>
      </pre>
    </div>
  )
}
