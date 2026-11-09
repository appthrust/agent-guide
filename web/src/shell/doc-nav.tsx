// Left navigation: every document grouped by section with its audience, and a
// filter over titles, summaries and tags.
import { useSuspenseQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { useDeferredValue, useId } from 'react'
import { docsQuery } from '../api/queries'
import { AudienceBadge, useSectionLabel } from '../features/docs/labels'
import { useText } from '../i18n'
import { filterDocs, groupBySection } from '../model/docs'
import { paths } from '../routes/paths'
import { cn, controlClasses, HrefLink } from '../ui'

const DOC_LINK = 'group flex min-h-9 items-start justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm text-stone-700 hover:bg-stone-100 hover:text-stone-900'
const DOC_ACTIVE = { className: 'bg-accent-soft text-accent-strong hover:bg-accent-soft hover:text-accent-strong font-medium' }

/** `query` is owned by the shell so it survives navigation between documents. */
export function DocNav({ query, onQueryChange, className }: { query: string; onQueryChange: (query: string) => void; className?: string }) {
  const { t } = useText()
  const sectionLabel = useSectionLabel()
  const { data: docs } = useSuspenseQuery(docsQuery)
  const deferredQuery = useDeferredValue(query)
  const matches = filterDocs(docs, deferredQuery)
  const filtering = deferredQuery.trim() !== ''
  const inputId = useId()
  const navId = useId()
  return (
    <div className={className}>
      <label htmlFor={inputId} className="sr-only">
        {t('guide.nav.filter')}
      </label>
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-stone-400" />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t('guide.nav.filterPlaceholder')}
          aria-controls={navId}
          autoComplete="off"
          className={cn(controlClasses, 'h-10 w-full pr-9 pl-8 md:h-9 [&::-webkit-search-cancel-button]:hidden')}
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            aria-label={t('guide.nav.clearFilter')}
            title={t('guide.nav.clearFilter')}
            className="absolute top-1/2 right-1 grid size-8 -translate-y-1/2 place-items-center rounded text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X aria-hidden className="size-4" />
          </button>
        ) : null}
      </div>
      <p aria-live="polite" className={cn('mt-2 px-1 text-xs text-stone-500', filtering ? undefined : 'sr-only')}>
        {filtering ? (matches.length === 0 ? t('guide.nav.noMatches', { query: deferredQuery.trim() }) : t('guide.nav.matches', { count: matches.length })) : ''}
      </p>
      <nav id={navId} aria-label={t('guide.nav.documents')} className="mt-3">
        {groupBySection(matches).map((group) => (
          <div key={group.section} className="mb-5">
            <h2 className="mb-1 px-2.5 text-[11px] font-semibold tracking-wide text-stone-500 uppercase">{sectionLabel(group.section)}</h2>
            <ul>
              {group.docs.map((doc) => (
                <li key={doc.slug}>
                  <HrefLink href={paths.doc(doc.slug)} className={DOC_LINK} activeProps={DOC_ACTIVE} title={doc.summary}>
                    <span lang="en" className="min-w-0 break-words">
                      {doc.title}
                    </span>
                    <AudienceBadge audience={doc.audience} className="mt-0.5 shrink-0" />
                  </HrefLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  )
}
