export const discussionQueryKeys = {
  list: (organizationId: string) => ['organizations', organizationId, 'discussions', 'list'] as const,
  detail: ({ organizationId, topicId }: { organizationId: string; topicId: string }) => ['organizations', organizationId, 'discussions', 'detail', topicId] as const,
  spaces: (organizationId: string) => ['organizations', organizationId, 'discussions', 'spaces'] as const,
  unreadCount: (organizationId: string) => ['organizations', organizationId, 'discussions', 'unread-count'] as const,
}

/** How often the open page asks for new topics and replies; TanStack Query pauses it while the tab is hidden (refetchIntervalInBackground is false) */
export const DISCUSSION_POLL_INTERVAL_MS = 15_000
