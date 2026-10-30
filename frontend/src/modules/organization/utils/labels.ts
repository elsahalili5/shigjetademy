import type { MemberRole } from '@shigjetademy/shared/auth'
import type { OrganizationStatus, OrganizationTypeValue } from '@shigjetademy/shared/organization'

export const ORGANIZATION_TYPE_LABELS = {
  SCHOOL: 'School',
  KINDERGARTEN: 'Kindergarten',
  ACADEMY: 'Academy',
  TRAINING_CENTRE: 'Training centre',
  INDEPENDENT_LECTURER: 'Independent lecturer',
  OTHER: 'Other',
} as const satisfies Record<OrganizationTypeValue, string>

export const ORGANIZATION_STATUS_LABELS = {
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  DEACTIVATED: 'Deactivated',
} as const satisfies Record<OrganizationStatus, string>

export const ORGANIZATION_STATUS_CHIPS = {
  ACTIVE: 'chip--green',
  SUSPENDED: 'chip--coral',
  DEACTIVATED: 'chip--navy',
} as const satisfies Record<OrganizationStatus, string>

/** Role names for counts like "1 owner" and "12 students" */
export const MEMBER_ROLE_NOUNS = {
  OWNER: { one: 'owner', other: 'owners' },
  ADMIN: { one: 'school admin', other: 'school admins' },
  LECTURER: { one: 'lecturer', other: 'lecturers' },
  STUDENT: { one: 'student', other: 'students' },
  GUARDIAN: { one: 'parent', other: 'parents' },
} as const satisfies Record<MemberRole, { one: string; other: string }>
