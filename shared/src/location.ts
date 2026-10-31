// The location and department forms and the endpoints that store them share these schemas.
import { z } from 'zod'
import { optionalText } from './organization.ts'

const NAME_MAX = 80

export const locationSchema = z.object({
  name: z.string().trim().min(1, 'Enter the location’s name.').max(NAME_MAX, `Keep the name under ${NAME_MAX} characters.`),
  address: optionalText(120),
  city: optionalText(80),
  phone: optionalText(40),
  is_main: z.boolean(),
})

export type LocationInput = z.infer<typeof locationSchema>

/** Removing the main location while others remain names the one that takes over */
export const removeLocationQuerySchema = z.object({
  newMainId: z.uuid('Choose the new main location.').optional(),
})

export type RemoveLocationQuery = z.infer<typeof removeLocationQuerySchema>

export const departmentSchema = z.object({
  name: z.string().trim().min(1, 'Enter the department’s name.').max(NAME_MAX, `Keep the name under ${NAME_MAX} characters.`),
  description: optionalText(300),
  location_id: z.uuid('Choose a location.').nullable(),
})

export type DepartmentInput = z.infer<typeof departmentSchema>

export type OrganizationLocation = {
  id: string
  name: string
  address: string | null
  city: string | null
  phone: string | null
  is_main: boolean
  created_at: string
}

export type OrganizationDepartment = {
  id: string
  name: string
  description: string | null
  /** Null when it has no location, including after its location was removed */
  location_id: string | null
  created_at: string
}
