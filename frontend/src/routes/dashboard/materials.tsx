import { Navigate, createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionMembership } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { MaterialsPage } from '#/modules/materials/components/materials-page'
import { isMaterialsMember } from '#/modules/materials/utils/permissions'

// The owner, school admins with Learning materials, lecturers and students use materials; everyone else goes back to their dashboard. Where each may share is decided by the server.
export const Route = createFileRoute('/dashboard/materials')({
  beforeLoad: ({ context }) => {
    if (!isMaterialsMember(getSessionMembership(context.queryClient))) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: DashboardMaterialsPage,
})

function DashboardMaterialsPage() {
  useTitle('Learning materials · Shigjetademy')
  const membership = useActiveMembership()
  // Switching to an organization where they can't, here or in another tab, sends them to its home
  if (!membership || !isMaterialsMember(membership)) return <Navigate to="/dashboard" />
  const { organization } = membership
  // Keyed by organization, so switching organizations starts from that organization's spaces
  return <MaterialsPage key={organization.id} organizationId={organization.id} organizationName={organization.name} />
}
