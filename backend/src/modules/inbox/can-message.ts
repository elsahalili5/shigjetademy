import type { SendBlockedReason } from '@shigjetademy/shared/inbox'
import type { MessagingContext, MessagingParty } from './inbox.types.ts'

type CanMessageParams = {
  sender: MessagingParty
  recipient: MessagingParty
  context: MessagingContext
}

export type MessagingDecision = { allowed: true } | { allowed: false; reason: SendBlockedReason }

const isStaff = (party: MessagingParty) => party.role === 'OWNER' || party.role === 'ADMIN'

const sharesStudent = (first: MessagingParty, second: MessagingParty) => [...first.studentIds].some((studentId) => second.studentIds.has(studentId))

/** Staff reach lecturers, guardians and each other; a lecturer reaches the guardians and students of the groups they teach */
const isRelatedFrom = (from: MessagingParty, to: MessagingParty) => {
  if (isStaff(from)) return to.role === 'LECTURER' || to.role === 'GUARDIAN' || isStaff(to)
  if (from.role === 'LECTURER') return (to.role === 'GUARDIAN' || to.role === 'STUDENT') && sharesStudent(from, to)
  return false
}

/**
 * The one rule for who may message whom, used to list contacts, start a conversation and send into one. It is the same both ways round.
 * A student's side also needs the owner to have turned student messaging on.
 */
export const canMessage = ({ sender, recipient, context }: CanMessageParams): MessagingDecision => {
  if (sender.membershipId === recipient.membershipId) return { allowed: false, reason: 'notAllowed' }
  if (!isRelatedFrom(sender, recipient) && !isRelatedFrom(recipient, sender)) return { allowed: false, reason: 'notAllowed' }
  const involvesStudent = sender.role === 'STUDENT' || recipient.role === 'STUDENT'
  if (involvesStudent && !context.isStudentMessagingEnabled) return { allowed: false, reason: 'studentMessagingDisabled' }
  return { allowed: true }
}
