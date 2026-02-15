import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppProviders } from '@/contexts'
import { PWAUpdatePrompt } from '@/components/PWAUpdatePrompt'
import {
  Home,
  Workspace,
  Settings,
  GeneralSettings,
  IntegrationsSettings,
  AdvancedSettings,
} from '@/pages'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <div data-theme="neobrutalist" className="contents">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/project/:id" element={<Workspace />} />
              <Route path="/settings" element={<Settings />}>
                <Route index element={<GeneralSettings />} />
                <Route path="integrations" element={<IntegrationsSettings />} />
                <Route path="advanced" element={<AdvancedSettings />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <PWAUpdatePrompt />
        </div>
      </AppProviders>
    </QueryClientProvider>
  )
}

export default App
