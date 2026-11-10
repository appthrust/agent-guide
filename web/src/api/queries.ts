// Read-model loading (React Query). Every query is a `queryOptions()` factory
// so route loaders (`ensureQueryData`) and components share one key and
// fetcher. Content is release-versioned, so it stays fresh for the session.
// Content queries are keyed by the display language: each language reads its
// own variant (`?lang=`), and switching back reuses the cached one.
import { QueryClient, queryOptions } from '@tanstack/react-query'
import { guideApi, GuideApiError, type Lang } from './guide'

/** Retries for a call nothing answered (rollout gap, network blip). */
const TRANSIENT_RETRIES = 3

/** Any answer with a status (4xx, coded 5xx) is final; unanswered calls are retried with backoff. */
export const retryQuery = (failureCount: number, error: unknown) =>
  error instanceof GuideApiError && !error.transient ? false : failureCount < TRANSIENT_RETRIES

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: retryQuery, retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000), staleTime: 5 * 60_000 },
  },
})

const GUIDE_KEY = ['agent-guide'] as const

export const configQuery = queryOptions({ queryKey: [...GUIDE_KEY, 'config'], queryFn: () => guideApi.config(), staleTime: Infinity })

export const docsQuery = (lang: Lang) => queryOptions({ queryKey: [...GUIDE_KEY, lang, 'docs'], queryFn: () => guideApi.docs(lang) })

export const docQuery = (slug: string, lang: Lang) => queryOptions({ queryKey: [...GUIDE_KEY, lang, 'docs', slug], queryFn: () => guideApi.doc(slug, lang) })

export const skillsQuery = (lang: Lang) => queryOptions({ queryKey: [...GUIDE_KEY, lang, 'skills'], queryFn: () => guideApi.skills(lang) })

export const llmsTxtQuery = (lang: Lang) => queryOptions({ queryKey: [...GUIDE_KEY, lang, 'llms.txt'], queryFn: () => guideApi.llmsTxt(lang) })

/** The caller and the Project's apps; optional (403 for Access Key subjects, 503 when the Platform API fails), never retried. */
export const contextQuery = queryOptions({ queryKey: [...GUIDE_KEY, 'context'], queryFn: () => guideApi.context(), retry: false, staleTime: 60_000 })
