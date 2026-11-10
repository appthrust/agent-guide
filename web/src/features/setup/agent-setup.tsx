// The home page's Agent setup panel: who is signed in, the apth login for this
// environment, and the agent key bootstrap. The key is created by the
// person's own apth login (see src/api/platform.ts for why the SPA cannot call
// the Platform API); the label lives only in component state.
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { KeyRound, RotateCcw } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { ContextInstallation, GuideConfig } from '../../api/guide'
import { agentBootstrapScript, agentKeyRequest } from '../../api/platform'
import { configQuery, contextQuery } from '../../api/queries'
import { useText } from '../../i18n'
import { loginCommand } from '../../model/commands'
import { Avatar, Badge, Button, CodeBlock, Field, Notice, TextInput, type BadgeTone } from '../../ui'

/** The panel's anchor, linked from the skills page ("get an assertion"). */
export const AGENT_SETUP_ID = 'agent-setup'

const PHASE_TONE: Record<string, BadgeTone> = { Ready: 'teal', Installing: 'accent', Upgrading: 'accent', Degraded: 'amber' }

export function AgentSetup() {
  const { t } = useText()
  const { data: config } = useSuspenseQuery(configQuery)
  const headingId = useId()
  return (
    <section id={AGENT_SETUP_ID} aria-labelledby={headingId} className="scroll-mt-20 rounded-xl border border-line bg-white shadow-xs">
      <div className="border-b border-line px-5 py-4">
        <h2 id={headingId} className="flex items-center gap-2 text-base font-semibold text-stone-900">
          <KeyRound aria-hidden className="size-4 text-accent" />
          {t('guide.setup.title')}
        </h2>
        <p className="mt-1 text-sm text-stone-500">{t('guide.setup.lead')}</p>
      </div>
      <SessionSummary config={config} />
      <ol className="divide-y divide-line">
        <Step number={1} title={t('guide.setup.loginTitle')} body={t('guide.setup.loginBody')}>
          <CodeBlock code={loginCommand(config)} language="bash" wrap />
        </Step>
        <Step number={2} title={t('guide.setup.keyTitle')} body={t('guide.setup.keyBody')}>
          <AgentKeyForm config={config} />
        </Step>
      </ol>
    </section>
  )
}

/**
 * The environment, plus the caller and the Project's apps when `/context`
 * answers. Access Key subjects (403) and a failing Platform API (503) simply
 * get no caller block; the setup steps work without it.
 */
function SessionSummary({ config }: { config: GuideConfig }) {
  const { t } = useText()
  const { data: context } = useQuery(contextQuery)
  return (
    <div className="flex flex-wrap items-start gap-x-10 gap-y-4 border-b border-line bg-canvas/60 px-5 py-4">
      {context ? (
        <div className="flex max-w-full min-w-0 items-center gap-3">
          <Avatar name={context.me.login} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-stone-900">{t('guide.setup.signedInAs', { login: context.me.login })}</p>
            <p className="text-xs text-stone-500">{t('guide.setup.role', { role: context.me.role })}</p>
          </div>
        </div>
      ) : null}
      <dl className="grid max-w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-xs">
        <dt className="text-stone-500">{t('guide.setup.project')}</dt>
        <dd className="truncate font-mono text-stone-800">{config.projectId}</dd>
        <dt className="text-stone-500">{t('guide.setup.platformApi')}</dt>
        <dd className="truncate font-mono text-stone-800">{config.platformApiUrl}</dd>
        <dt className="text-stone-500">{t('guide.setup.release')}</dt>
        <dd className="truncate font-mono text-stone-800">{config.releaseVersion}</dd>
      </dl>
      {context && context.installations.length > 0 ? <Installations installations={context.installations} /> : null}
    </div>
  )
}

function Installations({ installations }: { installations: ContextInstallation[] }) {
  const { t } = useText()
  const headingId = useId()
  return (
    <div>
      <h3 id={headingId} className="text-xs font-medium text-stone-500">
        {t('guide.setup.apps')}
      </h3>
      <ul aria-labelledby={headingId} className="mt-1.5 flex flex-wrap gap-1.5">
        {installations.map((installation) => (
          <li key={installation.name}>
            <a
              href={installation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-line bg-white px-2 text-xs text-stone-700 hover:border-stone-300 hover:text-stone-900"
            >
              <span className="font-medium">{installation.name}</span>
              <span className="font-mono text-stone-400">{installation.version}</span>
              <Badge tone={PHASE_TONE[installation.phase] ?? 'neutral'}>{installation.phase}</Badge>
              <span className="sr-only">{t('guide.common.opensInNewTab')}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Step({ number, title, body, children }: { number: number; title: string; body: string; children: ReactNode }) {
  return (
    <li className="flex gap-3 px-5 py-4">
      <span aria-hidden className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong ring-1 ring-accent-line ring-inset">
        {number}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
        <p className="mt-0.5 text-sm text-stone-500">{body}</p>
        <div className="mt-3">{children}</div>
      </div>
    </li>
  )
}

const LABEL_MAX = 100

/** Label in, paste-once bootstrap out. Submitting never sends anything anywhere. */
export function AgentKeyForm({ config }: { config: Pick<GuideConfig, 'projectId' | 'publicUrl'> }) {
  const { t, language } = useText()
  const inputId = useId()
  const [label, setLabel] = useState('')
  const [invalid, setInvalid] = useState(false)
  const [created, setCreated] = useState<string | null>(null)
  const resultHeading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (created !== null) resultHeading.current?.focus()
  }, [created])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!label.trim()) {
      setInvalid(true)
      return
    }
    setCreated(label.trim())
  }

  if (created !== null) {
    return (
      <div className="space-y-3">
        <Notice tone="warning" role="note" title={t('guide.setup.onceTitle')}>
          {t('guide.setup.onceBody')}
        </Notice>
        <h4 ref={resultHeading} tabIndex={-1} className="text-sm font-medium text-stone-800 focus:outline-none">
          {t('guide.setup.blockTitle')}
        </h4>
        <CodeBlock
          code={agentBootstrapScript(config, agentKeyRequest(created), {
            lang: language,
            comments: { create: t('guide.setup.scriptCreate'), exchange: t('guide.setup.scriptExchange'), read: t('guide.setup.scriptRead') },
          })}
          language="bash"
          wrap
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-stone-500">{t('guide.setup.whyCommand')}</p>
          <Button
            size="sm"
            tone="ghost"
            icon={<RotateCcw />}
            onClick={() => {
              setCreated(null)
              setLabel('')
            }}
          >
            {t('guide.setup.another')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form noValidate onSubmit={submit} className="space-y-3">
      <Field id={inputId} label={t('guide.setup.labelField')} hint={t('guide.setup.labelHint')} error={invalid ? t('guide.setup.labelRequired') : undefined} required>
        <TextInput
          id={inputId}
          name="label"
          value={label}
          maxLength={LABEL_MAX}
          autoComplete="off"
          spellCheck={false}
          placeholder="claude-code-laptop"
          invalid={invalid}
          required
          onChange={(event) => {
            setLabel(event.target.value)
            if (invalid && event.target.value.trim()) setInvalid(false)
          }}
        />
      </Field>
      <Button type="submit" tone="primary" icon={<KeyRound />}>
        {t('guide.setup.create')}
      </Button>
    </form>
  )
}
