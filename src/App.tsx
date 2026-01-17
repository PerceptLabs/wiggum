import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppProviders } from '@/contexts'
import { Home, Workspace } from '@/pages'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/project/:id" element={<Workspace />} />
          </Routes>
        </BrowserRouter>
      </AppProviders>
    </QueryClientProvider>
  )
}

export default App
