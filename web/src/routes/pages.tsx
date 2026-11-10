// Page routes. Document slugs contain slashes (`apth/cookbook/apps`), so the
// document route is a splat under `/docs/`.
import { createRoute } from '@tanstack/react-router'
import { docQuery, llmsTxtQuery, skillsQuery } from '../api/queries'
import { DocPage } from '../features/docs/doc-page'
import { HomePage } from '../features/home/home-page'
import { LlmsPage } from '../features/llms/llms-page'
import { SkillsPage } from '../features/skills/skills-page'
import { START_HERE_SLUG } from '../model/docs'
import { notFoundOn404, rootRoute } from './root'

export const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  // Start here is optional: the page renders its own fallback when the release has none.
  loader: ({ context }) => context.queryClient.prefetchQuery(docQuery(START_HERE_SLUG, context.language)),
  component: HomePage,
})

export const docRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/docs/$',
  loader: ({ context, params }) => context.queryClient.ensureQueryData(docQuery(params._splat ?? '', context.language)).catch(notFoundOn404),
  component: function DocRoute() {
    const { _splat: slug = '' } = docRoute.useParams()
    return <DocPage key={slug} slug={slug} />
  },
})

export const skillsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/skills',
  loader: ({ context }) => context.queryClient.ensureQueryData(skillsQuery(context.language)),
  component: SkillsPage,
})

export const llmsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/llms',
  loader: ({ context }) => context.queryClient.ensureQueryData(llmsTxtQuery(context.language)),
  component: LlmsPage,
})

export const routeTree = rootRoute.addChildren([homeRoute, docRoute, skillsRoute, llmsRoute])
