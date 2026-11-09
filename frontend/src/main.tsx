import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider, DisplaySettingsProvider, DocumentProvider } from './context'
import '@fontsource/lexend/400.css'
import '@fontsource/opendyslexic/400.css'
import '@fontsource/merriweather/400.css'
import '@fontsource/merriweather/700.css'


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <DisplaySettingsProvider>
        <DocumentProvider>
          <App />
        </DocumentProvider>
      </DisplaySettingsProvider>
    </AuthProvider>
  </StrictMode>,
)