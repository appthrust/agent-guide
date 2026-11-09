// Read-model loading (React Query). Every query is a `queryOptions()` factory
// so route loaders (`ensureQueryData`) and components share one key and
// fetcher. Content is release-versioned, so it stays fresh for the session.
import { QueryClient, queryOptions } from '@tanstack/react-query'
import { guideApi, GuideApiError } from './guide'

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

export const docsQuery = queryOptions({ queryKey: [...GUIDE_KEY, 'docs'], queryFn: () => guideApi.docs() })

export const docQuery = (slug: string) => queryOptions({ queryKey: [...GUIDE_KEY, 'docs', slug], queryFn: () => guideApi.doc(slug) })

export const skillsQuery = queryOptions({ queryKey: [...GUIDE_KEY, 'skills'], queryFn: () => guideApi.skills() })

export const llmsTxtQuery = queryOptions({ queryKey: [...GUIDE_KEY, 'llms.txt'], queryFn: () => guideApi.llmsTxt() })

/** The caller and the Project's apps; optional (403 for Access Key subjects, 503 when the Platform API fails), never retried. */
export const contextQuery = queryOptions({ queryKey: [...GUIDE_KEY, 'context'], queryFn: () => guideApi.context(), retry: false, staleTime: 60_000 })
