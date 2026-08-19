import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nProvider } from '@lingui/react'
import { Map } from './map/map'
import { i18n } from './i18n'
import './styles/index.css'

const rootElement = document.getElementById('root')
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <I18nProvider i18n={i18n}>
        <Map />
      </I18nProvider>
    </StrictMode>,
  )
}
