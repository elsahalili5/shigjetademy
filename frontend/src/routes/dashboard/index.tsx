import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionUser } from '#/lib/route-guard'
import { isPlatformAdmin } from '#/modules/auth/utils/get-home-path'

// The dashboard opens on the first module: Clients for the platform admin, Students for everyone else
export const Route = createFileRoute('/dashboard/')({
  beforeLoad: ({ context }) => {
    const user = getSessionUser(context.queryClient)
    const module = user && isPlatformAdmin(user) ? 'clients' : 'students'
    throw redirect({ to: '/dashboard/$module', params: { module } })
  },
})
