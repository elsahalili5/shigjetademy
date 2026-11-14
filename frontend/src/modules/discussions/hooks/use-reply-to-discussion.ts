import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { DiscussionReplyInput } from '@shigjetademy/shared/discussions'
import { discussionsApi } from '../api/discussions-api'
import { recordSentReply } from '../utils/cache'

type UseReplyToDiscussionParams = {
  organizationId: string
  topicId: string
}

/** Sends a reply into the open topic and adds it to the cached topic and list */
export function useReplyToDiscussion({ organizationId, topicId }: UseReplyToDiscussionParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DiscussionReplyInput) => discussionsApi.reply({ organizationId, topicId, ...input }),
    onSuccess: (reply) => recordSentReply({ queryClient, organizationId, topicId, reply }),
  })
}
