import type { DiscussionRemover } from '@shigjetademy/shared/discussions'

/** What stands in place of a removed topic's or reply's words */
export const getRemovedLabel = (removedBy: DiscussionRemover | null) => (removedBy === 'MODERATOR' ? 'Removed by a moderator' : 'Removed by the author')
