// All Agent Guide chrome wording, as dashboard-i18n catalogs: the English
// source is the `defaultMessage`, Japanese (the default display language) is
// `translations.ja`. Screens read it through `useText().t(id, values)`
// (src/i18n.tsx); no screen hardcodes user-facing text. Documents come from
// the server in the display language (`?lang=`), English when untranslated.
import type { DashboardMessageCatalog } from '@appthrust/platform-dashboard-i18n'
import { commonMessages } from './common'
import { guideMessages } from './guide'
import { setupMessages } from './setup'

export const catalogs: readonly DashboardMessageCatalog[] = [commonMessages, guideMessages, setupMessages]

export type MessageId = keyof typeof commonMessages | keyof typeof guideMessages | keyof typeof setupMessages
