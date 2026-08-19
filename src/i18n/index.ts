import { i18n } from '@lingui/core'
import { messages as enMessages } from '../locales/en/messages.po'
import { messages as jaMessages } from '../locales/ja/messages.po'

// Lingui 6 derives plural rules from Intl.PluralRules automatically, so no
// manual loadLocaleData is needed.
i18n.load({ ja: jaMessages, en: enMessages })
i18n.activate('ja')

export { i18n }
