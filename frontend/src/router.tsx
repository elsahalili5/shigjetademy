import { createRouter } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { queryClient } from '#/api/query-client'
import { NotFound } from '#/components/NotFound'
import { SiteLayout } from '#/components/SiteLayout'
import { routeTree } from './routeTree.gen'

export type RouterContext = {
  queryClient: QueryClient
}

export const router = createRouter({
  routeTree,
  context: { queryClient },
  scrollRestoration: true,
  // Unknown addresses keep the site's nav and footer around the 404
  defaultNotFoundComponent: () => (
    <SiteLayout>
      <NotFound />
    </SiteLayout>
  ),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
