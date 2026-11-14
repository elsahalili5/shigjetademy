import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

// Every dashboard polls the unread counts for the sidebar badges; a test that cares about them serves its own
const noUnreadMessages = http.get('*/api/organizations/*/inbox/unread-count', () => HttpResponse.json({ data: { unread_count: 0 } }))
const noUnreadAnnouncements = http.get('*/api/organizations/*/announcements/unread-count', () => HttpResponse.json({ data: { unread_count: 0 } }))
const noUnreadDiscussions = http.get('*/api/organizations/*/discussions/unread-count', () => HttpResponse.json({ data: { unread_count: 0 } }))

// Each test adds the handlers it needs with server.use()
export const server = setupServer(noUnreadMessages, noUnreadAnnouncements, noUnreadDiscussions)
