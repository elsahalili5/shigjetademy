import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AuthUser } from '@shigjetademy/shared/auth'
import type { OrganizationSettings } from '@shigjetademy/shared/organization-settings'
import { ME_QUERY_KEY } from '#/modules/auth/hooks/use-me-query'
import { organizationSettingsApi } from '../api/organization-settings-api'
import { organizationSettingsQueryKey } from './use-organization-settings'

type WithOrganizationSettingsParams = {
  user: AuthUser | null | undefined
  organizationId: string
  saved: OrganizationSettings
}

/** The signed-in user with the saved settings on that organization's membership */
const withOrganizationSettings = ({ user, organizationId, saved }: WithOrganizationSettingsParams) =>
  user && {
    ...user,
    memberships: user.memberships.map((membership) =>
      membership.organization.id === organizationId ? { ...membership, organization: { ...membership.organization, ...saved } } : membership,
    ),
  }

// The saved settings replace the cached ones, and the session's copy too, so dates across the dashboard follow the new format at once
export function useUpdateOrganizationSettings(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: organizationSettingsApi.update,
    onSuccess: (saved) => {
      queryClient.setQueryData(organizationSettingsQueryKey(organizationId), saved)
      queryClient.setQueryData<AuthUser | null>(ME_QUERY_KEY, (user) => withOrganizationSettings({ user, organizationId, saved }))
    },
  })
}
