import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { DiscussionReplyInput } from '@shigjetademy/shared/discussions'
import { discussionsApi } from '../api/discussions-api'
import { recordChangedReply } from '../utils/cache'

type UseUpdateDiscussionReplyParams = {
  organizationId: string
  topicId: string
}

type UpdateReplyInput = DiscussionReplyInput & {
  replyId: string
}

/** Saves a change to the member's own reply and shows it changed in the open topic */
export function useUpdateDiscussionReply({ organizationId, topicId }: UseUpdateDiscussionReplyParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateReplyInput) => discussionsApi.updateReply({ organizationId, topicId, ...input }),
    onSuccess: (reply) => recordChangedReply({ queryClient, organizationId, topicId, reply, isRemoval: false }),
  })
}
