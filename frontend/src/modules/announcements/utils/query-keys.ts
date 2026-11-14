export const announcementQueryKeys = {
  list: (organizationId: string) => ['organizations', organizationId, 'announcements', 'list'] as const,
  detail: ({ organizationId, announcementId }: { organizationId: string; announcementId: string }) => ['organizations', organizationId, 'announcements', 'detail', announcementId] as const,
  audiences: (organizationId: string) => ['organizations', organizationId, 'announcements', 'audiences'] as const,
  unreadCount: (organizationId: string) => ['organizations', organizationId, 'announcements', 'unread-count'] as const,
}

/** How often the open page asks for new announcements; TanStack Query pauses it while the tab is hidden (refetchIntervalInBackground is false) */
export const ANNOUNCEMENT_POLL_INTERVAL_MS = 15_000
