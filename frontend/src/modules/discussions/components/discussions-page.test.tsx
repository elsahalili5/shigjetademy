import { screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { MemberRole } from '@shigjetademy/shared/auth'
import { createDiscussionTopicSchema, discussionReplySchema } from '@shigjetademy/shared/discussions'
import type { DiscussionReply, DiscussionSpace, DiscussionTopicDetail, DiscussionTopicSummary } from '@shigjetademy/shared/discussions'
import { buildUser, DEFAULT_SETTINGS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const ORG = '*/api/organizations/org-1/discussions'

const signInWithRole = (role: MemberRole) =>
  signInAs(buildUser({ id: 'user-me', memberships: [{ id: 'membership-me', role, permissions: [], organization: { id: 'org-1', name: 'Oxford Academy', type: 'ACADEMY', status: 'ACTIVE', ...DEFAULT_SETTINGS } }] }))

const ELSA = { membership_id: 'membership-me', first_name: 'Elsa', last_name: 'Halili' }
const ARBEN = { membership_id: 'membership-arben', first_name: 'Arben', last_name: 'Hoxha' }

const GROUP_A_ID = '5b1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e21'
const MATH_ID = '5b1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e11'

const GROUP_A = { kind: 'GROUP', id: GROUP_A_ID, name: 'Group A', course_name: 'Mathematics' } as const
const MATH = { kind: 'COURSE', id: MATH_ID, name: 'Mathematics', course_name: null } as const

const SPACES: DiscussionSpace[] = [
  { ...MATH, is_archived: false, can_post: true },
  { ...GROUP_A, is_archived: false, can_post: true },
]

const summary = (overrides: Partial<DiscussionTopicSummary> & Pick<DiscussionTopicSummary, 'id' | 'title'>): DiscussionTopicSummary => ({
  space: GROUP_A,
  author: ARBEN,
  is_pinned: false,
  is_locked: false,
  status: 'ACTIVE',
  removed_by: null,
  reply_count: 0,
  last_activity_at: '2026-11-10T12:00:00.000Z',
  created_at: '2026-11-10T11:00:00.000Z',
  is_unread: false,
  is_space_archived: false,
  ...overrides,
})

const reply = (overrides: Partial<DiscussionReply> & Pick<DiscussionReply, 'id' | 'body'>): DiscussionReply => ({
  author: ARBEN,
  status: 'ACTIVE',
  removed_by: null,
  edited_at: null,
  created_at: '2026-11-10T12:00:00.000Z',
  can_edit: false,
  can_remove: false,
  ...overrides,
})

const detail = (overrides: Partial<DiscussionTopicDetail> & Pick<DiscussionTopicDetail, 'id' | 'title'>): DiscussionTopicDetail => ({
  ...summary(overrides),
  body: 'Is question 4 about limits?',
  edited_at: null,
  replies: [],
  can_moderate: false,
  can_edit: false,
  can_remove: false,
  can_reply: true,
  ...overrides,
})

const serveList = (topics: DiscussionTopicSummary[]) => server.use(http.get(ORG, () => HttpResponse.json({ data: topics })))

const serveSpaces = (spaces: DiscussionSpace[] = SPACES) => server.use(http.get(`${ORG}/spaces`, () => HttpResponse.json({ data: spaces })))

const serveDetail = (topic: DiscussionTopicDetail) => server.use(http.get(`${ORG}/${topic.id}`, () => HttpResponse.json({ data: topic })))

const HOMEWORK = summary({ id: 't-homework', title: 'Homework 3', is_unread: true, reply_count: 2, is_pinned: true })
const EXAM = summary({ id: 't-exam', title: 'Exam dates', space: MATH, author: ELSA, is_locked: true, last_activity_at: '2026-11-09T12:00:00.000Z' })

const openTopic = async (user: ReturnType<typeof renderRoute>['user'], name: RegExp) => {
  await user.click(await screen.findByRole('button', { name }))
  return screen.findByRole('article')
}

describe('discussions: the list', () => {
  it('lists topics with an unread dot, space, author, replies, time and chips', async () => {
    signInWithRole('STUDENT')
    serveSpaces()
    serveList([HOMEWORK, EXAM])
    renderRoute('/dashboard/discussions')

    expect(await screen.findByRole('heading', { level: 1, name: 'Groups & Discussions' })).toBeInTheDocument()
    const [first, second] = within(await screen.findByRole('list', { name: 'Topics' })).getAllByRole('listitem')
    expect(within(first).getByText('Homework 3')).toBeInTheDocument()
    expect(within(first).getByRole('img', { name: 'Unread' })).toBeInTheDocument()
    expect(within(first).getByText(/Group: Group A · Arben Hoxha/)).toBeInTheDocument()
    expect(within(first).getByText('2 replies')).toBeInTheDocument()
    expect(within(first).getByText(/10 Nov 2026/)).toBeInTheDocument()
    expect(within(first).getByText('Pinned')).toBeInTheDocument()
    expect(within(second).getByText(/Course: Mathematics · Elsa Halili/)).toBeInTheDocument()
    expect(within(second).getByText('0 replies')).toBeInTheDocument()
    expect(within(second).getByText('Locked')).toBeInTheDocument()
    expect(within(second).queryByRole('img', { name: 'Unread' })).not.toBeInTheDocument()
    expect(screen.getByText('Pick a topic')).toBeInTheDocument()
  })

  it('marks a topic of an archived group and a removed topic', async () => {
    signInWithRole('STUDENT')
    serveSpaces()
    serveList([summary({ id: 't-old', title: 'Old', is_space_archived: true }), summary({ id: 't-gone', title: '', status: 'REMOVED', removed_by: 'MODERATOR' })])
    renderRoute('/dashboard/discussions')

    const [archived, removed] = within(await screen.findByRole('list', { name: 'Topics' })).getAllByRole('listitem')

    expect(within(archived).getByText('Archived')).toBeInTheDocument()
    expect(within(removed).getByText('Removed topic')).toBeInTheDocument()
  })

  it('says when the member is in no group or course', async () => {
    signInWithRole('LECTURER')
    serveSpaces([])
    serveList([])
    renderRoute('/dashboard/discussions')

    expect(await screen.findByText('You are not in a group or course yet.')).toBeInTheDocument()
  })

  it('says when there are no topics yet', async () => {
    signInWithRole('STUDENT')
    serveSpaces()
    serveList([])
    renderRoute('/dashboard/discussions')

    expect(await screen.findByText('No topics yet.')).toBeInTheDocument()
  })

  it('shows placeholder rows while loading, then offers to try again when loading fails', async () => {
    signInWithRole('STUDENT')
    serveSpaces()
    serveList([HOMEWORK])
    server.use(http.get(ORG, async () => {
      await delay(30)
      return HttpResponse.json({ error: 'Down' }, { status: 500 })
    }, { once: true }))
    const { user } = renderRoute('/dashboard/discussions')

    expect(await screen.findByLabelText('Loading')).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('button', { name: /Homework 3/ })).toBeInTheDocument()
  })

  it('narrows the list to one group or course with the space filter', async () => {
    signInWithRole('STUDENT')
    serveSpaces()
    serveList([HOMEWORK, EXAM])
    const { user } = renderRoute('/dashboard/discussions')
    await screen.findByRole('button', { name: /Homework 3/ })

    const filter = screen.getByLabelText('Show topics from')
    expect(within(filter).getAllByRole('option').map((option) => option.textContent)).toEqual(['All my groups and courses', 'Course: Mathematics', 'Group: Group A'])
    await user.selectOptions(filter, 'Course: Mathematics')

    expect(screen.queryByRole('button', { name: /Homework 3/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Exam dates/ })).toBeInTheDocument()

    await user.selectOptions(filter, 'All my groups and courses')
    expect(screen.getByRole('button', { name: /Homework 3/ })).toBeInTheDocument()
  })

  it('says when the chosen space has no topics', async () => {
    signInWithRole('STUDENT')
    serveSpaces()
    serveList([HOMEWORK])
    const { user } = renderRoute('/dashboard/discussions')
    await screen.findByRole('button', { name: /Homework 3/ })

    await user.selectOptions(screen.getByLabelText('Show topics from'), 'Course: Mathematics')

    expect(screen.getByText('No topics here yet.')).toBeInTheDocument()
  })
})

describe('discussions: reading and replying', () => {
  it('opens a topic with its text, author, space and replies in order, and takes the unread dot off the list and the count', async () => {
    signInWithRole('STUDENT')
    let unreadCount = 1
    server.use(http.get(`${ORG}/unread-count`, () => HttpResponse.json({ data: { unread_count: unreadCount } })))
    serveSpaces()
    serveList([HOMEWORK])
    server.use(
      http.get(`${ORG}/t-homework`, () => {
        unreadCount = 0
        return HttpResponse.json({
          data: detail({ id: 't-homework', title: 'Homework 3', replies: [reply({ id: 'r1', body: 'First reply' }), reply({ id: 'r2', body: 'Second reply', edited_at: '2026-11-10T13:00:00.000Z' })] }),
        })
      }),
    )
    const { user } = renderRoute('/dashboard/discussions')

    const article = await openTopic(user, /Homework 3/)

    expect(within(article).getByRole('heading', { level: 2, name: 'Homework 3' })).toBeInTheDocument()
    expect(within(article).getByText('Is question 4 about limits?')).toBeInTheDocument()
    expect(within(article).getByText('Group: Group A')).toBeInTheDocument()
    const replies = within(within(article).getByRole('list', { name: 'Replies' })).getAllByRole('listitem')
    expect(replies.map((item) => item.textContent)).toEqual([expect.stringContaining('First reply'), expect.stringContaining('Second reply')])
    expect(within(replies[1]).getByText('(edited)')).toBeInTheDocument()
    await waitFor(() => expect(within(screen.getByRole('button', { name: /Homework 3/ })).queryByRole('img', { name: 'Unread' })).not.toBeInTheDocument())
    await user.click(await screen.findByRole('button', { name: /Communication/ }))
    expect(screen.queryByLabelText(/unread topics/)).not.toBeInTheDocument()
  })

  it('sends a reply and shows it at the end of the topic and in the reply count', async () => {
    signInWithRole('STUDENT')
    serveSpaces()
    serveList([HOMEWORK])
    serveDetail(detail({ id: 't-homework', title: 'Homework 3', reply_count: 2, replies: [reply({ id: 'r1', body: 'First reply' })] }))
    let sent: unknown
    server.use(
      http.post(`${ORG}/t-homework/replies`, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ data: reply({ id: 'r-new', body: 'Thanks!', author: ELSA, created_at: '2026-11-12T12:00:00.000Z', can_edit: true, can_remove: true }) }, { status: 201 })
      }),
    )
    const { user } = renderRoute('/dashboard/discussions')
    const article = await openTopic(user, /Homework 3/)

    await user.type(within(article).getByLabelText('Reply'), 'Thanks!')
    await user.click(within(article).getByRole('button', { name: 'Reply' }))

    const replies = within(await within(article).findByRole('list', { name: 'Replies' })).getAllByRole('listitem')
    expect(replies).toHaveLength(2)
    expect(within(replies[1]).getByText('Thanks!')).toBeInTheDocument()
    expect(within(screen.getByRole('button', { name: /Homework 3/ })).getByText('3 replies')).toBeInTheDocument()
    expect(within(article).getByLabelText('Reply')).toHaveValue('')
    expect(discussionReplySchema.safeParse(sent).success).toBe(true)
    expect(sent).toEqual({ body: 'Thanks!' })
  })

  it('shows the server’s reason when a reply is refused', async () => {
    signInWithRole('STUDENT')
    serveSpaces()
    serveList([HOMEWORK])
    serveDetail(detail({ id: 't-homework', title: 'Homework 3' }))
    server.use(http.post(`${ORG}/t-homework/replies`, () => HttpResponse.json({ error: 'This topic is locked.' }, { status: 409 })))
    const { user } = renderRoute('/dashboard/discussions')
    const article = await openTopic(user, /Homework 3/)

    await user.type(within(article).getByLabelText('Reply'), 'Hi')
    await user.click(within(article).getByRole('button', { name: 'Reply' }))

    expect(await within(article).findByRole('alert')).toHaveTextContent('This topic is locked.')
  })

  it('replaces the reply box with a hint on a locked topic', async () => {
    signInWithRole('STUDENT')
    serveSpaces()
    serveList([EXAM])
    serveDetail(detail({ id: 't-exam', title: 'Exam dates', space: MATH, is_locked: true, can_reply: false }))
    const { user } = renderRoute('/dashboard/discussions')

    const article = await openTopic(user, /Exam dates/)

    expect(within(article).getByRole('note')).toHaveTextContent('This topic is locked.')
    expect(within(article).queryByLabelText('Reply')).not.toBeInTheDocument()
    expect(within(article).getByText('Locked')).toBeInTheDocument()
  })

  it('replaces the reply box with a hint in an archived group', async () => {
    signInWithRole('STUDENT')
    serveSpaces()
    serveList([summary({ id: 't-old', title: 'Old', is_space_archived: true })])
    serveDetail(detail({ id: 't-old', title: 'Old', is_space_archived: true, can_reply: false }))
    const { user } = renderRoute('/dashboard/discussions')

    const article = await openTopic(user, /Old/)

    expect(within(article).getByRole('note')).toHaveTextContent('This group is archived, so it takes no new replies.')
    expect(within(article).queryByLabelText('Reply')).not.toBeInTheDocument()
  })

  it('shows who removed a topic and its replies, without their words', async () => {
    signInWithRole('STUDENT')
    serveSpaces()
    serveList([summary({ id: 't-gone', title: '', status: 'REMOVED', removed_by: 'MODERATOR' })])
    serveDetail(detail({ id: 't-gone', title: '', body: '', status: 'REMOVED', removed_by: 'MODERATOR', can_reply: false }))
    const { user } = renderRoute('/dashboard/discussions')

    const article = await openTopic(user, /Removed topic/)

    expect(within(article).getByText('Removed by a moderator')).toBeInTheDocument()
    expect(within(article).getByRole('note')).toHaveTextContent('This topic was removed.')
  })

  it('shows removed replies as removed, by a moderator or by the author', async () => {
    signInWithRole('STUDENT')
    serveSpaces()
    serveList([HOMEWORK])
    serveDetail(
      detail({
        id: 't-homework',
        title: 'Homework 3',
        replies: [reply({ id: 'r1', body: '', status: 'REMOVED', removed_by: 'MODERATOR' }), reply({ id: 'r2', body: '', status: 'REMOVED', removed_by: 'AUTHOR' })],
      }),
    )
    const { user } = renderRoute('/dashboard/discussions')

    const article = await openTopic(user, /Homework 3/)

    expect(within(article).getByText('Removed by a moderator')).toBeInTheDocument()
    expect(within(article).getByText('Removed by the author')).toBeInTheDocument()
  })
})

