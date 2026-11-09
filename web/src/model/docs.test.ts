import { describe, expect, test } from 'bun:test'
import { mockDocs } from '../dev/mock-guide'
import { filterDocs, groupBySection, sectionFallbackLabel } from './docs'

describe('document navigation', () => {
  test('groups keep the server order of sections and documents', () => {
    const groups = groupBySection(mockDocs)
    expect(groups.map((group) => group.section)).toEqual(['start-here', 'apth', 'apthctl'])
    expect(groups[1].docs.map((doc) => doc.slug)).toEqual(['apth/install', 'apth/login-and-profiles', 'apth/cookbook/apps', 'apth/troubleshooting'])
  })

  test('the filter needs every term in the title, summary or tags, ignoring case', () => {
    expect(filterDocs(mockDocs, '').length).toBe(mockDocs.length)
    expect(filterDocs(mockDocs, 'DELIVERY_blocked').map((doc) => doc.slug)).toEqual(['apth/troubleshooting'])
    expect(filterDocs(mockDocs, 'apthctl  authority').map((doc) => doc.slug)).toEqual(['apthctl/overview'])
    expect(filterDocs(mockDocs, 'publish').map((doc) => doc.slug)).toEqual(['apth/cookbook/apps'])
    expect(filterDocs(mockDocs, 'kubernetes nothing')).toEqual([])
  })

  test('an unnamed section shows its id in words', () => {
    expect(sectionFallbackLabel('lessons')).toBe('Lessons')
    expect(sectionFallbackLabel('release_notes')).toBe('Release notes')
  })
})
