import { useSuspenseQuery } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { rawPaths } from '../../api/guide'
import { configQuery, llmsTxtQuery } from '../../api/queries'
import { useText } from '../../i18n'
import { llmsTxtCommand } from '../../model/commands'
import { buttonClasses, CodeBlock, PageHeader, Section, useDocumentTitle } from '../../ui'

/** `/llms`: the agent index exactly as an agent receives it, and the command that fetches it. */
export function LlmsPage() {
  const { t, language } = useText()
  useDocumentTitle('llms.txt')
  const { data: text } = useSuspenseQuery(llmsTxtQuery(language))
  const { data: config } = useSuspenseQuery(configQuery)
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="llms.txt"
        lead={t('guide.llms.lead')}
        actions={
          <>
            <RawLink href={rawPaths.llmsTxt(language)} label={t('guide.llms.open')} />
            <RawLink href={rawPaths.llmsFullTxt(language)} label={t('guide.llms.openFull')} />
          </>
        }
      />
      <Section title={t('guide.llms.fetchTitle')}>
        <CodeBlock code={llmsTxtCommand(config.publicUrl, language)} language="bash" />
      </Section>
      <Section title={t('guide.llms.contentTitle')}>
        <div lang={language}>
          <CodeBlock code={text} language="markdown" wrap />
        </div>
      </Section>
    </div>
  )
}

/** A server text route, opened as a plain document in a new tab. */
function RawLink({ href, label }: { href: string; label: string }) {
  const { t } = useText()
  return (
    <a href={href} target="_blank" rel="noopener" className={buttonClasses('secondary', 'sm')}>
      {label}
      <ExternalLink aria-hidden className="text-stone-400" />
      <span className="sr-only"> {t('guide.common.opensInNewTab')}</span>
    </a>
  )
}
