import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionMembership, getSessionUser } from '#/lib/route-guard'
import { isOrganizationOwner, isPlatformAdmin } from '#/modules/auth/utils/session-user'
import { isStudentsManager } from '#/modules/students/utils/permissions'

// The dashboard opens on Clients for the platform admin, the Overview for the active organization's owner, Students for school admins
// who keep student records, and the calendar, which every member reads, for everyone else
export const Route = createFileRoute('/dashboard/')({
  beforeLoad: ({ context }) => {
    const user = getSessionUser(context.queryClient)
    if (user && isPlatformAdmin(user)) {
      throw redirect({ to: '/dashboard/$module', params: { module: 'clients' } })
    }
    const membership = getSessionMembership(context.queryClient)
    if (isOrganizationOwner(membership)) {
      throw redirect({ to: '/dashboard/overview' })
    }
    if (isStudentsManager(membership)) {
      throw redirect({ to: '/dashboard/students' })
    }
    throw redirect({ to: '/dashboard/academic-periods' })
  },
})
