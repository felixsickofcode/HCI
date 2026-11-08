import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider, DocumentProvider } from './context'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <DocumentProvider>
        <App />
      </DocumentProvider>
    </AuthProvider>
  </StrictMode>,
)