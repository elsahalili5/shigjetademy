import { createFileRoute } from '@tanstack/react-router'
import { requirePlatformAdmin } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { ClientDetail } from '#/modules/organization/components/client-detail'

export const Route = createFileRoute('/dashboard/clients/$organizationId')({
  beforeLoad: ({ context }) => requirePlatformAdmin(context.queryClient),
  component: ClientPage,
})

function ClientPage() {
  useTitle('Client · Shigjetademy')
  const { organizationId } = Route.useParams()
  return <ClientDetail organizationId={organizationId} />
}
