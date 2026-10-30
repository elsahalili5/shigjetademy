import type { MemberRole } from '@shigjetademy/shared/auth'

export const ROLE_LABELS = {
  OWNER: 'Owner',
  ADMIN: 'School admin',
  LECTURER: 'Lecturer',
  STUDENT: 'Student',
  GUARDIAN: 'Parent or guardian',
} as const satisfies Record<MemberRole, string>
