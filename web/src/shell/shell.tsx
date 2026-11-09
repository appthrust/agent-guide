import { AppSwitcher } from '@appthrust/app-launcher'
import { useRouterState } from '@tanstack/react-router'
import { BookOpenText, Bot, ChevronDown, FileText, House, Languages, Puzzle } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { setLanguage, useText } from '../i18n'
import { paths } from '../routes/paths'
import { Button, HrefLink } from '../ui'
import { DocNav } from './doc-nav'

const NAV_LINK =
  'flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 md:min-h-9 [&_svg]:size-4 [&_svg]:shrink-0'
const NAV_ACTIVE = { className: 'bg-accent-soft text-accent-strong hover:bg-accent-soft hover:text-accent-strong' }
// Below `sm` the section links show their icon and keep the label for screen readers and as a tooltip.
const NAV_LABEL = 'max-sm:sr-only'

/**
 * Top bar (brand, pages, language, the app switcher) over the document
 * navigation and the page. From `lg` the navigation is a sticky sidebar;
 * below it, a disclosure above the page that closes after each navigation.
 */
export function Shell({ children }: { children: ReactNode }) {
  const { t, language } = useText()
  const [query, setQuery] = useState('')
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const disclosure = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    if (disclosure.current) disclosure.current.open = false
  }, [pathname])
  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 min-h-10 content-center rounded-md bg-white px-3 py-2 text-sm font-medium shadow focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t('guide.nav.skipToMain')}
      </a>
      <header className="sticky top-0 z-10 border-b border-line bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex h-14 max-w-[90rem] items-center gap-1 px-3 sm:gap-2 sm:px-6">
          <HrefLink href={paths.home} className="mr-2 flex shrink-0 items-center gap-2.5 text-[15px] font-semibold tracking-tight text-stone-900">
            <span aria-hidden className="grid size-7 place-items-center rounded-md bg-accent text-white">
              <Bot className="size-4" />
            </span>
            <span className="hidden sm:inline">{t('guide.product')}</span>
          </HrefLink>
          <nav aria-label={t('guide.nav.label')} className="flex min-w-0 items-center gap-1">
            <HrefLink href={paths.home} title={t('guide.nav.home')} className={NAV_LINK} activeProps={NAV_ACTIVE}>
              <House aria-hidden />
              <span className={NAV_LABEL}>{t('guide.nav.home')}</span>
            </HrefLink>
            <HrefLink href={paths.skills} title={t('guide.nav.skills')} className={NAV_LINK} activeProps={NAV_ACTIVE}>
              <Puzzle aria-hidden />
              <span className={NAV_LABEL}>{t('guide.nav.skills')}</span>
            </HrefLink>
            <HrefLink href={paths.llms} title={t('guide.nav.llms')} className={NAV_LINK} activeProps={NAV_ACTIVE}>
              <FileText aria-hidden />
              <span className={NAV_LABEL}>{t('guide.nav.llms')}</span>
            </HrefLink>
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <Button
              tone="ghost"
              size="sm"
              icon={<Languages />}
              aria-label={`${t('guide.nav.language')}: ${t(language === 'ja' ? 'guide.language.en' : 'guide.language.ja')}`}
              onClick={() => setLanguage(language === 'ja' ? 'en' : 'ja')}
            >
              <span lang={language === 'ja' ? 'en' : 'ja'} className="hidden sm:inline">
                {t(language === 'ja' ? 'guide.language.en' : 'guide.language.ja')}
              </span>
            </Button>
            <AppSwitcher language={language} />
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-[90rem] gap-8 px-4 sm:px-6">
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-line py-6 pr-4 lg:block">
          <DocNav query={query} onQueryChange={setQuery} />
        </aside>
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 py-6 focus:outline-none md:py-8">
          <details ref={disclosure} className="group mb-6 rounded-lg border border-line bg-white lg:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-medium text-stone-800 [&::-webkit-details-marker]:hidden">
              <BookOpenText aria-hidden className="size-4 text-accent" />
              {t('guide.nav.documents')}
              <ChevronDown aria-hidden className="ml-auto size-4 text-stone-400 transition-transform group-open:rotate-180" />
            </summary>
            <DocNav query={query} onQueryChange={setQuery} className="border-t border-line px-3 py-4" />
          </details>
          {children}
        </main>
      </div>
    </div>
  )
}
