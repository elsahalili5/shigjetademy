import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AuthUser } from '@shigjetademy/shared/auth'
import type { OrganizationProfile } from '@shigjetademy/shared/organization'
import { ME_QUERY_KEY } from '#/modules/auth/hooks/use-me-query'
import { organizationApi } from '../api/organization-api'
import { organizationProfileQueryKey } from './use-organization-profile'

type WithOrganizationNameParams = {
  user: AuthUser | null | undefined
  saved: OrganizationProfile
}

/** The signed-in user with the saved organization's new name on their membership */
const withOrganizationName = ({ user, saved }: WithOrganizationNameParams) =>
  user && {
    ...user,
    memberships: user.memberships.map((membership) =>
      membership.organization.id === saved.id ? { ...membership, organization: { ...membership.organization, name: saved.name } } : membership,
    ),
  }

// The saved profile replaces the cached one, and the session's copy of the name too, so the sidebar shows it at once
export function useUpdateOrganizationProfile(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: organizationApi.updateProfile,
    onSuccess: (saved) => {
      queryClient.setQueryData(organizationProfileQueryKey(organizationId), saved)
      queryClient.setQueryData<AuthUser | null>(ME_QUERY_KEY, (user) => withOrganizationName({ user, saved }))
    },
  })
}
