import { useQuery } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { ExternalLink, FileCode2, Languages } from 'lucide-react'
import { useState } from 'react'
import { rawPaths, type Doc } from '../../api/guide'
import { docQuery } from '../../api/queries'
import { useText } from '../../i18n'
import { isSpaPath } from '../../routes/paths'
import { Badge, Button, buttonClasses, CopyButton, LoadFailed, Markdown, Section } from '../../ui'
import { AudienceBadge, useSectionLabel } from './labels'

/**
 * A document: section and audience, title, summary, the copy/raw actions, the
 * body and its sources. In Japanese a translated document can be switched to
 * its English original (fetched on first use); an untranslated one says so.
 */
export function DocArticle({ doc: translated }: { doc: Doc }) {
  const { t, language } = useText()
  const sectionLabel = useSectionLabel()
  const router = useRouter()
  const hasOriginal = language !== 'en' && translated.lang !== 'en' && translated.availableLangs.includes('en')
  const [showOriginal, setShowOriginal] = useState(false)
  const original = useQuery({ ...docQuery(translated.slug, 'en'), enabled: hasOriginal && showOriginal })
  const doc = hasOriginal && showOriginal && original.data ? original.data : translated
  // Links between documents stay in the SPA; server text routes (`/md/…`, `/llms.txt`) load as documents.
  const navigate = (url: URL) => {
    if (!isSpaPath(url.pathname)) return false
    void router.navigate({ href: `${url.pathname}${url.search}${url.hash}` })
    return true
  }
  return (
    <article className="min-w-0">
      <header className="mb-6 border-b border-line pb-6">
        <p className="flex flex-wrap items-center gap-2 text-xs font-medium text-stone-500">
          <span>{sectionLabel(doc.section)}</span>
          <AudienceBadge audience={doc.audience} />
        </p>
        <h1 lang={doc.lang} className="mt-2 text-2xl font-semibold tracking-tight break-words text-stone-900">
          {doc.title}
        </h1>
        <p lang={doc.lang} className="mt-2 max-w-prose text-[15px] text-stone-600">
          {doc.summary}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <CopyButton text={doc.markdown} label={t('guide.doc.copyMarkdown')} />
          <a href={rawPaths.markdown(doc.slug, doc.lang)} target="_blank" rel="noopener" className={buttonClasses('ghost', 'sm')}>
            <FileCode2 aria-hidden />
            {t('guide.doc.raw')}
            <ExternalLink aria-hidden className="text-stone-400" />
            <span className="sr-only"> {t('guide.common.opensInNewTab')}</span>
          </a>
          {hasOriginal ? (
            <Button
              tone="ghost"
              size="sm"
              icon={<Languages />}
              aria-pressed={showOriginal}
              loading={showOriginal && original.isPending}
              onClick={() => setShowOriginal((shown) => !shown)}
            >
              {t(showOriginal ? 'guide.doc.showTranslation' : 'guide.doc.showOriginal')}
            </Button>
          ) : null}
          {doc.tags.length > 0 ? (
            <ul aria-label={t('guide.doc.tags')} className="flex flex-wrap gap-1.5 sm:ml-auto">
              {doc.tags.map((tag) => (
                <li key={tag}>
                  <Badge>{tag}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {language !== 'en' && translated.lang === 'en' ? <p className="mt-3 text-xs text-stone-500">{t('guide.doc.untranslated')}</p> : null}
      </header>
      {hasOriginal && showOriginal && original.isError ? (
        <div className="mb-6">
          <LoadFailed error={original.error} onRetry={() => void original.refetch()} />
        </div>
      ) : null}
      <div lang={doc.lang}>
        <Markdown source={doc.markdown} navigate={navigate} />
      </div>
      {doc.sources.length > 0 ? (
        <Section title={t('guide.doc.sources')} lead={t('guide.doc.sourcesLead')} className="mt-12 border-t border-line pt-6">
          <ul className="space-y-1.5 text-xs">
            {doc.sources.map((source) => (
              <li key={`${source.path}@${source.revision}`} className="flex flex-wrap items-baseline gap-x-2 font-mono text-stone-700">
                <span className="break-all">{source.path}</span>
                <span className="text-stone-400" title={source.revision}>
                  @{source.revision.slice(0, 12)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </article>
  )
}
