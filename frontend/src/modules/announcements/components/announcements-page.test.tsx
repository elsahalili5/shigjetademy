import { screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { MemberRole } from '@shigjetademy/shared/auth'
import { createAnnouncementSchema, updateAnnouncementSchema } from '@shigjetademy/shared/announcements'
import type { AnnouncementAudienceOptions, AnnouncementDetail, AnnouncementSummary } from '@shigjetademy/shared/announcements'
import { buildUser, DEFAULT_SETTINGS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const ORG = '*/api/organizations/org-1/announcements'

const signInWithRole = (role: MemberRole) =>
  signInAs(buildUser({ id: 'user-me', memberships: [{ id: 'membership-me', role, permissions: [], organization: { id: 'org-1', name: 'Oxford Academy', type: 'ACADEMY', status: 'ACTIVE', ...DEFAULT_SETTINGS } }] }))

const ELSA = { membership_id: 'membership-elsa', first_name: 'Elsa', last_name: 'Halili' }
const ARBEN = { membership_id: 'membership-arben', first_name: 'Arben', last_name: 'Hoxha' }

const summary = (overrides: Partial<AnnouncementSummary> & Pick<AnnouncementSummary, 'id' | 'title'>): AnnouncementSummary => ({
  audience_kind: 'SCHOOL',
  audience_role: null,
  course: null,
  group: null,
  author: ELSA,
  status: 'PUBLISHED',
  publish_at: '2026-11-10T12:00:00.000Z',
  edited_at: null,
  is_unread: false,
  can_manage: false,
  ...overrides,
})

const detail = (overrides: Partial<AnnouncementDetail> & Pick<AnnouncementDetail, 'id' | 'title'>): AnnouncementDetail => ({
  ...summary(overrides),
  body: 'Join us on Friday at 18:00.',
  read_counts: null,
  can_change_audience: false,
  can_change_publishing: false,
  ...overrides,
})

const STAFF_OPTIONS: AnnouncementAudienceOptions = {
  can_create: true,
  can_address_school: true,
  roles: ['STUDENT', 'GUARDIAN', 'LECTURER'],
  courses: [{ id: '5b1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e11', name: 'Mathematics' }],
  groups: [{ id: '5b1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e21', name: 'Group A', course_name: 'Mathematics' }],
}

const LECTURER_OPTIONS: AnnouncementAudienceOptions = { ...STAFF_OPTIONS, can_address_school: false, roles: [] }

const serveList = (announcements: AnnouncementSummary[]) => server.use(http.get(ORG, () => HttpResponse.json({ data: announcements })))

const serveDetail = (announcement: AnnouncementDetail) => server.use(http.get(`${ORG}/${announcement.id}`, () => HttpResponse.json({ data: announcement })))

const serveOptions = (options: AnnouncementAudienceOptions) => server.use(http.get(`${ORG}/audiences`, () => HttpResponse.json({ data: options })))

const PARENTS_EVENING = summary({ id: 'a-parents', title: 'Parents evening', is_unread: true })
const SNOW_DAY = summary({ id: 'a-snow', title: 'Snow day', audience_kind: 'GROUP', group: { id: 'g-a', name: 'Group A' }, author: ARBEN, publish_at: '2026-11-09T12:00:00.000Z' })

describe('announcements: reading', () => {
  it('lists announcements with an unread dot, the audience, the author and when they went out', async () => {
    signInWithRole('STUDENT')
    serveList([PARENTS_EVENING, SNOW_DAY])
    renderRoute('/dashboard/announcements')

    expect(await screen.findByRole('heading', { level: 1, name: 'Announcements' })).toBeInTheDocument()
    const list = await screen.findByRole('list', { name: 'Announcements' })
    const [first, second] = within(list).getAllByRole('listitem')
    expect(within(first).getByText('Parents evening')).toBeInTheDocument()
    expect(within(first).getByRole('img', { name: 'Unread' })).toBeInTheDocument()
    expect(within(first).getByText(/Whole school · Elsa Halili/)).toBeInTheDocument()
    expect(within(first).getByText(/10 Nov 2026/)).toBeInTheDocument()
    expect(within(second).getByText(/Group: Group A · Arben Hoxha/)).toBeInTheDocument()
    expect(within(second).queryByRole('img', { name: 'Unread' })).not.toBeInTheDocument()
    expect(screen.getByText('Pick an announcement')).toBeInTheDocument()
  })

  it('says when there are no announcements', async () => {
    signInWithRole('GUARDIAN')
    serveList([])
    renderRoute('/dashboard/announcements')

    expect(await screen.findByText('No announcements yet.')).toBeInTheDocument()
  })

  it('shows placeholder rows while loading, then offers to try again when loading fails', async () => {
    signInWithRole('STUDENT')
    serveList([PARENTS_EVENING])
    server.use(http.get(ORG, async () => {
      await delay(30)
      return HttpResponse.json({ error: 'Down' }, { status: 500 })
    }, { once: true }))
    const { user } = renderRoute('/dashboard/announcements')

    expect(await screen.findByLabelText('Loading')).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('button', { name: /Parents evening/ })).toBeInTheDocument()
  })

  it('opens an announcement with its text, author, audience and time, and takes the unread dot off the list and the count', async () => {
    signInWithRole('GUARDIAN')
    let unreadCount = 1
    server.use(http.get(`${ORG}/unread-count`, () => HttpResponse.json({ data: { unread_count: unreadCount } })))
    serveList([PARENTS_EVENING])
    server.use(
      http.get(`${ORG}/a-parents`, () => {
        unreadCount = 0
        return HttpResponse.json({ data: detail({ id: 'a-parents', title: 'Parents evening', body: 'Join us on Friday.\nBring your questions.' }) })
      }),
    )
    const { user } = renderRoute('/dashboard/announcements')

    await user.click(await screen.findByRole('button', { name: /Parents evening/ }))

    const article = await screen.findByRole('article')
    expect(within(article).getByRole('heading', { level: 2, name: 'Parents evening' })).toBeInTheDocument()
    expect(within(article).getByText(/Join us on Friday\.\s*Bring your questions\./)).toBeInTheDocument()
    expect(within(article).getByText('Elsa Halili')).toBeInTheDocument()
    expect(within(article).getByText('Whole school')).toBeInTheDocument()
    expect(within(article).getByText(/10 Nov 2026/)).toBeInTheDocument()
    expect(within(article).queryByText('Edited')).not.toBeInTheDocument()
    expect(within(article).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(within(article).queryByText(/Read by/)).not.toBeInTheDocument()
    await waitFor(() => expect(within(screen.getByRole('button', { name: /Parents evening/ })).queryByRole('img', { name: 'Unread' })).not.toBeInTheDocument())
    await user.click(await screen.findByRole('button', { name: /Communication/ }))
    expect(screen.queryByLabelText(/unread announcements/)).not.toBeInTheDocument()
  })

  it('marks an announcement that was edited after it went out', async () => {
    signInWithRole('STUDENT')
    serveList([summary({ id: 'a-edit', title: 'Moved', edited_at: '2026-11-11T12:00:00.000Z' })])
    serveDetail(detail({ id: 'a-edit', title: 'Moved', edited_at: '2026-11-11T12:00:00.000Z' }))
    const { user } = renderRoute('/dashboard/announcements')

    await user.click(await screen.findByRole('button', { name: /Moved/ }))

    const article = await screen.findByRole('article')
    expect(within(article).getByText('Edited')).toBeInTheDocument()
    expect(within(article).getByText(/11 Nov 2026/)).toBeInTheDocument()
  })

  it.each(['STUDENT', 'GUARDIAN'] as const)('gives %s no New announcement button', async (role) => {
    signInWithRole(role)
    serveList([PARENTS_EVENING])
    renderRoute('/dashboard/announcements')

    await screen.findByRole('button', { name: /Parents evening/ })

    expect(screen.queryByRole('button', { name: 'New announcement' })).not.toBeInTheDocument()
  })
})

describe('announcements: the sidebar badge', () => {
  it('shows the unread count on Announcements, and on the closed group', async () => {
    signInWithRole('STUDENT')
    server.use(http.get(`${ORG}/unread-count`, () => HttpResponse.json({ data: { unread_count: 4 } })))
    const { user } = renderRoute('/dashboard/profile')

    const group = await screen.findByRole('button', { name: /Communication/ })
    expect(await within(group).findByLabelText('4 unread')).toBeInTheDocument()
    await user.click(group)

    expect(within(screen.getByRole('link', { name: /Announcements/ })).getByLabelText('4 unread announcements')).toBeInTheDocument()
    expect(within(screen.getByRole('link', { name: /Inbox/ })).queryByLabelText(/unread/)).not.toBeInTheDocument()
  })
})

describe('announcements: managing', () => {
  const OWN = detail({
    id: 'a-own',
    title: 'Homework',
    author: ARBEN,
    audience_kind: 'GROUP',
    group: { id: '5b1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e21', name: 'Group A' },
    can_manage: true,
    can_change_audience: false,
    read_counts: { read_count: 2, audience_size: 5 },
  })

  it('shows managers a status chip on a draft, a scheduled and an archived announcement, and none on a published one', async () => {
    signInWithRole('ADMIN')
    serveList([
      summary({ id: 'a1', title: 'Out', can_manage: true }),
      summary({ id: 'a2', title: 'Later', can_manage: true, status: 'SCHEDULED', publish_at: '2030-01-15T08:30:00.000Z' }),
      summary({ id: 'a3', title: 'Unfinished', can_manage: true, status: 'DRAFT', publish_at: null }),
      summary({ id: 'a4', title: 'Gone', can_manage: true, status: 'ARCHIVED' }),
    ])
    renderRoute('/dashboard/announcements')

    const items = within(await screen.findByRole('list', { name: 'Announcements' })).getAllByRole('listitem')

    expect(within(items[0]).queryByText('Published')).not.toBeInTheDocument()
    expect(within(items[1]).getByText('Scheduled')).toBeInTheDocument()
    expect(within(items[2]).getByText('Draft')).toBeInTheDocument()
    expect(within(items[2]).getByText('Not published')).toBeInTheDocument()
    expect(within(items[3]).getByText('Archived')).toBeInTheDocument()
  })

  it('shows its managers who read it, with Edit and Archive', async () => {
    signInWithRole('LECTURER')
    serveList([summary({ id: 'a-own', title: 'Homework', author: ARBEN, can_manage: true })])
    serveDetail(OWN)
    const { user } = renderRoute('/dashboard/announcements')

    await user.click(await screen.findByRole('button', { name: /Homework/ }))

    const article = await screen.findByRole('article')
    expect(within(article).getByText('Read by 2 of 5')).toBeInTheDocument()
    expect(within(article).getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(within(article).getByRole('button', { name: 'Archive' })).toBeInTheDocument()
  })

  it('archives after a confirmation and shows it archived', async () => {
    signInWithRole('LECTURER')
    serveList([summary({ id: 'a-own', title: 'Homework', author: ARBEN, can_manage: true })])
    serveDetail(OWN)
    server.use(http.post(`${ORG}/a-own/archive`, () => HttpResponse.json({ data: { ...OWN, status: 'ARCHIVED' } })))
    const { user } = renderRoute('/dashboard/announcements')
    await user.click(await screen.findByRole('button', { name: /Homework/ }))

    await user.click(await screen.findByRole('button', { name: 'Archive' }))
    const confirmation = screen.getByRole('group', { name: 'Archive this announcement' })
    await user.click(within(confirmation).getByRole('button', { name: 'Archive' }))

    await waitFor(() => expect(within(screen.getByRole('article')).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument())
    expect(within(screen.getByRole('article')).getByText('Archived')).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Announcements' })).getByText('Archived')).toBeInTheDocument()
  })

  it('edits the text of an announcement that is out, and keeps its audience and timing out of the form', async () => {
    signInWithRole('LECTURER')
    serveList([summary({ id: 'a-own', title: 'Homework', author: ARBEN, can_manage: true })])
    serveDetail(OWN)
    let sent: unknown
    server.use(
      http.put(`${ORG}/a-own`, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ data: { ...OWN, title: 'Homework moved', edited_at: '2026-11-12T12:00:00.000Z' } })
      }),
    )
    const { user } = renderRoute('/dashboard/announcements')
    await user.click(await screen.findByRole('button', { name: /Homework/ }))

    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit announcement' })
    expect(within(dialog).queryByRole('radio')).not.toBeInTheDocument()
    expect(within(dialog).getByText('Group: Group A')).toBeInTheDocument()
    expect(within(dialog).getByText(/Only school staff can change who an announcement is for/)).toBeInTheDocument()
    await user.clear(within(dialog).getByLabelText('Title'))
    await user.type(within(dialog).getByLabelText('Title'), 'Homework moved')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await within(screen.getByRole('article')).findByText('Edited')).toBeInTheDocument()
    expect(within(screen.getByRole('article')).getByRole('heading', { level: 2, name: 'Homework moved' })).toBeInTheDocument()
    expect(sent).toMatchObject({ title: 'Homework moved', audience_kind: 'GROUP', group_id: '5b1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e21' })
    expect(updateAnnouncementSchema.safeParse(sent).success).toBe(true)
  })

  it('lets staff change the audience and schedule of a scheduled announcement', async () => {
    signInWithRole('ADMIN')
    const scheduled = detail({ id: 'a-later', title: 'Later', status: 'SCHEDULED', publish_at: '2030-01-15T08:30:00.000Z', can_manage: true, can_change_audience: true, can_change_publishing: true })
    serveList([summary({ id: 'a-later', title: 'Later', status: 'SCHEDULED', publish_at: scheduled.publish_at, can_manage: true })])
    serveDetail(scheduled)
    serveOptions(STAFF_OPTIONS)
    let sent: unknown
    server.use(
      http.put(`${ORG}/a-later`, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ data: { ...scheduled, audience_kind: 'COURSE', course: { id: STAFF_OPTIONS.courses[0].id, name: 'Mathematics' } } })
      }),
    )
    const { user } = renderRoute('/dashboard/announcements')
    await user.click(await screen.findByRole('button', { name: /Later/ }))

    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit announcement' })
    await within(dialog).findByLabelText('Send to')
    // The saved time is shown on the school's clock: 08:30 UTC is 09:30 in Belgrade
    expect(within(dialog).getByLabelText('Day')).toHaveValue('2030-01-15')
    expect(within(dialog).getByLabelText('Time')).toHaveValue('09:30')
    await user.selectOptions(within(dialog).getByLabelText('Send to'), 'COURSE')
    await user.selectOptions(within(dialog).getByLabelText('Course'), 'Mathematics')
    await user.click(within(dialog).getByRole('button', { name: 'Schedule' }))

    await waitFor(() => expect(sent).toMatchObject({ audience_kind: 'COURSE', course_id: STAFF_OPTIONS.courses[0].id, publish_mode: 'SCHEDULED', publish_at: '2030-01-15T08:30:00.000Z' }))
  })
})

