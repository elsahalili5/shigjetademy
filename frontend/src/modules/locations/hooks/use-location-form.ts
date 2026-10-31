import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { locationSchema } from '@shigjetademy/shared/location'
import type { LocationInput, OrganizationLocation } from '@shigjetademy/shared/location'

type UseLocationFormParams = {
  /** The location being edited, or none when adding */
  location?: OrganizationLocation
  /** The first location is always the main one */
  isFirst: boolean
}

export function useLocationForm({ location, isFirst }: UseLocationFormParams) {
  return useForm<LocationInput>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: location?.name ?? '',
      address: location?.address ?? '',
      city: location?.city ?? '',
      phone: location?.phone ?? '',
      is_main: location?.is_main ?? isFirst,
    },
  })
}
