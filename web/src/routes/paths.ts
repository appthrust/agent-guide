// Every SPA URL. Documents keep their slug's slashes (`/docs/apth/cookbook/apps`).
import { slugPath } from '../api/guide'

export const paths = {
  home: '/',
  doc: (slug: string) => `/docs/${slugPath(slug)}`,
  skills: '/skills',
  llms: '/llms',
}

/**
 * Whether a same-origin path is an SPA page. `/skills/<name>/…`, `/md/…` and
 * `/llms.txt` are server text routes on the same origin and must load as documents.
 */
export function isSpaPath(pathname: string): boolean {
  return pathname === paths.home || pathname === paths.skills || pathname === paths.llms || /^\/docs\/.+/.test(pathname)
}
