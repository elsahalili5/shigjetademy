import { useId } from 'react'
import type { OrganizationDepartment, OrganizationLocation } from '@shigjetademy/shared/location'
import { SelectField } from '#/components/SelectField'

/** The chosen location, department and subject; '' for any */
export type LecturerPlaceFilters = {
  locationId: string
  departmentId: string
  subject: string
}

interface LecturerFiltersProps {
  filters: LecturerPlaceFilters
  locations: OrganizationLocation[]
  departments: OrganizationDepartment[]
  subjects: string[]
  onChange: (filters: LecturerPlaceFilters) => void
}

/** Narrows the list to who teaches at a location, in a department or a subject */
export function LecturerFilters({ filters, locations, departments, subjects, onChange }: LecturerFiltersProps) {
  const ids = { location: useId(), department: useId(), subject: useId() }
  return (
    <div className="grid grid-cols-3 gap-3 max-[760px]:grid-cols-1" role="group" aria-label="Filters">
      <SelectField id={ids.location} label="Location" value={filters.locationId} onChange={(event) => onChange({ ...filters, locationId: event.target.value })}>
        <option value="">All locations</option>
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
      </SelectField>
      <SelectField id={ids.department} label="Department" value={filters.departmentId} onChange={(event) => onChange({ ...filters, departmentId: event.target.value })}>
        <option value="">All departments</option>
        {departments.map((department) => (
          <option key={department.id} value={department.id}>
            {department.name}
          </option>
        ))}
      </SelectField>
      <SelectField id={ids.subject} label="Subject" value={filters.subject} onChange={(event) => onChange({ ...filters, subject: event.target.value })}>
        <option value="">All subjects</option>
        {subjects.map((subject) => (
          <option key={subject} value={subject}>
            {subject}
          </option>
        ))}
      </SelectField>
    </div>
  )
}
