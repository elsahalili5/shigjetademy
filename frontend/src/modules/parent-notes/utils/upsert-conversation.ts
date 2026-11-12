import type { ParentNote, ParentNoteConversation } from '@shigjetademy/shared/parent-notes'

type UpsertConversationParams = {
  conversations: ParentNoteConversation[]
  student: ParentNoteConversation['student']
  note: ParentNote
}

/** The list with this student's conversation first and its latest note replaced; a student written to for the first time is added */
export const upsertConversation = ({ conversations, student, note }: UpsertConversationParams): ParentNoteConversation[] => [
  { student, last_note: note },
  ...conversations.filter((conversation) => conversation.student.id !== student.id),
]
