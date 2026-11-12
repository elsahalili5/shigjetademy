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
const strangerStudent = party({ id: 'student-2', role: 'STUDENT', studentIds: ['student-7'] })

type Pair = [string, MessagingParty, MessagingParty]

const ALLOWED: Pair[] = [
  ['owner and admin', owner, admin],
  ['admin and admin', admin, otherAdmin],
  ['owner and lecturer', owner, lecturer],
  ['admin and lecturer', admin, strangerLecturer],
  ['owner and guardian', owner, guardian],
  ['admin and any guardian', admin, strangerGuardian],
  ['lecturer and the guardian of a student they teach', lecturer, guardian],
]

const REFUSED: Pair[] = [
  ['owner and student', owner, student],
  ['admin and student', admin, student],
  ['lecturer and lecturer', lecturer, strangerLecturer],
  ['lecturer and the guardian of a student they do not teach', lecturer, strangerGuardian],
  ['guardian and guardian', guardian, strangerGuardian],
  ['guardian and student', guardian, student],
  ['student and student', student, strangerStudent],
]

describe('canMessage', () => {
  it.each(ALLOWED)('allows %s, both ways, with student messaging off', (_name, first, second) => {
    expect(canMessage({ sender: first, recipient: second, context: DISABLED })).toEqual({ allowed: true })
    expect(canMessage({ sender: second, recipient: first, context: DISABLED })).toEqual({ allowed: true })
  })

  it.each(REFUSED)('refuses %s, both ways, even with student messaging on', (_name, first, second) => {
    expect(canMessage({ sender: first, recipient: second, context: ENABLED })).toEqual({ allowed: false, reason: 'notAllowed' })
    expect(canMessage({ sender: second, recipient: first, context: ENABLED })).toEqual({ allowed: false, reason: 'notAllowed' })
  })

  it('refuses messaging yourself', () => {
    expect(canMessage({ sender: owner, recipient: owner, context: ENABLED })).toEqual({ allowed: false, reason: 'notAllowed' })
  })

  it('lets a student and the lecturer of their group message each other only when the owner turned student messaging on', () => {
    expect(canMessage({ sender: student, recipient: lecturer, context: ENABLED })).toEqual({ allowed: true })
    expect(canMessage({ sender: lecturer, recipient: student, context: ENABLED })).toEqual({ allowed: true })
    expect(canMessage({ sender: student, recipient: lecturer, context: DISABLED })).toEqual({ allowed: false, reason: 'studentMessagingDisabled' })
    expect(canMessage({ sender: lecturer, recipient: student, context: DISABLED })).toEqual({ allowed: false, reason: 'studentMessagingDisabled' })
  })

  it('refuses a student and a lecturer who do not share a group, switch or no switch', () => {
    expect(canMessage({ sender: student, recipient: strangerLecturer, context: ENABLED })).toEqual({ allowed: false, reason: 'notAllowed' })
    expect(canMessage({ sender: student, recipient: strangerLecturer, context: DISABLED })).toEqual({ allowed: false, reason: 'notAllowed' })
  })
})
