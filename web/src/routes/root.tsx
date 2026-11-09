import { useQueryErrorResetBoundary, type QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, notFound, Outlet, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { FileQuestion } from 'lucide-react'
import { useEffect } from 'react'
import { isGuideError } from '../api/guide'
import { configQuery, docsQuery } from '../api/queries'
import { useText } from '../i18n'
import { Shell } from '../shell/shell'
import { EmptyState, LinkButton, Loading, LoadFailed, useDocumentTitle } from '../ui'
import { paths } from './paths'

export type RouterContext = { queryClient: QueryClient }

/** Loader helper: an unknown document renders the not-found page instead of an error. */
export function notFoundOn404(error: unknown): never {
  if (isGuideError(error, 'not_found')) throw notFound()
  throw error
}

export function NotFound() {
  const { t } = useText()
  useDocumentTitle(t('guide.notFound.title'))
  return (
    <div className="mx-auto max-w-md py-12">
      <EmptyState
        icon={<FileQuestion />}
        heading="h1"
        title={t('guide.notFound.title')}
        body={t('guide.notFound.body')}
        action={
          <LinkButton href={paths.home} tone="primary">
            {t('guide.notFound.home')}
          </LinkButton>
        }
      />
    </div>
  )
}

/** In-page load failure (inside the shell). Retry re-runs the loaders and resets failed suspense queries. */
export function RouteError({ error }: ErrorComponentProps) {
  const router = useRouter()
  const queryErrorResetBoundary = useQueryErrorResetBoundary()
  useEffect(() => queryErrorResetBoundary.reset(), [queryErrorResetBoundary])
  if (isGuideError(error, 'not_found')) return <NotFound />
  return (
    <div className="mx-auto max-w-xl py-8">
      <LoadFailed error={error} onRetry={() => void router.invalidate()} />
    </div>
  )
}

export function RoutePending() {
  return <Loading />
}

/** The environment or the document list could not be loaded: there is no shell yet. */
function RootError(props: ErrorComponentProps) {
  const { t } = useText()
  useDocumentTitle(t('guide.common.loadFailed'))
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <RouteError {...props} />
    </div>
  )
}

function RootPending() {
  return (
    <div className="mx-auto flex max-w-xl justify-center px-6 py-24">
      <Loading />
    </div>
  )
}

export const rootRoute = createRootRouteWithContext<RouterContext>()({
  // The shell's navigation and every command need the environment and the document list.
  beforeLoad: ({ context }) => Promise.all([context.queryClient.ensureQueryData(configQuery), context.queryClient.ensureQueryData(docsQuery)]),
  component: () => (
    <Shell>
      <Outlet />
    </Shell>
  ),
  errorComponent: RootError,
  pendingComponent: RootPending,
  notFoundComponent: NotFound,
})
