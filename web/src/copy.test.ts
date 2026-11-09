import { createDashboardTranslator } from '@appthrust/platform-dashboard-i18n'
import { describe, expect, test } from 'bun:test'
import { catalogs } from './copy'

const placeholders = (text: string) => [...text.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)].map((match) => match[1]).sort()

describe('Agent Guide copy catalogs', () => {
  const messages = catalogs.flatMap((catalog) => Object.entries(catalog))

  test('every message is namespaced, translated to Japanese and keeps its placeholders', () => {
    for (const [id, message] of messages) {
      expect(id.startsWith('guide.')).toBe(true)
      const ja = message.translations.ja
      expect(ja, id).toBeTruthy()
      expect(placeholders(ja ?? ''), id).toEqual(placeholders(message.defaultMessage))
    }
  })

  test('ids are unique, so both languages build a translator', () => {
    expect(new Set(messages.map(([id]) => id)).size).toBe(messages.length)
    const ja = createDashboardTranslator('ja', catalogs)
    const en = createDashboardTranslator('en', catalogs)
    expect(ja.t('guide.setup.title')).toBe('エージェントの設定')
    expect(en.t('guide.setup.title')).toBe('Agent setup')
    expect(ja.t('guide.setup.signedInAs', { login: 'hana@acme.example' })).toBe('hana@acme.example としてサインイン中')
    expect(en.t('guide.nav.matches', { count: 3 })).toBe('3 matching documents')
  })
})
