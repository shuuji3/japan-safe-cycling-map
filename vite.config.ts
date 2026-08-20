import { defineConfig } from 'vite-plus'
import react from '@vitejs/plugin-react-swc'
import { lingui } from '@lingui/vite-plugin'
import { linguiMacroSwcPlugin } from '@lingui/swc-plugin/options'

export default defineConfig({
  base: './',
  plugins: [
    react({
      plugins: [linguiMacroSwcPlugin()],
    }),
    lingui(),
  ],
  build: {
    outDir: 'dist',
  },
  fmt: {
    singleQuote: true,
    semi: false,
  },
})
