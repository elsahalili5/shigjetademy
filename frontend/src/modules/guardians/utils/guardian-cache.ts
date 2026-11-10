import type { Guardian, StudentGuardian } from '@shigjetademy/shared/guardians'

type ReplaceGuardianParams = {
  guardians: StudentGuardian[] | undefined
  saved: Guardian
}

/** The student's guardians with one guardian's details replaced, keeping how they're related to this student */
export const replaceGuardian = ({ guardians, saved }: ReplaceGuardianParams) => guardians?.map((guardian) => (guardian.id === saved.id ? { ...guardian, ...saved } : guardian))
