import { createFileRoute } from '@tanstack/react-router'
import { useTitle } from '#/lib/use-title'
import { ProfilePage } from '#/modules/auth/components/profile-page'
import { useAuth } from '#/modules/auth/hooks/use-auth'

export const Route = createFileRoute('/dashboard/profile')({
  component: DashboardProfilePage,
})

function DashboardProfilePage() {
  useTitle('Your profile · Shigjetademy')
  const auth = useAuth()
  // The dashboard guard already requires a signed-in user
  if (auth.status !== 'authenticated') return null
  return <ProfilePage user={auth.user} />
}
