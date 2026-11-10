import { useQuery } from '@tanstack/react-query'
import { isGuideError } from '../../api/guide'
import { docQuery } from '../../api/queries'
import { useText } from '../../i18n'
import { START_HERE_SLUG } from '../../model/docs'
import { Loading, LoadFailed, Notice, useDocumentTitle } from '../../ui'
import { DocArticle } from '../docs/doc-article'
import { AgentSetup } from '../setup/agent-setup'

/**
 * `/`: the Agent setup panel, then the Start here document. The panel spans
 * the content width so the commands it renders stay on one line where they
 * can. A release without a Start here document still gets the panel.
 */
export function HomePage() {
  const { t, language } = useText()
  useDocumentTitle(t('guide.nav.home'))
  const start = useQuery(docQuery(START_HERE_SLUG, language))
  return (
    <div className="max-w-4xl">
      <p className="mb-5 max-w-prose text-[15px] text-stone-600">{t('guide.home.lead')}</p>
      <AgentSetup />
      <div className="mt-10">
        {start.data ? (
          <DocArticle doc={start.data} />
        ) : start.isPending ? (
          <Loading />
        ) : isGuideError(start.error, 'not_found') ? (
          <Notice>{t('guide.home.noStartHere')}</Notice>
        ) : (
          <LoadFailed error={start.error} onRetry={() => void start.refetch()} />
        )}
      </div>
    </div>
  )
}
