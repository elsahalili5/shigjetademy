import { Outlet, createFileRoute } from '@tanstack/react-router'
import { SiteLayout } from '#/components/SiteLayout'

export const Route = createFileRoute('/(app)')({
  component: AppLayout,
})

function AppLayout() {
  return (
    <SiteLayout>
      <Outlet />
    </SiteLayout>
  )
}
