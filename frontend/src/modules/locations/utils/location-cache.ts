import type { OrganizationLocation } from '@shigjetademy/shared/location'

// The same order as the server: the main location first, then in the order they were added
const byMainThenAdded = (a: OrganizationLocation, b: OrganizationLocation) => Number(b.is_main) - Number(a.is_main) || a.created_at.localeCompare(b.created_at)

type WithSavedLocationParams = {
  locations: OrganizationLocation[]
  saved: OrganizationLocation
}

/** The cached list with a created or edited location in it; a new main location takes over from the old one */
export const withSavedLocation = ({ locations, saved }: WithSavedLocationParams) => {
  const others = locations.filter((location) => location.id !== saved.id).map((location) => (saved.is_main ? { ...location, is_main: false } : location))
  return [...others, saved].sort(byMainThenAdded)
}

type WithoutLocationParams = {
  locations: OrganizationLocation[]
  locationId: string
  newMainId?: string
}

/** The cached list once a location is removed, with the replacement as the new main location */
export const withoutLocation = ({ locations, locationId, newMainId }: WithoutLocationParams) =>
  locations
    .filter((location) => location.id !== locationId)
    .map((location) => (location.id === newMainId ? { ...location, is_main: true } : location))
    .sort(byMainThenAdded)
