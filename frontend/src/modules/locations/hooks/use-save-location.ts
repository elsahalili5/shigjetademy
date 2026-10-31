import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { LocationInput, OrganizationLocation } from '@shigjetademy/shared/location'
import { locationsApi } from '../api/locations-api'
import { withSavedLocation } from '../utils/location-cache'
import { locationsQueryKey } from './use-locations'

type SaveLocationParams = {
  /** Absent when adding a new location */
  locationId?: string
  input: LocationInput
}

// Adds or edits a location; the saved one goes into the cached list, so it shows without a refetch
export function useSaveLocation(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ locationId, input }: SaveLocationParams) =>
      locationId ? locationsApi.update({ organizationId, locationId, ...input }) : locationsApi.create({ organizationId, ...input }),
    onSuccess: (saved) =>
      queryClient.setQueryData<OrganizationLocation[]>(locationsQueryKey(organizationId), (locations) => withSavedLocation({ locations: locations ?? [], saved })),
  })
}
