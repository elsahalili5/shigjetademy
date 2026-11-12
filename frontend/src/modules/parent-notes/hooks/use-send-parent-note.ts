import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ParentNoteConversation, ParentNoteThread } from '@shigjetademy/shared/parent-notes'
import { parentNotesApi } from '../api/parent-notes-api'
import { upsertConversation } from '../utils/upsert-conversation'
import { parentNoteConversationsQueryKey } from './use-parent-note-conversations'
import { parentNoteThreadQueryKey } from './use-parent-note-thread'

type UseSendParentNoteParams = {
  organizationId: string
  studentId: string
}

/** Sends a note to the student's guardians; the answered note goes straight into the thread and the conversation list, no refetch */
export function useSendParentNote({ organizationId, studentId }: UseSendParentNoteParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => parentNotesApi.send({ organizationId, studentId, body }),
    onSuccess: (note) => {
      const thread = queryClient.setQueryData<ParentNoteThread>(parentNoteThreadQueryKey({ organizationId, studentId }), (current) => (current ? { ...current, notes: [...current.notes, note] } : current))
      if (!thread) return
      queryClient.setQueryData<ParentNoteConversation[]>(parentNoteConversationsQueryKey(organizationId), (conversations = []) => upsertConversation({ conversations, student: thread.student, note }))
    },
  })
}
