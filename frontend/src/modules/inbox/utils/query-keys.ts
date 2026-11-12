export const inboxQueryKeys = {
  contacts: (organizationId: string) => ['organizations', organizationId, 'inbox', 'contacts'] as const,
  conversations: (organizationId: string) => ['organizations', organizationId, 'inbox', 'conversations'] as const,
  conversation: ({ organizationId, conversationId }: { organizationId: string; conversationId: string }) =>
    ['organizations', organizationId, 'inbox', 'conversations', conversationId] as const,
  unreadCount: (organizationId: string) => ['organizations', organizationId, 'inbox', 'unread-count'] as const,
}

/** How often the open inbox asks for new messages; TanStack Query pauses it while the tab is hidden (refetchIntervalInBackground is false) */
export const INBOX_POLL_INTERVAL_MS = 15_000
