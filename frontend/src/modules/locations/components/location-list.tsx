import { useId, useState } from 'react'
import { MapPin } from 'lucide-react'
import type { OrganizationLocation } from '@shigjetademy/shared/location'
import { LoadError } from '#/components/LoadError'
import { RowAction, RowActions } from './row-actions'
import { SkeletonRows } from './skeleton-rows'

export type RemoveLocationInput = {
  location: OrganizationLocation
  newMainId?: string
}

interface LocationListProps {
  status: 'pending' | 'error' | 'success'
  locations?: OrganizationLocation[]
  isOwner: boolean
  onRetry: () => void
  onEdit: (location: OrganizationLocation) => void
  onRemove: (input: RemoveLocationInput) => void
}

export function LocationList({ status, locations, isOwner, onRetry, onEdit, onRemove }: LocationListProps) {
  if (status === 'error') return <LoadError what="locations" onRetry={onRetry} />
  if (!locations) return <SkeletonRows />

  if (locations.length === 0) {
    return (
      <div className="grid justify-items-center gap-2 px-5 py-10 text-center">
        <MapPin className="text-ink-3" size={24} strokeWidth={1.7} aria-hidden="true" />
        <p className="font-semibold">No locations yet.</p>
        <p className="text-ink-2">{isOwner ? 'Add your campuses or branches, starting with the main one.' : 'The owner hasn’t added any yet.'}</p>
      </div>
    )
  }

  return (
    <ul>
      {locations.map((location) => (
        <LocationRow
          key={location.id}
          location={location}
          otherLocations={locations.filter((other) => other.id !== location.id)}
          isOwner={isOwner}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      ))}
    </ul>
  )
}

interface LocationRowProps {
  location: OrganizationLocation
  otherLocations: OrganizationLocation[]
  isOwner: boolean
  onEdit: (location: OrganizationLocation) => void
  onRemove: (input: RemoveLocationInput) => void
}

function LocationRow({ location, otherLocations, isOwner, onEdit, onRemove }: LocationRowProps) {
  const place = [location.address, location.city].filter(Boolean).join(', ')
  const details = [place, location.phone].filter(Boolean).join(' · ')

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-rule px-5 py-4 last:border-b-0">
      <span className="grid size-10 flex-none place-items-center rounded-[10px] bg-green-wash text-green-deep" aria-hidden="true">
        <MapPin size={18} strokeWidth={1.8} />
      </span>
      <span className="grid min-w-[200px] flex-1 gap-0.5 leading-tight">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{location.name}</span>
          {location.is_main ? <span className="chip chip--green">Main location</span> : null}
        </span>
        <span className="text-[0.88rem] text-ink-3">{details || 'No address added'}</span>
      </span>
      {isOwner ? <LocationActions location={location} otherLocations={otherLocations} onEdit={onEdit} onRemove={onRemove} /> : null}
    </li>
  )
}

type LocationActionsProps = Omit<LocationRowProps, 'isOwner'>

/** Edit and remove; removing asks once, and removing the main location first asks which one takes over */
function LocationActions({ location, otherLocations, onEdit, onRemove }: LocationActionsProps) {
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)

  if (!isConfirmingRemove) {
    return <RowActions onEdit={() => onEdit(location)} onRemove={() => setIsConfirmingRemove(true)} />
  }
  if (location.is_main && otherLocations.length > 0) {
    return <ChooseNewMain location={location} otherLocations={otherLocations} onRemove={onRemove} onKeep={() => setIsConfirmingRemove(false)} />
  }
  return (
    <span className="flex flex-wrap items-center gap-2" role="group" aria-label={`Remove ${location.name}`}>
      <span className="text-[0.93rem] text-ink-2">Its departments stay, without a location.</span>
      <RowAction label="Remove" tone="confirm" onClick={() => onRemove({ location })} />
      <RowAction label="Keep" tone="ghost" onClick={() => setIsConfirmingRemove(false)} />
    </span>
  )
}

interface ChooseNewMainProps {
  location: OrganizationLocation
  otherLocations: OrganizationLocation[]
  onRemove: (input: RemoveLocationInput) => void
  onKeep: () => void
}

function ChooseNewMain({ location, otherLocations, onRemove, onKeep }: ChooseNewMainProps) {
  const selectId = useId()
  const [newMainId, setNewMainId] = useState('')

  return (
    <span className="flex w-full flex-wrap items-center gap-2" role="group" aria-label={`Remove ${location.name}`}>
      <span className="text-[0.93rem] text-ink-2">Another location takes over as main.</span>
      <label className="visually-hidden" htmlFor={selectId}>
        New main location
      </label>
      <select
        id={selectId}
        className="min-h-9 rounded-lg border border-rule-strong bg-white px-2.5 text-[0.95rem] focus:border-green-deep focus:outline-none"
        value={newMainId}
        onChange={(event) => setNewMainId(event.target.value)}
      >
        <option value="">Choose a location</option>
        {otherLocations.map((other) => (
          <option key={other.id} value={other.id}>
            {other.name}
          </option>
        ))}
      </select>
      <RowAction label="Remove" tone="confirm" isDisabled={!newMainId} onClick={() => onRemove({ location, newMainId })} />
      <RowAction label="Keep" tone="ghost" onClick={onKeep} />
    </span>
  )
}
