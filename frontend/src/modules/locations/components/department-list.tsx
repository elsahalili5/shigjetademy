import { useState } from 'react'
import { Network } from 'lucide-react'
import type { OrganizationDepartment, OrganizationLocation } from '@shigjetademy/shared/location'
import { LoadError } from '#/components/LoadError'
import { RowAction, RowActions } from './row-actions'
import { SkeletonRows } from './skeleton-rows'

interface DepartmentListProps {
  status: 'pending' | 'error' | 'success'
  departments?: OrganizationDepartment[]
  locations: OrganizationLocation[]
  isOwner: boolean
  onRetry: () => void
  onEdit: (department: OrganizationDepartment) => void
  onRemove: (department: OrganizationDepartment) => void
}

export function DepartmentList({ status, departments, locations, isOwner, onRetry, onEdit, onRemove }: DepartmentListProps) {
  if (status === 'error') return <LoadError what="departments" onRetry={onRetry} />
  if (!departments) return <SkeletonRows />

  if (departments.length === 0) {
    return (
      <div className="grid justify-items-center gap-2 px-5 py-10 text-center">
        <Network className="text-ink-3" size={24} strokeWidth={1.7} aria-hidden="true" />
        <p className="font-semibold">No departments yet.</p>
        <p className="text-ink-2">{isOwner ? 'Add the departments your organization is organised by.' : 'The owner hasn’t added any yet.'}</p>
      </div>
    )
  }

  return (
    <ul>
      {departments.map((department) => (
        <DepartmentRow
          key={department.id}
          department={department}
          locationName={locations.find((location) => location.id === department.location_id)?.name}
          isOwner={isOwner}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      ))}
    </ul>
  )
}

interface DepartmentRowProps {
  department: OrganizationDepartment
  locationName?: string
  isOwner: boolean
  onEdit: (department: OrganizationDepartment) => void
  onRemove: (department: OrganizationDepartment) => void
}

function DepartmentRow({ department, locationName, isOwner, onEdit, onRemove }: DepartmentRowProps) {
  const details = [locationName ?? 'No location', department.description].filter(Boolean).join(' · ')

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-rule px-5 py-4 last:border-b-0">
      <span className="grid size-10 flex-none place-items-center rounded-[10px] bg-kraft-wash text-kraft-ink" aria-hidden="true">
        <Network size={18} strokeWidth={1.8} />
      </span>
      <span className="grid min-w-[200px] flex-1 gap-0.5 leading-tight">
        <span className="font-semibold">{department.name}</span>
        <span className="text-[0.88rem] text-ink-3">{details}</span>
      </span>
      {isOwner ? <DepartmentActions department={department} onEdit={onEdit} onRemove={onRemove} /> : null}
    </li>
  )
}

type DepartmentActionsProps = Omit<DepartmentRowProps, 'locationName' | 'isOwner'>

/** Edit and remove; removing asks once */
function DepartmentActions({ department, onEdit, onRemove }: DepartmentActionsProps) {
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)

  if (!isConfirmingRemove) {
    return <RowActions onEdit={() => onEdit(department)} onRemove={() => setIsConfirmingRemove(true)} />
  }
  return (
    <span className="flex flex-wrap items-center gap-2" role="group" aria-label={`Remove ${department.name}`}>
      <span className="text-[0.93rem] text-ink-2">This can’t be undone.</span>
      <RowAction label="Remove" tone="confirm" onClick={() => onRemove(department)} />
      <RowAction label="Keep" tone="ghost" onClick={() => setIsConfirmingRemove(false)} />
    </span>
  )
}