describe('discussions: acting on topics and replies', () => {
  it('shows a student no moderation actions, and an author edit and remove for their own topic only', async () => {
    signInWithRole('STUDENT')
    serveSpaces()
    serveList([HOMEWORK, summary({ id: 't-mine', title: 'My question', author: ELSA })])
    serveDetail(detail({ id: 't-homework', title: 'Homework 3' }))
    serveDetail(detail({ id: 't-mine', title: 'My question', author: ELSA, can_edit: true, can_remove: true, edited_at: '2026-11-11T12:00:00.000Z' }))
    const { user } = renderRoute('/dashboard/discussions')

    const others = await openTopic(user, /Homework 3/)
    await within(others).findByRole('heading', { level: 2, name: 'Homework 3' })
    expect(within(others).queryByRole('button', { name: /topic/ })).not.toBeInTheDocument()

    const own = await openTopic(user, /My question/)
    await within(own).findByRole('heading', { level: 2, name: 'My question' })
    expect(within(own).getByRole('button', { name: 'Edit topic' })).toBeInTheDocument()
    expect(within(own).getByRole('button', { name: 'Remove topic' })).toBeInTheDocument()
    expect(within(own).queryByRole('button', { name: /Pin topic|Lock topic/ })).not.toBeInTheDocument()
    expect(within(own).getByText(/\(edited\)/)).toBeInTheDocument()
  })

  it('lets a moderator pin a topic, which then shows a Pinned chip and the Unpin action', async () => {
    signInWithRole('LECTURER')
    serveSpaces()
    serveList([summary({ id: 't-q', title: 'Question' })])
    serveDetail(detail({ id: 't-q', title: 'Question', can_moderate: true, can_remove: true }))
    server.use(http.put(`${ORG}/t-q/pin`, async ({ request }) => {
      expect(await request.json()).toEqual({ is_pinned: true })
      return HttpResponse.json({ data: detail({ id: 't-q', title: 'Question', is_pinned: true, can_moderate: true, can_remove: true }) })
    }))
    const { user } = renderRoute('/dashboard/discussions')
    const article = await openTopic(user, /Question/)

    await user.click(await within(article).findByRole('button', { name: 'Pin topic' }))

    expect(await within(article).findByRole('button', { name: 'Unpin topic' })).toBeInTheDocument()
    expect(within(article).getByText('Pinned')).toBeInTheDocument()
    expect(within(screen.getByRole('button', { name: /Question/ })).getByText('Pinned')).toBeInTheDocument()
  })

  it('lets a moderator lock a topic, which then takes no replies', async () => {
    signInWithRole('ADMIN')
    serveSpaces()
    serveList([summary({ id: 't-q', title: 'Question' })])
    serveDetail(detail({ id: 't-q', title: 'Question', can_moderate: true, can_remove: true }))
    server.use(http.put(`${ORG}/t-q/lock`, () => HttpResponse.json({ data: detail({ id: 't-q', title: 'Question', is_locked: true, can_reply: false, can_moderate: true, can_remove: true }) })))
    const { user } = renderRoute('/dashboard/discussions')
    const article = await openTopic(user, /Question/)

    await user.click(await within(article).findByRole('button', { name: 'Lock topic' }))

    expect(await within(article).findByRole('button', { name: 'Unlock topic' })).toBeInTheDocument()
    expect(within(article).getByRole('note')).toHaveTextContent('This topic is locked.')
    expect(within(article).queryByLabelText('Reply')).not.toBeInTheDocument()
  })

  it('removes a topic after a confirmation and shows it removed', async () => {
    signInWithRole('OWNER')
    serveSpaces()
    serveList([summary({ id: 't-q', title: 'Question' })])
    serveDetail(detail({ id: 't-q', title: 'Question', can_moderate: true, can_remove: true }))
    server.use(http.post(`${ORG}/t-q/remove`, () => HttpResponse.json({ data: detail({ id: 't-q', title: '', body: '', status: 'REMOVED', removed_by: 'MODERATOR', can_reply: false, can_moderate: true }) })))
    const { user } = renderRoute('/dashboard/discussions')
    const article = await openTopic(user, /Question/)

    await user.click(await within(article).findByRole('button', { name: 'Remove topic' }))
    await user.click(within(screen.getByRole('group', { name: 'Remove this topic' })).getByRole('button', { name: 'Remove' }))

    expect(await within(article).findByText('Removed by a moderator')).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Topics' })).getByText('Removed topic')).toBeInTheDocument()
    expect(within(article).queryByRole('button', { name: 'Remove topic' })).not.toBeInTheDocument()
  })

  it('edits an own topic', async () => {
    signInWithRole('STUDENT')
    serveSpaces()
    serveList([summary({ id: 't-mine', title: 'My question', author: ELSA })])
    serveDetail(detail({ id: 't-mine', title: 'My question', author: ELSA, can_edit: true, can_remove: true }))
    let sent: unknown
    server.use(
      http.put(`${ORG}/t-mine`, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ data: detail({ id: 't-mine', title: 'My better question', author: ELSA, can_edit: true, can_remove: true, edited_at: '2026-11-12T12:00:00.000Z' }) })
      }),
    )
    const { user } = renderRoute('/dashboard/discussions')
    const article = await openTopic(user, /My question/)

    await user.click(await within(article).findByRole('button', { name: 'Edit topic' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit topic' })
    expect(within(dialog).queryByLabelText('Post in')).not.toBeInTheDocument()
    await user.clear(within(dialog).getByLabelText('Title'))
    await user.type(within(dialog).getByLabelText('Title'), 'My better question')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await within(article).findByRole('heading', { level: 2, name: 'My better question' })).toBeInTheDocument()
    expect(within(article).getByText(/\(edited\)/)).toBeInTheDocument()
    expect(sent).toEqual({ title: 'My better question', body: 'Is question 4 about limits?' })
  })

  it('shows edit and remove only on replies the member may change, and removes one after a confirmation', async () => {
    signInWithRole('STUDENT')
    serveSpaces()
    serveList([HOMEWORK])
    serveDetail(
      detail({
        id: 't-homework',
        title: 'Homework 3',
        reply_count: 2,
        replies: [reply({ id: 'r1', body: 'Theirs' }), reply({ id: 'r2', body: 'Mine', author: ELSA, can_edit: true, can_remove: true })],
      }),
    )
    server.use(http.post(`${ORG}/t-homework/replies/r2/remove`, () => HttpResponse.json({ data: reply({ id: 'r2', body: '', author: ELSA, status: 'REMOVED', removed_by: 'AUTHOR' }) })))
    const { user } = renderRoute('/dashboard/discussions')
    const article = await openTopic(user, /Homework 3/)

    const [theirs, mine] = within(await within(article).findByRole('list', { name: 'Replies' })).getAllByRole('listitem')
    expect(within(theirs).queryByRole('button')).not.toBeInTheDocument()
    expect(within(mine).getByRole('button', { name: 'Edit reply' })).toBeInTheDocument()
    await user.click(within(mine).getByRole('button', { name: 'Remove reply' }))
    await user.click(within(screen.getByRole('group', { name: 'Remove this reply' })).getByRole('button', { name: 'Remove' }))

    expect(await within(article).findByText('Removed by the author')).toBeInTheDocument()
    expect(within(screen.getByRole('button', { name: /Homework 3/ })).getByText('1 reply')).toBeInTheDocument()
  })

  it('lets a moderator remove anyone’s reply', async () => {
    signInWithRole('LECTURER')
    serveSpaces()
    serveList([HOMEWORK])
    serveDetail(detail({ id: 't-homework', title: 'Homework 3', can_moderate: true, replies: [reply({ id: 'r1', body: 'Rude', can_remove: true })] }))
    server.use(http.post(`${ORG}/t-homework/replies/r1/remove`, () => HttpResponse.json({ data: reply({ id: 'r1', body: '', status: 'REMOVED', removed_by: 'MODERATOR' }) })))
    const { user } = renderRoute('/dashboard/discussions')
    const article = await openTopic(user, /Homework 3/)

    await user.click(await within(article).findByRole('button', { name: 'Remove reply' }))
    await user.click(within(screen.getByRole('group', { name: 'Remove this reply' })).getByRole('button', { name: 'Remove' }))

    expect(await within(article).findByText('Removed by a moderator')).toBeInTheDocument()
  })

  it('edits an own reply in place', async () => {
    signInWithRole('STUDENT')
    serveSpaces()
    serveList([HOMEWORK])
    serveDetail(detail({ id: 't-homework', title: 'Homework 3', replies: [reply({ id: 'r2', body: 'Typo', author: ELSA, can_edit: true, can_remove: true })] }))
    server.use(
      http.put(`${ORG}/t-homework/replies/r2`, async ({ request }) => {
        expect(await request.json()).toEqual({ body: 'Fixed' })
        return HttpResponse.json({ data: reply({ id: 'r2', body: 'Fixed', author: ELSA, edited_at: '2026-11-12T12:00:00.000Z', can_edit: true, can_remove: true }) })
      }),
    )
    const { user } = renderRoute('/dashboard/discussions')
    const article = await openTopic(user, /Homework 3/)

    await user.click(await within(article).findByRole('button', { name: 'Edit reply' }))
    const box = within(article).getByLabelText('Edit reply', { selector: 'textarea' })
    await user.clear(box)
    await user.type(box, 'Fixed')
    await user.click(within(article).getByRole('button', { name: 'Save reply' }))

    expect(await within(article).findByText('Fixed')).toBeInTheDocument()
    expect(within(article).getByText('(edited)')).toBeInTheDocument()
  })
})

