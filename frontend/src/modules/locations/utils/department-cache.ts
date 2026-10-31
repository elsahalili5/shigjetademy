import type { OrganizationDepartment } from '@shigjetademy/shared/location'

// The same order as the server: by name
const byName = (a: OrganizationDepartment, b: OrganizationDepartment) => a.name.localeCompare(b.name)

type WithSavedDepartmentParams = {
  departments: OrganizationDepartment[]
  saved: OrganizationDepartment
}

/** The cached list with a created or edited department in it */
export const withSavedDepartment = ({ departments, saved }: WithSavedDepartmentParams) =>
  [...departments.filter((department) => department.id !== saved.id), saved].sort(byName)

type WithoutDepartmentLocationParams = {
  departments: OrganizationDepartment[]
  locationId: string
}

/** The cached list once a location is removed: its departments stay, without a location */
export const withoutDepartmentLocation = ({ departments, locationId }: WithoutDepartmentLocationParams) =>
  departments.map((department) => (department.location_id === locationId ? { ...department, location_id: null } : department))
