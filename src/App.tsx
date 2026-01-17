import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border p-4">
          <h1 className="text-xl font-bold">Wiggum</h1>
          <p className="text-sm text-muted-foreground">
            Browser-based AI coding with the ralph command
          </p>
        </header>
        <main className="p-4">
          <p>Welcome to Wiggum - your browser-based AI coding assistant.</p>
        </main>
      </div>
    </QueryClientProvider>
  )
}

export default App
