import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { AuthUser } from '@shigjetademy/shared/auth'
import { sendMessageSchema, startConversationSchema } from '@shigjetademy/shared/inbox'
import type { InboxContact, InboxConversation, InboxConversationSummary, InboxMessage } from '@shigjetademy/shared/inbox'
import { buildUser, DEFAULT_SETTINGS, OWNER_MEMBERSHIPS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const GUARDIAN_MEMBERSHIPS: AuthUser['memberships'] = [
  { id: 'membership-me', role: 'GUARDIAN', permissions: [], organization: { id: 'org-1', name: 'Oxford Academy', type: 'ACADEMY', status: 'ACTIVE', ...DEFAULT_SETTINGS } },
]

const ME = 'membership-me'

const ARBEN: InboxContact = { membership_id: '5b1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e01', first_name: 'Arben', last_name: 'Hoxha', role: 'LECTURER' }
const DRITA: InboxContact = { membership_id: '5b1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e02', first_name: 'Drita', last_name: 'Berisha', role: 'ADMIN' }
const ELSA: InboxContact = { membership_id: '5b1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e03', first_name: 'Elsa', last_name: 'Halili', role: 'OWNER' }

const message = (overrides: Partial<InboxMessage> & Pick<InboxMessage, 'id' | 'body'>): InboxMessage => ({
  sender_membership_id: ARBEN.membership_id,
  created_at: '2026-11-10T09:00:00.000Z',
  ...overrides,
})

const summary = (overrides: Partial<InboxConversationSummary> & Pick<InboxConversationSummary, 'id' | 'other'>): InboxConversationSummary => ({
  last_message: null,
  unread_count: 0,
  last_message_at: '2026-11-10T09:00:00.000Z',
  ...overrides,
})

const thread = (overrides: Partial<InboxConversation> & Pick<InboxConversation, 'id' | 'other' | 'messages'>): InboxConversation => ({
  my_membership_id: ME,
  other_last_read_at: null,
  can_send: true,
  send_blocked_reason: null,
  ...overrides,
})

const ARBEN_MESSAGES = [
  message({ id: 'm1', body: 'Alba is doing well', created_at: '2026-11-10T09:00:00.000Z' }),
  message({ id: 'm2', body: 'Thank you for telling me', sender_membership_id: ME, created_at: '2026-11-10T10:00:00.000Z' }),
  message({ id: 'm3', body: 'Can we talk on Friday?', sender_membership_id: ME, created_at: '2026-11-10T11:00:00.000Z' }),
]

const serveConversations = (conversations: InboxConversationSummary[]) =>
  server.use(http.get('*/api/organizations/org-1/inbox/conversations', () => HttpResponse.json({ data: conversations })))

const serveThread = (conversation: InboxConversation) =>
  server.use(http.get(`*/api/organizations/org-1/inbox/conversations/${conversation.id}`, () => HttpResponse.json({ data: conversation })))

const serveContacts = (contacts: InboxContact[]) => server.use(http.get('*/api/organizations/org-1/inbox/contacts', () => HttpResponse.json({ data: contacts })))

const signInAsGuardian = () => signInAs(buildUser({ id: 'user-me', memberships: GUARDIAN_MEMBERSHIPS }))

const ARBEN_SUMMARY = summary({ id: 'c-arben', other: ARBEN, last_message: ARBEN_MESSAGES[2], unread_count: 0, last_message_at: ARBEN_MESSAGES[2].created_at })

describe('the inbox: conversations', () => {
  it('lists conversations with the other person, their role, the last message and an unread count', async () => {
    signInAsGuardian()
    const drita = summary({
      id: 'c-drita',
      other: DRITA,
      last_message: message({ id: 'm9', body: 'Your invoice is ready', sender_membership_id: DRITA.membership_id }),
      unread_count: 2,
    })
    serveConversations([drita, ARBEN_SUMMARY])
    renderRoute('/dashboard/inbox')

    expect(await screen.findByRole('heading', { level: 1, name: 'Inbox' })).toBeInTheDocument()
    const list = await screen.findByRole('list', { name: 'Conversations' })
    const [first, second] = within(list).getAllByRole('listitem')
    expect(within(first).getByText('Drita Berisha')).toBeInTheDocument()
    expect(within(first).getByText(/School admin/)).toBeInTheDocument()
    expect(within(first).getByText('Your invoice is ready')).toBeInTheDocument()
    expect(within(first).getByLabelText('2 unread')).toBeInTheDocument()
    expect(within(second).getByText('You: Can we talk on Friday?')).toBeInTheDocument()
    expect(within(second).queryByLabelText(/unread/)).not.toBeInTheDocument()
  })

  it('says when there are no conversations yet', async () => {
    signInAsGuardian()
    serveConversations([])
    renderRoute('/dashboard/inbox')

    expect(await screen.findByText('No messages yet.')).toBeInTheDocument()
    expect(screen.getByText('Pick a conversation')).toBeInTheDocument()
  })

  it('offers to try again when the conversations fail to load', async () => {
    signInAsGuardian()
    serveConversations([ARBEN_SUMMARY])
    server.use(http.get('*/api/organizations/org-1/inbox/conversations', () => HttpResponse.json({ error: 'Down' }, { status: 500 }), { once: true }))
    const { user } = renderRoute('/dashboard/inbox')

    await user.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('button', { name: /Arben Hoxha/ })).toBeInTheDocument()
  })
})

