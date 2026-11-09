import { createRouter } from '@tanstack/react-router'
import { queryClient } from './api/queries'
import { routeTree } from './routes/pages'
import { NotFound, RouteError, RoutePending } from './routes/root'

export const router = createRouter({
  routeTree,
  context: { queryClient },
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
