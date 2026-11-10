import { createRouter } from '@tanstack/react-router'
import { queryClient } from './api/queries'
import { currentLanguage } from './i18n'
import { routeTree } from './routes/pages'
import { NotFound, RouteError, RoutePending } from './routes/root'

export const router = createRouter({
  routeTree,
  // `language` follows the display language: LocalizedRouter (main.tsx) passes it on every render.
  context: { queryClient, language: currentLanguage() },
  defaultPreload: 'intent',
  // Loaders read through React Query, which owns freshness.
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  defaultPendingMs: 150,
  defaultPendingComponent: RoutePending,
  defaultErrorComponent: RouteError,
  defaultNotFoundComponent: NotFound,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
