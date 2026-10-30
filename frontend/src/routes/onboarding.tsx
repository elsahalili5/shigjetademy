import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import type { CreateOrganizationInput } from '@shigjetademy/shared/organization'
import { requireAuthenticated } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { hasOrganization } from '#/modules/auth/utils/get-home-path'
import { CreateOrganization } from '#/modules/organization/components/create-organization'
import { useCreateOrganization } from '#/modules/organization/hooks/use-create-organization'

export const Route = createFileRoute('/onboarding')({
  beforeLoad: ({ context }) => {
    const user = requireAuthenticated(context.queryClient)
    if (hasOrganization(user)) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: OnboardingPage,
})

function OnboardingPage() {
  useTitle('Set up your organization · Shigjetademy')
  const createOrganization = useCreateOrganization()
  const navigate = useNavigate()

  const handleCreate = async (input: CreateOrganizationInput) => {
    try {
      await createOrganization.mutateAsync(input)
      await navigate({ to: '/dashboard' })
    } catch {
      // The form shows the mutation's error above its button and on the fields it names
    }
  }


  return <CreateOrganization onCreate={handleCreate} backendError={createOrganization.error} />
}
