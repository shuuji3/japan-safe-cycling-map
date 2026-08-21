interface ImportMetaEnv {
  readonly BASE_URL: string
  readonly VITE_BICYCLE_ROADS_PMTILES_URL?: string
  readonly VITE_PROTOMAPS_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*?worker&url' {
  const src: string
  export default src
}

declare module '*.po' {
  import type { Messages } from '@lingui/core'
  export const messages: Messages
}
