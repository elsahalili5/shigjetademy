import { Outlet, createFileRoute } from '@tanstack/react-router'
import { AuthShell } from '#/components/AuthShell'
import { requireGuest } from '#/lib/route-guard'

// Auth pages stand alone: no site nav or footer
export const Route = createFileRoute('/(auth)')({
  beforeLoad: ({ context }) => requireGuest(context.queryClient),
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <AuthShell>
      <Outlet />
    </AuthShell>
  )
}
