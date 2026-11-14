import { describe, expect, it } from 'vitest'
import type { MemberRole } from '@shigjetademy/shared/auth'
import { canMessage } from './can-message.ts'
import type { MessagingParty } from './inbox.types.ts'

type PartyParams = {
  id: string
  role: MemberRole
  studentIds?: string[]
}

const party = ({ id, role, studentIds = [] }: PartyParams): MessagingParty => ({ membershipId: id, role, studentIds: new Set(studentIds) })

const ENABLED = { isStudentMessagingEnabled: true }
const DISABLED = { isStudentMessagingEnabled: false }

const owner = party({ id: 'owner', role: 'OWNER' })
const admin = party({ id: 'admin', role: 'ADMIN' })
const otherAdmin = party({ id: 'admin-2', role: 'ADMIN' })
// Teaches the group student-1 is in
const lecturer = party({ id: 'lecturer', role: 'LECTURER', studentIds: ['student-1'] })
const strangerLecturer = party({ id: 'lecturer-2', role: 'LECTURER', studentIds: ['student-9'] })
const student = party({ id: 'student', role: 'STUDENT', studentIds: ['student-1'] })
const guardian = party({ id: 'guardian', role: 'GUARDIAN', studentIds: ['student-1'] })
const strangerGuardian = party({ id: 'guardian-2', role: 'GUARDIAN', studentIds: ['student-8'] })
// A student login without an active Student record: archived, or never linked
const recordlessStudent = party({ id: 'student-3', role: 'STUDENT' })
const strangerStudent = party({ id: 'student-2', role: 'STUDENT', studentIds: ['student-7'] })

type Pair = [string, MessagingParty, MessagingParty]

// Allowed with student messaging on or off: no student is involved
const ALLOWED: Pair[] = [
  ['owner and admin', owner, admin],
  ['admin and admin', admin, otherAdmin],
  ['owner and lecturer', owner, lecturer],
  ['admin and lecturer', admin, strangerLecturer],
  ['owner and guardian', owner, guardian],
  ['admin and any guardian', admin, strangerGuardian],
  ['lecturer and the guardian of a student they teach', lecturer, guardian],
]

// Allowed only with student messaging on
const STUDENT_ALLOWED: Pair[] = [
  ['student and a lecturer of their group', student, lecturer],
  ['student and any admin', student, admin],
  ['student and another admin', student, otherAdmin],
  ['lecturer and the student of a group they teach', lecturer, student],
]

const REFUSED: Pair[] = [
  ['owner and student', owner, student],
  ['owner and any student', owner, strangerStudent],
  ['student and a lecturer of another group', student, strangerLecturer],
  ['lecturer and lecturer', lecturer, strangerLecturer],
  ['lecturer and the guardian of a student they do not teach', lecturer, strangerGuardian],
  ['lecturer and a student they do not teach', lecturer, strangerStudent],
  ['guardian and guardian', guardian, strangerGuardian],
  ['admin and a student without an active record', admin, recordlessStudent],
  ['owner and a student without an active record', owner, recordlessStudent],
  ['guardian and student', guardian, student],
  ['guardian and any student', guardian, strangerStudent],
  ['student and student', student, strangerStudent],
]

describe('canMessage', () => {
  it.each(ALLOWED)('allows %s, both ways, with student messaging on or off', (_name, first, second) => {
    for (const context of [ENABLED, DISABLED]) {
      expect(canMessage({ sender: first, recipient: second, context })).toEqual({ allowed: true })
      expect(canMessage({ sender: second, recipient: first, context })).toEqual({ allowed: true })
    }
  })

  it.each(STUDENT_ALLOWED)('allows %s, both ways, only with student messaging on', (_name, first, second) => {
    expect(canMessage({ sender: first, recipient: second, context: ENABLED })).toEqual({ allowed: true })
    expect(canMessage({ sender: second, recipient: first, context: ENABLED })).toEqual({ allowed: true })
    expect(canMessage({ sender: first, recipient: second, context: DISABLED })).toEqual({ allowed: false, reason: 'studentMessagingDisabled' })
    expect(canMessage({ sender: second, recipient: first, context: DISABLED })).toEqual({ allowed: false, reason: 'studentMessagingDisabled' })
  })

  it.each(REFUSED)('refuses %s, both ways, with student messaging on or off', (_name, first, second) => {
    for (const context of [ENABLED, DISABLED]) {
      expect(canMessage({ sender: first, recipient: second, context })).toEqual({ allowed: false, reason: 'notAllowed' })
      expect(canMessage({ sender: second, recipient: first, context })).toEqual({ allowed: false, reason: 'notAllowed' })
    }
  })

  it('refuses messaging yourself', () => {
    expect(canMessage({ sender: owner, recipient: owner, context: ENABLED })).toEqual({ allowed: false, reason: 'notAllowed' })
    expect(canMessage({ sender: student, recipient: student, context: ENABLED })).toEqual({ allowed: false, reason: 'notAllowed' })
  })
})
