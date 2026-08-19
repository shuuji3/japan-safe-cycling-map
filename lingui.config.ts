import { defineConfig } from '@lingui/cli'

export default defineConfig({
  locales: ['ja', 'en'],
  sourceLocale: 'ja',
  fallbackLocales: {
    default: 'ja',
  },
  catalogs: [
    {
      path: 'src/locales/{locale}/messages',
      include: ['src'],
    },
  ],
})
