import { useNavigate } from '@tanstack/react-router'
import { storeActiveOrganizationId } from '../utils/active-organization-storage'

/** Makes another of the user's organizations active and opens its home, without logging out */
export function useSwitchOrganization() {
  const navigate = useNavigate()

  return async (organizationId: string) => {
    storeActiveOrganizationId(organizationId)
    // The dashboard index sends the user to the new organization's home for their role there
    await navigate({ to: '/dashboard' })
  }
}