describe('discussions: starting a topic', () => {
  it.each(['STUDENT', 'LECTURER', 'ADMIN', 'OWNER'] as const)('lets %s start a topic in a space they post in, and opens it', async (role) => {
    signInWithRole(role)
    serveSpaces([...SPACES, { kind: 'GROUP', id: '5b1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e22', name: 'Group Z', course_name: 'Mathematics', is_archived: true, can_post: false }])
    serveList([])
    let sent: unknown
    const created = detail({ id: 't-new', title: 'Quiz tomorrow', body: 'Bring a calculator.', author: ELSA, can_edit: true, can_remove: true })
    server.use(
      http.post(ORG, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ data: created }, { status: 201 })
      }),
    )
    serveDetail(created)
    const { user } = renderRoute('/dashboard/discussions')

    await user.click(await screen.findByRole('button', { name: 'New topic' }))
    const dialog = await screen.findByRole('dialog', { name: 'New topic' })
    const space = await within(dialog).findByLabelText('Post in')
    expect(within(space).getAllByRole('option').map((option) => option.textContent)).toEqual(['Choose a group or course', 'Course: Mathematics', 'Group: Group A'])
    await user.selectOptions(space, 'Group: Group A')
    await user.type(within(dialog).getByLabelText('Title'), 'Quiz tomorrow')
    await user.type(within(dialog).getByLabelText('Message'), 'Bring a calculator.')
    await user.click(within(dialog).getByRole('button', { name: 'Post topic' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'Quiz tomorrow' })).toBeInTheDocument()
    expect(sent).toEqual({ space_kind: 'GROUP', space_id: GROUP_A_ID, title: 'Quiz tomorrow', body: 'Bring a calculator.' })
    expect(createDiscussionTopicSchema.safeParse(sent).success).toBe(true)
    expect(within(screen.getByRole('list', { name: 'Topics' })).getByText('Quiz tomorrow')).toBeInTheDocument()
  })

  it('asks for a space, a title and a message before sending', async () => {
    signInWithRole('STUDENT')
    serveSpaces()
    serveList([])
    const { user } = renderRoute('/dashboard/discussions')

    await user.click(await screen.findByRole('button', { name: 'New topic' }))
    const dialog = await screen.findByRole('dialog', { name: 'New topic' })
    await within(dialog).findByLabelText('Post in')
    await user.click(within(dialog).getByRole('button', { name: 'Post topic' }))

    expect(await within(dialog).findByText('Choose where to post it.')).toBeInTheDocument()
    expect(within(dialog).getByText('Write a title.')).toBeInTheDocument()
    expect(within(dialog).getByText('Write a message.')).toBeInTheDocument()
  })

  it('preselects the only space there is', async () => {
    signInWithRole('STUDENT')
    serveSpaces([SPACES[1]])
    serveList([])
    const { user } = renderRoute('/dashboard/discussions')

    await user.click(await screen.findByRole('button', { name: 'New topic' }))

    expect(await screen.findByLabelText('Post in')).toHaveValue(`GROUP:${GROUP_A_ID}`)
  })

  it('says there is nowhere to post when every space is archived or the member has none', async () => {
    signInWithRole('LECTURER')
    serveSpaces([{ ...GROUP_A, is_archived: true, can_post: false }])
    serveList([])
    const { user } = renderRoute('/dashboard/discussions')

    await user.click(await screen.findByRole('button', { name: 'New topic' }))

    expect(await screen.findByText('There is nowhere you can post yet.')).toBeInTheDocument()
  })

  it('shows the server’s reason when posting is refused', async () => {
    signInWithRole('STUDENT')
    serveSpaces([SPACES[1]])
    serveList([])
    server.use(http.post(ORG, () => HttpResponse.json({ error: 'This group is archived, so it takes no new topics or replies.' }, { status: 409 })))
    const { user } = renderRoute('/dashboard/discussions')
    await user.click(await screen.findByRole('button', { name: 'New topic' }))
    const dialog = await screen.findByRole('dialog', { name: 'New topic' })
    await within(dialog).findByLabelText('Post in')

    await user.type(within(dialog).getByLabelText('Title'), 'Hi')
    await user.type(within(dialog).getByLabelText('Message'), 'There')
    await user.click(within(dialog).getByRole('button', { name: 'Post topic' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('This group is archived')
  })
})

describe('discussions: who gets the page', () => {
  it('sends a guardian back to their dashboard and hides the Discussions link', async () => {
    signInWithRole('GUARDIAN')
    server.use(http.get('*/api/organizations/org-1/my-children', () => HttpResponse.json({ data: [] })))
    const { router, user } = renderRoute('/dashboard/discussions')

    await waitFor(() => expect(router.state.location.pathname).not.toBe('/dashboard/discussions'))
    await user.click(await screen.findByRole('button', { name: 'Communication' }))
    expect(screen.queryByRole('link', { name: 'Groups & Discussions' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Announcements' })).toBeInTheDocument()
  })

  it('shows the unread topics on the link and on the closed group, and a guardian asks for none', async () => {
    signInWithRole('STUDENT')
    server.use(http.get(`${ORG}/unread-count`, () => HttpResponse.json({ data: { unread_count: 5 } })))
    const { user } = renderRoute('/dashboard/profile')

    const group = await screen.findByRole('button', { name: /Communication/ })
    expect(await within(group).findByLabelText('5 unread')).toBeInTheDocument()
    await user.click(group)

    expect(within(screen.getByRole('link', { name: /Groups & Discussions/ })).getByLabelText('5 unread topics')).toBeInTheDocument()
    expect(within(screen.getByRole('link', { name: /Inbox/ })).queryByLabelText(/unread/)).not.toBeInTheDocument()
  })
})
