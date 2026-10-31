import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import type { CreateOrganizationInput } from '@shigjetademy/shared/organization'
import { requireAuthenticated } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { hasOrganization } from '#/modules/auth/utils/session-user'
import { CreateOrganization } from '#/modules/organization/components/create-organization'
import { useCreateOrganization } from '#/modules/organization/hooks/use-create-organization'

// For people who already belong to an organization; a first organization is created during onboarding
export const Route = createFileRoute('/organizations/new')({
  beforeLoad: ({ context }) => {
    const user = requireAuthenticated(context.queryClient)
    if (!hasOrganization(user)) {
      throw redirect({ to: '/onboarding' })
    }
  },
  component: NewOrganizationPage,
})

function NewOrganizationPage() {
  useTitle('Create another organization · Shigjetademy')
  const createOrganization = useCreateOrganization()
  const navigate = useNavigate()

  const handleCreate = (input: CreateOrganizationInput) => {
    createOrganization.mutate(input, { onSuccess: () => void navigate({ to: '/dashboard/overview' }) })
  }

  // A server error belongs to the values that were sent; editing them clears it
  const handleEdit = () => {
    if (createOrganization.isError) createOrganization.reset()
  }

  return <CreateOrganization variant="another" onCreate={handleCreate} onEdit={handleEdit} isPending={createOrganization.isPending} backendError={createOrganization.error} />
}