describe('the inbox: reading a conversation', () => {
  it('opens a conversation with its messages oldest first and clears its unread count', async () => {
    signInAsGuardian()
    serveConversations([{ ...ARBEN_SUMMARY, unread_count: 1 }])
    serveThread(thread({ id: 'c-arben', other: ARBEN, messages: ARBEN_MESSAGES }))
    const { user } = renderRoute('/dashboard/inbox')

    const conversation = await screen.findByRole('button', { name: /Arben Hoxha/ })
    expect(within(conversation).getByLabelText('1 unread')).toBeInTheDocument()
    await user.click(conversation)

    const messages = await screen.findByRole('list', { name: 'Messages with Arben Hoxha' })
    expect(within(messages).getAllByRole('listitem').map((item) => item.querySelector('p')?.textContent)).toEqual(['Alba is doing well', 'Thank you for telling me', 'Can we talk on Friday?'])
    expect(screen.getByRole('heading', { level: 2, name: 'Arben Hoxha' })).toBeInTheDocument()
    expect(within(await screen.findByRole('button', { name: /Arben Hoxha/ })).queryByLabelText(/unread/)).not.toBeInTheDocument()
  })

  it('marks Seen only the own messages the other person has opened since they were sent', async () => {
    signInAsGuardian()
    serveConversations([ARBEN_SUMMARY])
    // Opened between the member's two messages
    serveThread(thread({ id: 'c-arben', other: ARBEN, messages: ARBEN_MESSAGES, other_last_read_at: '2026-11-10T10:30:00.000Z' }))
    const { user } = renderRoute('/dashboard/inbox')

    await user.click(await screen.findByRole('button', { name: /Arben Hoxha/ }))

    const [theirs, seen, unseen] = within(await screen.findByRole('list', { name: 'Messages with Arben Hoxha' })).getAllByRole('listitem')
    expect(within(theirs).queryByLabelText('Seen')).not.toBeInTheDocument()
    expect(within(seen).getByLabelText('Seen')).toBeInTheDocument()
    expect(within(unseen).queryByLabelText('Seen')).not.toBeInTheDocument()
  })

  it('shows no Seen mark while the other person has never opened the conversation', async () => {
    signInAsGuardian()
    serveConversations([ARBEN_SUMMARY])
    serveThread(thread({ id: 'c-arben', other: ARBEN, messages: ARBEN_MESSAGES }))
    const { user } = renderRoute('/dashboard/inbox')

    await user.click(await screen.findByRole('button', { name: /Arben Hoxha/ }))

    await screen.findByRole('list', { name: 'Messages with Arben Hoxha' })
    expect(screen.queryByLabelText('Seen')).not.toBeInTheDocument()
  })

  it('offers to try again when a conversation fails to load', async () => {
    signInAsGuardian()
    serveConversations([ARBEN_SUMMARY])
    serveThread(thread({ id: 'c-arben', other: ARBEN, messages: ARBEN_MESSAGES }))
    server.use(http.get('*/api/organizations/org-1/inbox/conversations/c-arben', () => HttpResponse.json({ error: 'Down' }, { status: 500 }), { once: true }))
    const { user } = renderRoute('/dashboard/inbox')

    await user.click(await screen.findByRole('button', { name: /Arben Hoxha/ }))
    await user.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Alba is doing well')).toBeInTheDocument()
  })
})

