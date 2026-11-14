import { useMutation, useQueryClient } from '@tanstack/react-query'
import { discussionsApi } from '../api/discussions-api'
import { recordChangedReply } from '../utils/cache'

type UseRemoveDiscussionReplyParams = {
  organizationId: string
  topicId: string
}

/** Removes a reply (the row stays, shown as removed) and shows it so in the open topic */
export function useRemoveDiscussionReply({ organizationId, topicId }: UseRemoveDiscussionReplyParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (replyId: string) => discussionsApi.removeReply({ organizationId, topicId, replyId }),
    onSuccess: (reply) => recordChangedReply({ queryClient, organizationId, topicId, reply, isRemoval: true }),
  })
}
