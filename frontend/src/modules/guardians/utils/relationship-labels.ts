import type { GuardianRelationship } from '@shigjetademy/shared/guardians'

export const RELATIONSHIP_LABELS = {
  MOTHER: 'Mother',
  FATHER: 'Father',
  LEGAL_GUARDIAN: 'Legal guardian',
  GRANDPARENT: 'Grandparent',
  OTHER: 'Other',
} as const satisfies Record<GuardianRelationship, string>
