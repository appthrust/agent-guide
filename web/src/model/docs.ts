// Navigation over the document list: sections in server order, a free-text
// filter over titles and summaries.
import type { DocSummary } from '../api/guide'

export type DocSection = { section: string; docs: DocSummary[] }

/** The slug the home page renders above the Agent setup panel. */
export const START_HERE_SLUG = 'start-here'

/** Consecutive runs of one section, keeping the server's (section order, order, title) sort. */
export function groupBySection(docs: readonly DocSummary[]): DocSection[] {
  const groups: DocSection[] = []
  for (const doc of docs) {
    const last = groups.at(-1)
    if (last?.section === doc.section) last.docs.push(doc)
    else groups.push({ section: doc.section, docs: [doc] })
  }
  return groups
}

/** Every whitespace-separated term must appear in the title, summary or a tag (case-insensitive). */
export function filterDocs(docs: readonly DocSummary[], query: string): DocSummary[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return [...docs]
  return docs.filter((doc) => {
    const haystack = [doc.title, doc.summary, ...doc.tags].join('\n').toLowerCase()
    return terms.every((term) => haystack.includes(term))
  })
}

/** "lessons" → "Lessons", "start-here" → "Start here": the fallback label for a section the copy does not name. */
export function sectionFallbackLabel(section: string): string {
  const words = section.replaceAll(/[-_]+/g, ' ').trim()
  return words ? words[0].toUpperCase() + words.slice(1) : section
}
