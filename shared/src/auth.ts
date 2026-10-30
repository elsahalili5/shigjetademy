// The sign-up and login forms and the auth endpoints share these schemas and response shapes.
import { z } from 'zod'
import type { OrganizationStatus } from './organization.ts'

export const ROLES = {
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
} as const

export type RoleType = (typeof ROLES)[keyof typeof ROLES]

export const MEMBER_ROLES = ['OWNER', 'ADMIN', 'LECTURER', 'STUDENT', 'GUARDIAN'] as const

export type MemberRole = (typeof MEMBER_ROLES)[number]

/** What a School Admin may do; the owner always has all of them */
export const PERMISSIONS = [
  'MANAGE_STUDENTS',
  'MANAGE_LECTURERS',
  'MANAGE_GUARDIANS',
  'MANAGE_COURSES',
  'MANAGE_SCHEDULES',
  'MANAGE_ATTENDANCE',
  'MANAGE_GRADES',
  'MANAGE_MATERIALS',
  'MANAGE_TESTS',
  'VIEW_PERFORMANCE',
  'VIEW_REPORTS',
] as const

export type Permission = (typeof PERMISSIONS)[number]

// bcrypt only reads the first 72 bytes
const passwordSchema = z.string().min(8, 'Use at least 8 characters.').max(72, 'Use at most 72 characters.')

const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Enter an email address like name@school.org.'))

export const userRegisterSchema = z.object({
  first_name: z.string().trim().min(1, 'Enter your first name.').max(80),
  last_name: z.string().trim().min(1, 'Enter your last name.').max(80),
  email: emailSchema,
  password: passwordSchema,
})

export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.').max(72),
})

export const updateProfileSchema = z.object({
  first_name: z.string().trim().min(1, 'Enter your first name.').max(80),
  last_name: z.string().trim().min(1, 'Enter your last name.').max(80),
  email: emailSchema,
})

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Enter your current password.').max(72),
  new_password: passwordSchema,
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1, 'Refresh token required'),
})

export const logoutSchema = z.object({
  refreshToken: z.string().trim().min(10, 'Invalid refresh token'),
})

export type RegisterUserInput = z.infer<typeof userRegisterSchema>
export type LoginUserInput = z.infer<typeof userLoginSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
export type LogoutInput = z.infer<typeof logoutSchema>

export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

/** The signed-in user as the API sends it (dates as ISO strings) */
export type AuthUser = {
  id: string
  first_name: string
  last_name: string
  email: string
  status: 'PENDING' | 'ACTIVE' | 'LOCKED' | 'DISABLED'
  email_confirmed: boolean
  created_at: string
  user_roles: { role: { name: string } }[]
  memberships: {
    id: string
    role: MemberRole
    permissions: string[]
    organization: { id: string; name: string; type: string; status: OrganizationStatus }
  }[]
}

export type LoginUserResponse = AuthTokens & { user: AuthUser }

export type RegisterUserResponse = LoginUserResponse

export type RefreshTokenResponse = AuthTokens
