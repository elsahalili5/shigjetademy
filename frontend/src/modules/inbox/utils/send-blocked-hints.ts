import type { SendBlockedReason } from '@shigjetademy/shared/inbox'

/** What the composer says in place of a message box when a conversation can be read but not written to */
export const SEND_BLOCKED_HINTS = {
  studentMessagingDisabled: 'Messaging between students and lecturers is turned off for this school. You can still read this conversation.',
  notAllowed: 'You can’t send messages in this conversation anymore. You can still read it.',
} as const satisfies Record<SendBlockedReason, string>
