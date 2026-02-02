import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@wiggum/stack/styles/themes/neobrutalist.css'
import App from './App.tsx'
import { setupLogging } from '@/lib/logger'

// Initialize logging before React renders
setupLogging({ enableFingersCrossed: true, bufferSize: 50 })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
