import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/hanken-grotesk'
import '@fontsource/martian-mono/400.css'
import '@fontsource/martian-mono/500.css'
import './index.css'
import { queryClient } from '#/api/query-client'
import { AuthProvider } from '#/modules/auth/components/auth-provider'
import { RouterProvider } from '@tanstack/react-router'
import { Toaster } from 'react-hot-toast'
import { router } from './router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: 'var(--white)', color: 'var(--ink)', borderRadius: '14px', fontFamily: 'var(--sans)', fontWeight: 550, boxShadow: 'var(--shadow-card)' },
            error: { iconTheme: { primary: 'var(--coral-deep)', secondary: 'var(--white)' } },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
