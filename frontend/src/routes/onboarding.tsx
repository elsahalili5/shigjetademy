import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import type { CreateOrganizationInput } from '@shigjetademy/shared/organization'
import { getApiErrorMessage } from '#/lib/api-error-message'
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
      // The mutation keeps the error; the form shows it below
    }
  }

  const errorMessage = createOrganization.isError
    ? getApiErrorMessage(createOrganization.error, 'We couldn’t create your organization. Please try again.')
    : undefined

  return <CreateOrganization onCreate={handleCreate} errorMessage={errorMessage} />
}
