import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionUser } from '#/lib/route-guard'
import { getOwnedOrganization, isPlatformAdmin } from '#/modules/auth/utils/session-user'

// The dashboard opens on Clients for the platform admin, the Overview for an owner and Students for everyone else
export const Route = createFileRoute('/dashboard/')({
  beforeLoad: ({ context }) => {
    const user = getSessionUser(context.queryClient)
    if (user && isPlatformAdmin(user)) {
      throw redirect({ to: '/dashboard/$module', params: { module: 'clients' } })
    }
    if (user && getOwnedOrganization(user)) {
      throw redirect({ to: '/dashboard/overview' })
    }
    throw redirect({ to: '/dashboard/$module', params: { module: 'students' } })
  },
})
