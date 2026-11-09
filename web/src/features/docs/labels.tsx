// Localized section names and the audience badge, shared by the navigation and document pages.
import type { Audience } from '../../api/guide'
import type { MessageId } from '../../copy'
import { useText } from '../../i18n'
import { sectionFallbackLabel } from '../../model/docs'
import { Badge, type BadgeTone } from '../../ui'

/** Sections of design.md's content tree; any other section shows its id, capitalized. */
const SECTION_LABELS: Record<string, MessageId> = {
  'start-here': 'guide.nav.home',
  apth: 'guide.section.apth',
  apthctl: 'guide.section.apthctl',
  concepts: 'guide.section.concepts',
  lessons: 'guide.section.lessons',
}

export function useSectionLabel(): (section: string) => string {
  const { t } = useText()
  return (section) => {
    const id = SECTION_LABELS[section]
    return id ? t(id) : sectionFallbackLabel(section)
  }
}

const AUDIENCE: Record<Audience, { label: MessageId; tone: BadgeTone }> = {
  developer: { label: 'guide.audience.developer', tone: 'accent' },
  operator: { label: 'guide.audience.operator', tone: 'amber' },
  both: { label: 'guide.audience.both', tone: 'neutral' },
}

/** Who a document is for: `developer` (apth), `operator` (apthctl) or both. */
export function AudienceBadge({ audience, className }: { audience: Audience; className?: string }) {
  const { t } = useText()
  const style = AUDIENCE[audience] ?? AUDIENCE.both
  const label = t(style.label)
  return (
    <Badge tone={style.tone} className={className} title={`${t('guide.audience.label')}: ${label}`}>
      <span className="sr-only">{t('guide.audience.label')}: </span>
      {label}
    </Badge>
  )
}
