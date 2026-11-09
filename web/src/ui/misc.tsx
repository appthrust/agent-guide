import type { ReactNode } from 'react'
import { cn } from './cn'

/**
 * Up to two initials: the first letters of the first two words of a Latin name
 * ("Ada Lovelace" → "AL"), else the first character ("山田 太郎" → "山").
 */
export function initialsOf(name: string): string {
  const words = name.trim().split(/[\s@._-]+/).filter(Boolean)
  const first = Array.from(words[0] ?? '')[0]
  if (!first) return '?'
  const second = Array.from(words[1] ?? '')[0]
  return /^[A-Za-z]$/.test(first) && second && /^[A-Za-z]$/.test(second) ? `${first}${second}`.toUpperCase() : first.toUpperCase()
}

/** The signed-in person's initials in a neutral circle. Decorative; the login is always shown next to it. */
export function Avatar({ name }: { name: string }) {
  return (
    <span aria-hidden className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong ring-1 ring-accent-line ring-inset">
      {initialsOf(name)}
    </span>
  )
}

export type BadgeTone = 'neutral' | 'accent' | 'teal' | 'amber'

const BADGE: Record<BadgeTone, string> = {
  neutral: 'bg-stone-100 text-stone-600 ring-stone-200',
  accent: 'bg-accent-soft text-accent-strong ring-accent-line',
  teal: 'bg-teal-50 text-teal-800 ring-teal-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
}

/** Small label next to a title (audience, phase, tag). */
export function Badge({ children, tone = 'neutral', className, title }: { children: ReactNode; tone?: BadgeTone; className?: string; title?: string }) {
  return (
    <span title={title} className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ring-1 ring-inset', BADGE[tone], className)}>
      {children}
    </span>
  )
}
