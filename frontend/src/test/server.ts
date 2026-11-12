import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

// Every dashboard polls the unread count for the sidebar badge; a test that cares about it serves its own
const noUnreadMessages = http.get('*/api/organizations/*/inbox/unread-count', () => HttpResponse.json({ data: { unread_count: 0 } }))

// Each test adds the handlers it needs with server.use()
export const server = setupServer(noUnreadMessages)
