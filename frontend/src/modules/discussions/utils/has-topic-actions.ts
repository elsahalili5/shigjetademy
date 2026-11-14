import type { DiscussionTopicDetail } from '@shigjetademy/shared/discussions'

/** Whether the member has anything to do with the topic besides reading it */
export const hasTopicActions = (topic: DiscussionTopicDetail) => topic.can_edit || topic.can_remove || (topic.can_moderate && topic.status === 'ACTIVE')