describe('announcements: a stale edit', () => {
  it('reads the announcement again when it went out while the form was open, so the form drops the publishing choice', async () => {
    signInWithRole('ADMIN')
    const scheduled = detail({ id: 'a-later', title: 'Later', status: 'SCHEDULED', publish_at: '2030-01-15T08:30:00.000Z', can_manage: true, can_change_audience: true, can_change_publishing: true })
    let isOut = false
    serveList([summary({ id: 'a-later', title: 'Later', status: 'SCHEDULED', publish_at: scheduled.publish_at, can_manage: true })])
    serveOptions(STAFF_OPTIONS)
    server.use(
      http.get(`${ORG}/a-later`, () => HttpResponse.json({ data: isOut ? { ...scheduled, status: 'PUBLISHED', can_change_publishing: false } : scheduled })),
      http.put(`${ORG}/a-later`, () => {
        isOut = true
        return HttpResponse.json({ error: 'An announcement that is out can’t be rescheduled.' }, { status: 400 })
      }),
    )
    const { user } = renderRoute('/dashboard/announcements')
    await user.click(await screen.findByRole('button', { name: /Later/ }))
    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit announcement' })
    await within(dialog).findByLabelText('Send to')

    await user.click(within(dialog).getByRole('button', { name: 'Schedule' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('can’t be rescheduled')
    await waitFor(() => expect(within(dialog).queryByRole('radio')).not.toBeInTheDocument())
    expect(within(dialog).getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
  })
})

describe('announcements: writing one', () => {
  const kindsIn = (dialog: HTMLElement) => within(within(dialog).getByLabelText('Send to')).getAllByRole('option').map((option) => option.textContent)

  it.each(['OWNER', 'ADMIN'] as const)('lets %s address the whole school, a role, a course or a group', async (role) => {
    signInWithRole(role)
    serveList([])
    serveOptions(STAFF_OPTIONS)
    const { user } = renderRoute('/dashboard/announcements')

    await user.click(await screen.findByRole('button', { name: 'New announcement' }))
    const dialog = await screen.findByRole('dialog', { name: 'New announcement' })
    await within(dialog).findByLabelText('Send to')

    expect(kindsIn(dialog)).toEqual(['Whole school', 'A role', 'A course', 'A group'])
  })

  it('lets a lecturer pick only the groups and courses they teach', async () => {
    signInWithRole('LECTURER')
    serveList([])
    serveOptions(LECTURER_OPTIONS)
    const { user } = renderRoute('/dashboard/announcements')

    await user.click(await screen.findByRole('button', { name: 'New announcement' }))
    const dialog = await screen.findByRole('dialog', { name: 'New announcement' })
    await within(dialog).findByLabelText('Send to')

    expect(kindsIn(dialog)).toEqual(['A course', 'A group'])
    await user.selectOptions(within(dialog).getByLabelText('Send to'), 'GROUP')
    expect(within(within(dialog).getByLabelText('Group')).getAllByRole('option').map((option) => option.textContent)).toEqual(['Choose a group', 'Mathematics · Group A'])
  })

  it('tells a lecturer who teaches nothing that there is nobody to write to', async () => {
    signInWithRole('LECTURER')
    serveList([])
    serveOptions({ can_create: true, can_address_school: false, roles: [], courses: [], groups: [] })
    const { user } = renderRoute('/dashboard/announcements')

    await user.click(await screen.findByRole('button', { name: 'New announcement' }))

    expect(await screen.findByText('There is nobody you can write to yet.')).toBeInTheDocument()
  })

  it('publishes now to the whole school and shows the new announcement first and open', async () => {
    signInWithRole('OWNER')
    serveList([SNOW_DAY])
    serveOptions(STAFF_OPTIONS)
    let sent: unknown
    const created = detail({ id: 'a-new', title: 'Holiday', body: 'No school on Monday.', author: ELSA, can_manage: true, can_change_audience: true })
    serveDetail(created)
    server.use(
      http.post(ORG, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ data: created }, { status: 201 })
      }),
    )
    const { user } = renderRoute('/dashboard/announcements')
    await user.click(await screen.findByRole('button', { name: 'New announcement' }))
    const dialog = await screen.findByRole('dialog', { name: 'New announcement' })
    await within(dialog).findByLabelText('Send to')

    await user.type(within(dialog).getByLabelText('Title'), 'Holiday')
    await user.type(within(dialog).getByLabelText('Message'), 'No school on Monday.')
    expect(within(dialog).getByRole('radio', { name: 'Publish now' })).toBeChecked()
    await user.click(within(dialog).getByRole('button', { name: 'Publish' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'Holiday' })).toBeInTheDocument()
    expect(sent).toEqual({ title: 'Holiday', body: 'No school on Monday.', audience_kind: 'SCHOOL', audience_role: null, course_id: null, group_id: null, publish_mode: 'NOW', publish_at: null })
    expect(createAnnouncementSchema.safeParse(sent).success).toBe(true)
    const [first] = within(screen.getByRole('list', { name: 'Announcements' })).getAllByRole('listitem')
    expect(within(first).getByText('Holiday')).toBeInTheDocument()
  })

  it('saves a draft for a role', async () => {
    signInWithRole('ADMIN')
    serveList([])
    serveOptions(STAFF_OPTIONS)
    let sent: unknown
    const draft = detail({ id: 'a-draft', title: 'Term plan', status: 'DRAFT', publish_at: null, can_manage: true, audience_kind: 'ROLE', audience_role: 'GUARDIAN' })
    serveDetail(draft)
    server.use(
      http.post(ORG, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ data: draft }, { status: 201 })
      }),
    )
    const { user } = renderRoute('/dashboard/announcements')
    await user.click(await screen.findByRole('button', { name: 'New announcement' }))
    const dialog = await screen.findByRole('dialog', { name: 'New announcement' })
    await within(dialog).findByLabelText('Send to')

    await user.type(within(dialog).getByLabelText('Title'), 'Term plan')
    await user.type(within(dialog).getByLabelText('Message'), 'Not final.')
    await user.selectOptions(within(dialog).getByLabelText('Send to'), 'ROLE')
    await user.selectOptions(within(dialog).getByLabelText('Role'), 'All parents')
    await user.click(within(dialog).getByRole('radio', { name: 'Save as draft' }))
    await user.click(within(dialog).getByRole('button', { name: 'Save draft' }))

    expect(await within(screen.getByRole('list', { name: 'Announcements' })).findByText('Draft')).toBeInTheDocument()
    expect(sent).toMatchObject({ audience_kind: 'ROLE', audience_role: 'GUARDIAN', publish_mode: 'DRAFT', publish_at: null })
  })

  it('schedules a group announcement for a day and time on the school’s clock, sent as UTC', async () => {
    signInWithRole('LECTURER')
    serveList([])
    serveOptions(LECTURER_OPTIONS)
    let sent: unknown
    const quiz = detail({ id: 'a-sched', title: 'Quiz', status: 'SCHEDULED', publish_at: '2030-01-15T08:30:00.000Z', can_manage: true })
    serveDetail(quiz)
    server.use(
      http.post(ORG, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ data: quiz }, { status: 201 })
      }),
    )
    const { user } = renderRoute('/dashboard/announcements')
    await user.click(await screen.findByRole('button', { name: 'New announcement' }))
    const dialog = await screen.findByRole('dialog', { name: 'New announcement' })
    await within(dialog).findByLabelText('Send to')

    await user.type(within(dialog).getByLabelText('Title'), 'Quiz')
    await user.type(within(dialog).getByLabelText('Message'), 'Bring a pen.')
    await user.selectOptions(within(dialog).getByLabelText('Send to'), 'GROUP')
    await user.selectOptions(within(dialog).getByLabelText('Group'), 'Mathematics · Group A')
    await user.click(within(dialog).getByRole('radio', { name: 'Schedule' }))
    await user.type(within(dialog).getByLabelText('Day'), '2030-01-15')
    await user.clear(within(dialog).getByLabelText('Time'))
    await user.type(within(dialog).getByLabelText('Time'), '09:30')
    expect(within(dialog).getByText(/Europe\/Belgrade/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Schedule' }))

    await waitFor(() => expect(sent).toMatchObject({ audience_kind: 'GROUP', group_id: STAFF_OPTIONS.groups[0].id, publish_mode: 'SCHEDULED', publish_at: '2030-01-15T08:30:00.000Z' }))
  })

  it('checks the form before sending: title, message, target and a time in the future', async () => {
    signInWithRole('ADMIN')
    serveList([])
    serveOptions(STAFF_OPTIONS)
    let isSent = false
    server.use(http.post(ORG, () => {
      isSent = true
      return HttpResponse.json({ error: 'No' }, { status: 400 })
    }))
    const { user } = renderRoute('/dashboard/announcements')
    await user.click(await screen.findByRole('button', { name: 'New announcement' }))
    const dialog = await screen.findByRole('dialog', { name: 'New announcement' })
    await within(dialog).findByLabelText('Send to')

    await user.selectOptions(within(dialog).getByLabelText('Send to'), 'COURSE')
    await user.click(within(dialog).getByRole('radio', { name: 'Schedule' }))
    await user.type(within(dialog).getByLabelText('Day'), '2020-01-15')
    await user.click(within(dialog).getByRole('button', { name: 'Schedule' }))

    expect(await within(dialog).findByText('Write a title.')).toBeInTheDocument()
    expect(within(dialog).getByText('Write a message.')).toBeInTheDocument()
    expect(within(dialog).getByText('Choose a course.')).toBeInTheDocument()
    expect(within(dialog).getByText('Choose a time in the future.')).toBeInTheDocument()
    expect(isSent).toBe(false)
  })

  it('shows the server’s refusal in the form', async () => {
    signInWithRole('LECTURER')
    serveList([])
    serveOptions(LECTURER_OPTIONS)
    server.use(http.post(ORG, () => HttpResponse.json({ error: 'You can only write to the groups and courses you currently teach.' }, { status: 403 })))
    const { user } = renderRoute('/dashboard/announcements')
    await user.click(await screen.findByRole('button', { name: 'New announcement' }))
    const dialog = await screen.findByRole('dialog', { name: 'New announcement' })
    await within(dialog).findByLabelText('Send to')

    await user.type(within(dialog).getByLabelText('Title'), 'Quiz')
    await user.type(within(dialog).getByLabelText('Message'), 'Bring a pen.')
    await user.selectOptions(within(dialog).getByLabelText('Send to'), 'COURSE')
    await user.selectOptions(within(dialog).getByLabelText('Course'), 'Mathematics')
    await user.click(within(dialog).getByRole('button', { name: 'Publish' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('You can only write to the groups and courses you currently teach.')
  })
})
