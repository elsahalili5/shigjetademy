import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionMembership, getSessionUser } from '#/lib/route-guard'
import { isOrganizationOwner, isPlatformAdmin } from '#/modules/auth/utils/session-user'

// The dashboard opens on Clients for the platform admin, the Overview for the active organization's owner and Students for everyone else
export const Route = createFileRoute('/dashboard/')({
  beforeLoad: ({ context }) => {
    const user = getSessionUser(context.queryClient)
    if (user && isPlatformAdmin(user)) {
      throw redirect({ to: '/dashboard/$module', params: { module: 'clients' } })
    }
    if (isOrganizationOwner(getSessionMembership(context.queryClient))) {
      throw redirect({ to: '/dashboard/overview' })
    }
    throw redirect({ to: '/dashboard/$module', params: { module: 'students' } })
  },
})
