import { useRef, useState } from 'react'
import { MapPin, Plus } from 'lucide-react'
import type { OrganizationDepartment, OrganizationLocation } from '@shigjetademy/shared/location'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { NoticeBar } from '#/components/NoticeBar'
import type { Notice } from '#/components/NoticeBar'
import { SectionCard } from '#/components/SectionCard'
import { useDepartments } from '../hooks/use-departments'
import { useLocations } from '../hooks/use-locations'
import { useRemoveDepartment } from '../hooks/use-remove-department'
import { useRemoveLocation } from '../hooks/use-remove-location'
import { DepartmentDialog } from './department-dialog'
import type { DepartmentDialogMode } from './department-dialog'
import { DepartmentList } from './department-list'
import { LocationDialog } from './location-dialog'
import type { LocationDialogMode } from './location-dialog'
import { LocationList } from './location-list'
import type { RemoveLocationInput } from './location-list'

const pluralRules = new Intl.PluralRules()

type CountParams = {
  count: number
  one: string
  other: string
}

const formatCount = ({ count, one, other }: CountParams) => `${count} ${pluralRules.select(count) === 'one' ? one : other}`

interface LocationsPageProps {
  organizationId: string
  organizationName: string
  /** School admins see the same page without anything to change */
  isOwner: boolean
}

/** Where the organization teaches (its locations) and how it is organised (its departments) */
export function LocationsPage({ organizationId, organizationName, isOwner }: LocationsPageProps) {
  const locationDialogRef = useRef<HTMLDialogElement>(null)
  const departmentDialogRef = useRef<HTMLDialogElement>(null)
  const locations = useLocations(organizationId)
  const departments = useDepartments(organizationId)
  const removeLocation = useRemoveLocation(organizationId)
  const removeDepartment = useRemoveDepartment(organizationId)
  const [locationDialogMode, setLocationDialogMode] = useState<LocationDialogMode>({ kind: 'add', isFirst: false })
  const [departmentDialogMode, setDepartmentDialogMode] = useState<DepartmentDialogMode>({ kind: 'add' })
  const [notice, setNotice] = useState<Notice | null>(null)

  const locationCount = locations.data?.length ?? 0
  const departmentCount = departments.data?.length ?? 0
  // Adding waits for the list, so a new location can't become main while the real main one hasn't loaded
  const canAddLocation = isOwner && locations.status === 'success'
  const counts = `${formatCount({ count: locationCount, one: 'location', other: 'locations' })} · ${formatCount({ count: departmentCount, one: 'department', other: 'departments' })}`

  const handleAddLocation = () => {
    setLocationDialogMode({ kind: 'add', isFirst: locations.data?.length === 0 })
    locationDialogRef.current?.showModal()
  }

  const handleEditLocation = (location: OrganizationLocation) => {
    setLocationDialogMode({ kind: 'edit', location })
    locationDialogRef.current?.showModal()
  }

  const handleLocationSaved = (saved: OrganizationLocation) => {
    setNotice({ tone: 'success', text: locationDialogMode.kind === 'add' ? `Added ${saved.name}.` : `Saved ${saved.name}.` })
  }

  const handleRemoveLocation = ({ location, newMainId }: RemoveLocationInput) => {
    const newMain = locations.data?.find((other) => other.id === newMainId)
    removeLocation.mutate(
      { organizationId, locationId: location.id, newMainId },
      {
        onSuccess: () =>
          setNotice({
            tone: 'success',
            text: newMain ? `Removed ${location.name}. ${newMain.name} is now the main location.` : `Removed ${location.name}.`,
          }),
      },
    )
  }

  const handleAddDepartment = () => {
    setDepartmentDialogMode({ kind: 'add' })
    departmentDialogRef.current?.showModal()
  }

  const handleEditDepartment = (department: OrganizationDepartment) => {
    setDepartmentDialogMode({ kind: 'edit', department })
    departmentDialogRef.current?.showModal()
  }

  const handleDepartmentSaved = (saved: OrganizationDepartment) => {
    setNotice({ tone: 'success', text: departmentDialogMode.kind === 'add' ? `Added ${saved.name}.` : `Saved ${saved.name}.` })
  }

  const handleRemoveDepartment = (department: OrganizationDepartment) => {
    removeDepartment.mutate(
      { organizationId, departmentId: department.id },
      { onSuccess: () => setNotice({ tone: 'success', text: `Removed ${department.name}.` }) },
    )
  }

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader
        icon={MapPin}
        title="Locations and departments"
        subtitle={isOwner ? `${organizationName} · ${counts}` : `${organizationName} · only the owner can change these`}
      />

      <div className="grid max-w-[1040px] gap-6 px-[clamp(20px,3.4vw,44px)] pb-10">
        {notice ? <NoticeBar notice={notice} onDismiss={() => setNotice(null)} /> : null}

        <SectionCard title="Locations" action={canAddLocation ? <AddButton label="Add location" onClick={handleAddLocation} /> : null}>
          <LocationList
            status={locations.status}
            locations={locations.data}
            isOwner={isOwner}
            onRetry={() => void locations.refetch()}
            onEdit={handleEditLocation}
            onRemove={handleRemoveLocation}
          />
        </SectionCard>

        <SectionCard title="Departments" action={isOwner ? <AddButton label="Add department" onClick={handleAddDepartment} /> : null}>
          <DepartmentList
            status={departments.status}
            departments={departments.data}
            locations={locations.data ?? []}
            isOwner={isOwner}
            onRetry={() => void departments.refetch()}
            onEdit={handleEditDepartment}
            onRemove={handleRemoveDepartment}
          />
        </SectionCard>
      </div>

      {isOwner ? (
        <>
          <LocationDialog dialogRef={locationDialogRef} organizationId={organizationId} mode={locationDialogMode} onSaved={handleLocationSaved} />
          <DepartmentDialog
            dialogRef={departmentDialogRef}
            organizationId={organizationId}
            mode={departmentDialogMode}
            locations={locations.data ?? []}
            onSaved={handleDepartmentSaved}
          />
        </>
      ) : null}
    </div>
  )
}

interface AddButtonProps {
  label: string
  onClick: () => void
}

function AddButton({ label, onClick }: AddButtonProps) {
  return (
    <button type="button" className="button button--primary min-h-10 px-3.5 text-[0.95rem]" onClick={onClick}>
      <Plus size={16} strokeWidth={2.2} aria-hidden="true" />
      {label}
    </button>
  )
}
