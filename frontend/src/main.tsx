import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/hanken-grotesk'
import '@fontsource/martian-mono/400.css'
import '@fontsource/martian-mono/500.css'
import './index.css'
import { queryClient } from '#/api/query-client'
import { router } from './router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
