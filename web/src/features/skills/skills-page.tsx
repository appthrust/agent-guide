import { useSuspenseQuery } from '@tanstack/react-query'
import { ExternalLink, Puzzle } from 'lucide-react'
import { useId } from 'react'
import { rawPaths, type Lang, type Skill } from '../../api/guide'
import { configQuery, skillsQuery } from '../../api/queries'
import { useText } from '../../i18n'
import { skillInstallScript } from '../../model/commands'
import { paths } from '../../routes/paths'
import { Badge, buttonClasses, CodeBlock, EmptyState, HrefLink, PageHeader, useDocumentTitle } from '../../ui'
import { AGENT_SETUP_ID } from '../setup/agent-setup'

export function SkillsPage() {
  const { t, language } = useText()
  useDocumentTitle(t('guide.nav.skills'))
  const { data: skills } = useSuspenseQuery(skillsQuery(language))
  const { data: config } = useSuspenseQuery(configQuery)
  return (
    <div className="max-w-4xl">
      <PageHeader
        title={t('guide.nav.skills')}
        lead={
          <>
            {t('guide.skills.lead')}{' '}
            <HrefLink href={`${paths.home}#${AGENT_SETUP_ID}`} className="font-medium text-accent-strong underline decoration-accent-line underline-offset-2 hover:decoration-accent">
              {t('guide.skills.setupLink')}
            </HrefLink>
          </>
        }
      />
      {skills.length === 0 ? (
        <EmptyState icon={<Puzzle />} title={t('guide.skills.empty')} />
      ) : (
        <ul className="space-y-4">
          {skills.map((skill) => (
            <li key={skill.name}>
              <SkillCard skill={skill} publicUrl={config.publicUrl} lang={language} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** `lang` is the display language: the link and the snippet fetch that variant. */
function SkillCard({ skill, publicUrl, lang }: { skill: Skill; publicUrl: string; lang: Lang }) {
  const { t } = useText()
  const headingId = useId()
  const skillUrl = rawPaths.skillFile(skill.name, 'SKILL.md', skill.lang)
  return (
    <article aria-labelledby={headingId} className="rounded-xl border border-line bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={headingId} className="flex items-center gap-2 font-mono text-[15px] font-semibold text-stone-900">
            <Puzzle aria-hidden className="size-4 shrink-0 text-accent" />
            {skill.name}
          </h2>
          <p lang={skill.lang} className="mt-1 max-w-prose text-sm text-stone-600">
            {skill.description}
          </p>
        </div>
        <a href={skillUrl} target="_blank" rel="noopener" className={buttonClasses('secondary', 'sm')}>
          {t('guide.skills.openSkill')}
          <ExternalLink aria-hidden className="text-stone-400" />
          <span className="sr-only"> {t('guide.common.opensInNewTab')}</span>
        </a>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
        <span>{t('guide.skills.files')}:</span>
        {skill.files.map((file) => (
          <Badge key={file} className="font-mono">
            {file}
          </Badge>
        ))}
      </div>
      <h3 className="mt-4 mb-2 text-xs font-medium text-stone-500">{t('guide.skills.install')}</h3>
      <CodeBlock code={skillInstallScript(publicUrl, skill, lang)} language="bash" />
    </article>
  )
}
