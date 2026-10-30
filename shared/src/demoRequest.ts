// The demo-request form on the website and the endpoint that stores it share these shapes.

export const ORGANIZATION_TYPES = ['School', 'Kindergarten', 'Academy', 'Training centre', 'Independent lecturer', 'Other'] as const

export type OrganizationType = (typeof ORGANIZATION_TYPES)[number]

export const STUDENT_COUNTS = ['Under 50 students', '50–250 students', '250–1,000 students', 'Over 1,000 students'] as const

export type CreateDemoRequestInput = {
  name: string
  email: string
  organization: string
  orgType: string
  size?: string
  message?: string
}

export type CreateDemoRequestResponse = {
  id: string
}