describe('the inbox: sending', () => {
  it('sends a message, clears the box and shows it at once without loading the conversation again', async () => {
    signInAsGuardian()
    serveConversations([ARBEN_SUMMARY])
    let threadReads = 0
    let sent: unknown
    server.use(
      http.get('*/api/organizations/org-1/inbox/conversations/c-arben', () => {
        threadReads += 1
        return HttpResponse.json({ data: thread({ id: 'c-arben', other: ARBEN, messages: ARBEN_MESSAGES }) })
      }),
      http.post('*/api/organizations/org-1/inbox/conversations/c-arben/messages', async ({ request }) => {
        sent = sendMessageSchema.parse(await request.json())
        return HttpResponse.json({ data: message({ id: 'm4', body: 'Friday at four works', sender_membership_id: ME, created_at: '2026-11-10T12:00:00.000Z' }) }, { status: 201 })
      }),
    )
    const { user } = renderRoute('/dashboard/inbox')

    await user.click(await screen.findByRole('button', { name: /Arben Hoxha/ }))
    await user.type(await screen.findByRole('textbox', { name: 'Message' }), '  Friday at four works  ')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    const messages = await screen.findByRole('list', { name: 'Messages with Arben Hoxha' })
    expect(await within(messages).findByText('Friday at four works')).toBeInTheDocument()
    expect(sent).toEqual({ body: 'Friday at four works' })
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('')
    expect(threadReads).toBe(1)
    expect(within(await screen.findByRole('button', { name: /Arben Hoxha/ })).getByText('You: Friday at four works')).toBeInTheDocument()
  })

  it('sends with Enter, keeps a new line on Shift+Enter, and groups the messages under a day heading', async () => {
    signInAsGuardian()
    serveConversations([ARBEN_SUMMARY])
    let sent: unknown
    server.use(
      http.get('*/api/organizations/org-1/inbox/conversations/c-arben', () => HttpResponse.json({ data: thread({ id: 'c-arben', other: ARBEN, messages: ARBEN_MESSAGES }) })),
      http.post('*/api/organizations/org-1/inbox/conversations/c-arben/messages', async ({ request }) => {
        sent = sendMessageSchema.parse(await request.json())
        return HttpResponse.json({ data: message({ id: 'm5', body: 'Line one\nLine two', sender_membership_id: ME, created_at: '2026-11-10T12:00:00.000Z' }) }, { status: 201 })
      }),
    )
    const { user } = renderRoute('/dashboard/inbox')

    await user.click(await screen.findByRole('button', { name: /Arben Hoxha/ }))
    const messages = await screen.findByRole('list', { name: 'Messages with Arben Hoxha' })
    expect(within(messages).getAllByRole('separator')).toHaveLength(1)
    await user.type(await screen.findByRole('textbox', { name: 'Message' }), 'Line one{Shift>}{Enter}{/Shift}Line two{Enter}')

    await waitFor(() => expect(sent).toEqual({ body: 'Line one\nLine two' }))
  })

  it('does not send a blank message', async () => {
    signInAsGuardian()
    serveConversations([ARBEN_SUMMARY])
    serveThread(thread({ id: 'c-arben', other: ARBEN, messages: ARBEN_MESSAGES }))
    const { user } = renderRoute('/dashboard/inbox')

    await user.click(await screen.findByRole('button', { name: /Arben Hoxha/ }))
    await user.type(await screen.findByRole('textbox', { name: 'Message' }), '   ')

    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  it('shows the server’s reason and keeps the text when sending fails', async () => {
    signInAsGuardian()
    serveConversations([ARBEN_SUMMARY])
    serveThread(thread({ id: 'c-arben', other: ARBEN, messages: ARBEN_MESSAGES }))
    server.use(http.post('*/api/organizations/org-1/inbox/conversations/c-arben/messages', () => HttpResponse.json({ error: 'You can’t message this person.' }, { status: 403 })))
    const { user } = renderRoute('/dashboard/inbox')

    await user.click(await screen.findByRole('button', { name: /Arben Hoxha/ }))
    await user.type(await screen.findByRole('textbox', { name: 'Message' }), 'Hello')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('You can’t message this person.')
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('Hello')
  })

  it('replaces the message box with a hint when the conversation is read-only', async () => {
    signInAsGuardian()
    serveConversations([ARBEN_SUMMARY])
    serveThread(thread({ id: 'c-arben', other: ARBEN, messages: ARBEN_MESSAGES, can_send: false, send_blocked_reason: 'studentMessagingDisabled' }))
    const { user } = renderRoute('/dashboard/inbox')

    await user.click(await screen.findByRole('button', { name: /Arben Hoxha/ }))

    expect(await screen.findByRole('note')).toHaveTextContent('Messaging between students and lecturers is turned off for this school. You can still read this conversation.')
    expect(screen.queryByRole('textbox', { name: 'Message' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument()
    expect(screen.getByText('Alba is doing well')).toBeInTheDocument()
  })
})

describe('the inbox: new message', () => {
  it('lists the allowed contacts grouped by role, then starts the conversation and opens it', async () => {
    signInAs(buildUser({ id: 'user-me', memberships: OWNER_MEMBERSHIPS.map((membership) => ({ ...membership, id: ME })) }))
    serveConversations([])
    serveContacts([ARBEN, DRITA])
    let started: unknown
    server.use(
      http.post('*/api/organizations/org-1/inbox/conversations', async ({ request }) => {
        started = startConversationSchema.parse(await request.json())
        return HttpResponse.json(
          { data: { conversation_id: 'c-new', message: message({ id: 'm1', body: 'Welcome to the term', sender_membership_id: ME }) } },
          { status: 201 },
        )
      }),
      http.get('*/api/organizations/org-1/inbox/conversations/c-new', () =>
        HttpResponse.json({ data: thread({ id: 'c-new', other: ARBEN, messages: [message({ id: 'm1', body: 'Welcome to the term', sender_membership_id: ME })] }) }),
      ),
    )
    const { user } = renderRoute('/dashboard/inbox')

    await user.click(await screen.findByRole('button', { name: 'New message' }))
    const dialog = await screen.findByRole('dialog', { name: 'New message' })
    const staff = await within(dialog).findByRole('group', { name: 'School staff' })
    expect(within(staff).getByRole('radio', { name: /Drita Berisha/ })).toBeInTheDocument()
    expect(within(within(dialog).getByRole('group', { name: 'Lecturers' })).getByRole('radio', { name: /Arben Hoxha/ })).toBeInTheDocument()
    expect(within(dialog).queryByRole('group', { name: 'Students' })).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('radio', { name: /Arben Hoxha/ }))
    await user.type(within(dialog).getByRole('textbox', { name: 'Message' }), 'Welcome to the term')
    await user.click(within(dialog).getByRole('button', { name: 'Send message' }))

    expect(await screen.findByRole('list', { name: 'Messages with Arben Hoxha' })).toBeInTheDocument()
    expect(started).toEqual({ recipient_membership_id: ARBEN.membership_id, body: 'Welcome to the term' })
    expect(await screen.findByRole('button', { name: /Arben Hoxha/ })).toBeInTheDocument()
    expect(dialog).not.toHaveAttribute('open')
  })

  it('asks for a recipient and a message before sending anything', async () => {
    signInAsGuardian()
    serveConversations([])
    serveContacts([ARBEN, ELSA])
    let posts = 0
    server.use(
      http.post('*/api/organizations/org-1/inbox/conversations', () => {
        posts += 1
        return HttpResponse.json({}, { status: 500 })
      }),
    )
    const { user } = renderRoute('/dashboard/inbox')

    await user.click(await screen.findByRole('button', { name: 'New message' }))
    const dialog = await screen.findByRole('dialog', { name: 'New message' })
    await user.click(await within(dialog).findByRole('button', { name: 'Send message' }))

    expect(await within(dialog).findByText('Choose who to message.')).toBeInTheDocument()
    expect(within(dialog).getByText('Write a message.')).toBeInTheDocument()
    expect(posts).toBe(0)
  })

  it('says so when there is nobody to message', async () => {
    signInAsGuardian()
    serveConversations([])
    serveContacts([])
    const { user } = renderRoute('/dashboard/inbox')

    await user.click(await screen.findByRole('button', { name: 'New message' }))

    const dialog = await screen.findByRole('dialog', { name: 'New message' })
    expect(await within(dialog).findByText('There is nobody you can message yet.')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Send message' })).not.toBeInTheDocument()
  })
})
