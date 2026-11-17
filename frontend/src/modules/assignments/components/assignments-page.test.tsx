import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthUser, MemberRole, Permission } from '@shigjetademy/shared/auth'
import type { Assignment, AssignmentDetail, AssignmentGroup, AssignmentHandIn, StudentAssignment } from '@shigjetademy/shared/assignments'
import { buildUser, DEFAULT_SETTINGS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const ORG = '*/api/organizations/org-1/assignments'

const membershipWith = (role: MemberRole, permissions: Permission[] = []): AuthUser['memberships'][number] => ({
  id: 'membership-me',
  role,
  permissions,
  organization: { id: 'org-1', name: 'Oxford Academy', type: 'ACADEMY', status: 'ACTIVE', ...DEFAULT_SETTINGS },
})

const signInWithRole = (role: MemberRole, permissions: Permission[] = []) => signInAs(buildUser({ id: 'user-me', memberships: [membershipWith(role, permissions)] }))

const ARBEN = { membership_id: 'membership-arben', first_name: 'Arben', last_name: 'Hoxha' }

const GROUP_A_ID = '5b1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e21'
const GROUP_B_ID = '5b1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e22'

const GROUP_A: AssignmentGroup = { id: GROUP_A_ID, name: 'Group A', course_name: 'Mathematics', is_archived: false, can_set: true }
const GROUP_B: AssignmentGroup = { id: GROUP_B_ID, name: 'Group B', course_name: 'Physics', is_archived: false, can_set: true }

const assignment = (overrides: Partial<Assignment> & Pick<Assignment, 'id' | 'title'>): Assignment => ({
  group: { id: GROUP_A_ID, name: 'Group A', course_name: 'Mathematics' },
  instructions: 'Answer questions 1 to 5.',
  due_at: '2026-11-20T16:00:00.000Z',
  max_points: 20,
  accepts_late_hand_ins: true,
  file: null,
  author: ARBEN,
  created_at: '2026-11-10T11:00:00.000Z',
  updated_at: '2026-11-10T11:00:00.000Z',
  can_edit: true,
  can_remove: true,
  ...overrides,
})

const serveGroups = (groups: AssignmentGroup[]) => server.use(http.get(`${ORG}/groups`, () => HttpResponse.json({ data: groups })))

/** Serves each group's assignments by the group in the query */
const serveAssignments = (byGroup: Record<string, Assignment[]>) =>
  server.use(
    http.get(ORG, ({ request }) => {
      const groupId = new URL(request.url).searchParams.get('group_id') ?? ''
      return HttpResponse.json({ data: byGroup[groupId] ?? [] })
    }),
  )

/** A text field of a multipart body read as text */
const fieldOf = ({ body, name }: { body: string; name: string }) => new RegExp(`name="${name}"\r\n\r\n([^\r]*)\r\n`).exec(body)?.[1]

describe('assignments: setting', () => {
  it('shows a lecturer the first group’s assignments and switches group with the picker', async () => {
    signInWithRole('LECTURER')
    serveGroups([GROUP_A, GROUP_B])
    serveAssignments({ [GROUP_A_ID]: [assignment({ id: 'a-1', title: 'Limits worksheet' })], [GROUP_B_ID]: [assignment({ id: 'a-2', title: 'Forces lab report' })] })
    const { user } = renderRoute('/dashboard/assignments')

    expect(await screen.findByRole('heading', { level: 1, name: 'Assignments' })).toBeInTheDocument()
    expect(await screen.findByText('Limits worksheet')).toBeInTheDocument()
    expect(screen.getByText('Out of 20 points')).toBeInTheDocument()
    expect(screen.queryByText('No late hand-ins')).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Group'), 'Group B · Physics')

    expect(await screen.findByText('Forces lab report')).toBeInTheDocument()
    expect(screen.queryByText('Limits worksheet')).not.toBeInTheDocument()
  })

  it('sets an assignment with its due time in the school’s time zone, and checks the fields first', async () => {
    signInWithRole('LECTURER')
    serveGroups([GROUP_A])
    serveAssignments({})
    let sent = ''
    server.use(
      http.post(ORG, async ({ request }) => {
        sent = await request.text()
        return HttpResponse.json({ data: assignment({ id: 'a-new', title: 'Limits worksheet' }) }, { status: 201 })
      }),
    )
    const { user } = renderRoute('/dashboard/assignments')

    await user.click(await screen.findByRole('button', { name: 'Set assignment' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Set assignment' }))
    await user.click(dialog.getByRole('button', { name: 'Set assignment' }))
    expect(await dialog.findByText('Write a title.')).toBeInTheDocument()
    expect(dialog.getByText('Write the instructions.')).toBeInTheDocument()
    expect(dialog.getByText('Choose a due day.')).toBeInTheDocument()
    expect(sent).toBe('')

    await user.type(dialog.getByLabelText('Title'), 'Limits worksheet')
    await user.type(dialog.getByLabelText('Instructions'), 'Answer questions 1 to 5.')
    await user.type(dialog.getByLabelText('Due day'), '2026-11-20')
    await user.type(dialog.getByLabelText('Due time'), '17:00')
    await user.type(dialog.getByLabelText(/Max points/), '20')
    await user.click(dialog.getByRole('button', { name: 'Set assignment' }))

    expect(await screen.findByText('Limits worksheet')).toBeInTheDocument()
    expect(fieldOf({ body: sent, name: 'group_id' })).toBe(GROUP_A_ID)
    expect(fieldOf({ body: sent, name: 'title' })).toBe('Limits worksheet')
    // 17:00 in Belgrade is 16:00 UTC in November
    expect(fieldOf({ body: sent, name: 'due_at' })).toBe('2026-11-20T16:00:00.000Z')
    expect(fieldOf({ body: sent, name: 'max_points' })).toBe('20')
    expect(fieldOf({ body: sent, name: 'accepts_late_hand_ins' })).toBe('true')
    expect(sent).not.toContain('name="file"')
    expect(screen.queryByRole('dialog', { name: 'Set assignment' })).not.toBeInTheDocument()
  })

  it('starts the form with no file after a file was chosen and the dialog cancelled', async () => {
    signInWithRole('LECTURER')
    serveGroups([GROUP_A])
    serveAssignments({})
    const { user } = renderRoute('/dashboard/assignments')

    await user.click(await screen.findByRole('button', { name: 'Set assignment' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Set assignment' }))
    await user.upload(dialog.getByLabelText(/^File/, { selector: 'input[type="file"]' }), new File(['%PDF-1.7'], 'questions.pdf', { type: 'application/pdf' }))
    await user.click(dialog.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Set assignment' }))

    const reopened = within(screen.getByRole('dialog', { name: 'Set assignment' }))
    expect(reopened.getByLabelText<HTMLInputElement>(/^File/, { selector: 'input[type="file"]' }).files).toHaveLength(0)
  })

  it('edits an assignment from its menu, starting from what is saved', async () => {
    signInWithRole('LECTURER')
    serveGroups([GROUP_A])
    const saved = assignment({ id: 'a-1', title: 'Limits worksheet' })
    serveAssignments({ [GROUP_A_ID]: [saved] })
    let sent = ''
    server.use(
      http.put(`${ORG}/a-1`, async ({ request }) => {
        sent = await request.text()
        return HttpResponse.json({ data: { ...saved, title: 'Limits worksheet (v2)', max_points: null } })
      }),
    )
    const { user } = renderRoute('/dashboard/assignments')

    await user.click(await screen.findByRole('button', { name: 'Actions for Limits worksheet' }))
    await user.click(screen.getByRole('menuitem', { name: 'Edit assignment' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Edit assignment' }))
    expect(dialog.getByLabelText('Title')).toHaveValue('Limits worksheet')
    expect(dialog.getByLabelText('Due day')).toHaveValue('2026-11-20')
    expect(dialog.getByLabelText('Due time')).toHaveValue('17:00')
    await user.clear(dialog.getByLabelText('Title'))
    await user.type(dialog.getByLabelText('Title'), 'Limits worksheet (v2)')
    await user.clear(dialog.getByLabelText(/Max points/))
    expect(dialog.getByRole('checkbox', { name: 'Accept late hand-ins' })).toBeChecked()
    await user.click(dialog.getByRole('checkbox', { name: 'Accept late hand-ins' }))
    await user.click(dialog.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Limits worksheet (v2)')).toBeInTheDocument()
    expect(fieldOf({ body: sent, name: 'accepts_late_hand_ins' })).toBe('false')
    expect(fieldOf({ body: sent, name: 'title' })).toBe('Limits worksheet (v2)')
    expect(fieldOf({ body: sent, name: 'max_points' })).toBe('')
    expect(fieldOf({ body: sent, name: 'remove_file' })).toBe('false')
  })

  it('removes an assignment after one confirmation', async () => {
    signInWithRole('OWNER')
    serveGroups([GROUP_A])
    serveAssignments({ [GROUP_A_ID]: [assignment({ id: 'a-1', title: 'Limits worksheet' }), assignment({ id: 'a-2', title: 'Derivatives quiz' })] })
    let removedId: string | null = null
    server.use(
      http.delete(`${ORG}/:assignmentId`, ({ params }) => {
        removedId = String(params.assignmentId)
        return HttpResponse.json({ data: { id: removedId } })
      }),
    )
    const { user } = renderRoute('/dashboard/assignments')

    await user.click(await screen.findByRole('button', { name: 'Actions for Limits worksheet' }))
    await user.click(screen.getByRole('menuitem', { name: 'Remove assignment' }))
    const confirm = within(screen.getByRole('group', { name: 'Remove Limits worksheet' }))
    expect(confirm.getByText('Remove this assignment and its hand-ins?')).toBeInTheDocument()
    await user.click(confirm.getByRole('button', { name: 'Remove' }))

    await waitFor(() => expect(screen.queryByText('Limits worksheet')).not.toBeInTheDocument())
    expect(removedId).toBe('a-1')
    expect(screen.getByText('Derivatives quiz')).toBeInTheDocument()
  })

  it('says when the lecturer teaches no group, and when a group has no assignments yet', async () => {
    signInWithRole('LECTURER')
    serveGroups([GROUP_A])
    serveAssignments({})
    renderRoute('/dashboard/assignments')

    expect(await screen.findByText('No assignments here yet.')).toBeInTheDocument()
  })
})

const studentAssignment = (overrides: Partial<StudentAssignment> & Pick<StudentAssignment, 'id' | 'title'>): StudentAssignment => ({
  ...assignment({ id: overrides.id, title: overrides.title, can_edit: false, can_remove: false }),
  status: 'NOT_HANDED_IN',
  hand_in: null,
  is_closed: false,
  can_hand_in: true,
  ...overrides,
})

const handedIn = (overrides: Partial<AssignmentHandIn> = {}): AssignmentHandIn => ({
  id: 'h-1',
  text: 'My answers.',
  file: null,
  submitted_at: '2026-11-19T10:00:00.000Z',
  is_late: false,
  mark: null,
  ...overrides,
})

const serveMine = (assignments: StudentAssignment[]) => server.use(http.get(`${ORG}/mine`, () => HttpResponse.json({ data: assignments })))

describe('assignments: handing in', () => {
  it('shows a student what is to do, soonest due first, and what is done, with late hand-ins flagged', async () => {
    signInWithRole('STUDENT')
    serveMine([
      studentAssignment({ id: 'a-1', title: 'Limits worksheet', due_at: '2026-11-20T16:00:00.000Z' }),
      studentAssignment({ id: 'a-2', title: 'Essay draft', status: 'LATE', hand_in: handedIn({ is_late: true }) }),
      studentAssignment({ id: 'a-3', title: 'Derivatives quiz', due_at: '2026-11-27T16:00:00.000Z', group: { id: GROUP_B_ID, name: 'Group B', course_name: 'Physics' } }),
    ])
    renderRoute('/dashboard/assignments')

    const toDo = within(await screen.findByRole('region', { name: 'To do' }))
    expect(toDo.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['Limits worksheet', 'Derivatives quiz'])
    expect(toDo.getByText('Group B · Physics')).toBeInTheDocument()
    const done = within(screen.getByRole('region', { name: 'Done' }))
    expect(done.getByText('Essay draft')).toBeInTheDocument()
    expect(done.getByText('Late')).toBeInTheDocument()
    expect(done.getByText('My answers.')).toBeInTheDocument()
  })

  it('hands in text and a file, and moves the assignment to Done', async () => {
    signInWithRole('STUDENT')
    const todo = studentAssignment({ id: 'a-1', title: 'Limits worksheet' })
    serveMine([todo])
    let sent = ''
    server.use(
      http.put(`${ORG}/a-1/submission`, async ({ request }) => {
        sent = await request.text()
        return HttpResponse.json({ data: { ...todo, status: 'HANDED_IN', hand_in: handedIn({ text: 'x = 2', file: { name: 'working.pdf', type: 'application/pdf', size: 1200 } }) } })
      }),
    )
    const { user } = renderRoute('/dashboard/assignments')

    await user.click(await screen.findByRole('button', { name: 'Hand in Limits worksheet' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Hand in' }))
    await user.click(dialog.getByRole('button', { name: 'Hand in' }))
    expect(await dialog.findByText('Write your answer or attach a file.')).toBeInTheDocument()
    expect(sent).toBe('')

    await user.type(dialog.getByLabelText('Your answer'), 'x = 2')
    await user.upload(dialog.getByLabelText(/^File/, { selector: 'input[type="file"]' }), new File(['%PDF-1.7'], 'working.pdf', { type: 'application/pdf' }))
    await user.click(dialog.getByRole('button', { name: 'Hand in' }))

    const done = within(await screen.findByRole('region', { name: 'Done' }))
    expect(done.getByText('x = 2')).toBeInTheDocument()
    expect(done.getByText(/^working\.pdf · /)).toBeInTheDocument()
    expect(fieldOf({ body: sent, name: 'text' })).toBe('x = 2')
    expect(fieldOf({ body: sent, name: 'keep_file' })).toBe('false')
    expect(sent).toContain('name="file"; filename="working.pdf"')
  })

  it('starts the hand-in with no new file after one was chosen and the dialog cancelled', async () => {
    signInWithRole('STUDENT')
    serveMine([studentAssignment({ id: 'a-1', title: 'Limits worksheet' })])
    const { user } = renderRoute('/dashboard/assignments')

    await user.click(await screen.findByRole('button', { name: 'Hand in Limits worksheet' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Hand in' }))
    await user.upload(dialog.getByLabelText(/^File/, { selector: 'input[type="file"]' }), new File(['%PDF-1.7'], 'working.pdf', { type: 'application/pdf' }))
    await user.click(dialog.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Hand in Limits worksheet' }))

    const reopened = within(screen.getByRole('dialog', { name: 'Hand in' }))
    expect(reopened.getByLabelText<HTMLInputElement>(/^File/, { selector: 'input[type="file"]' }).files).toHaveLength(0)
  })

  it('replaces a hand-in, keeping the file handed in before unless the student drops it', async () => {
    signInWithRole('STUDENT')
    const done = studentAssignment({ id: 'a-1', title: 'Limits worksheet', status: 'HANDED_IN', hand_in: handedIn({ file: { name: 'working.pdf', type: 'application/pdf', size: 1200 } }) })
    serveMine([done])
    let sent = ''
    server.use(
      http.put(`${ORG}/a-1/submission`, async ({ request }) => {
        sent = await request.text()
        return HttpResponse.json({ data: done })
      }),
    )
    const { user } = renderRoute('/dashboard/assignments')

    await user.click(await screen.findByRole('button', { name: 'Replace hand-in for Limits worksheet' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Replace hand-in' }))
    expect(dialog.getByLabelText('Your answer')).toHaveValue('My answers.')
    expect(dialog.getByRole('checkbox', { name: 'Keep working.pdf' })).toBeChecked()
    await user.click(dialog.getByRole('button', { name: 'Hand in' }))

    await waitFor(() => expect(fieldOf({ body: sent, name: 'keep_file' })).toBe('true'))
    expect(fieldOf({ body: sent, name: 'text' })).toBe('My answers.')
  })

  it('shows Closed and no Hand in button once the due date passed with late hand-ins off', async () => {
    signInWithRole('STUDENT')
    serveMine([studentAssignment({ id: 'a-1', title: 'Limits worksheet', due_at: '2026-11-01T16:00:00.000Z', accepts_late_hand_ins: false, is_closed: true, can_hand_in: false })])
    renderRoute('/dashboard/assignments')

    const toDo = within(await screen.findByRole('region', { name: 'To do' }))
    expect(toDo.getByText('Closed')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Hand in/ })).not.toBeInTheDocument()
  })

  it('says when the student has no assignments yet', async () => {
    signInWithRole('STUDENT')
    serveMine([])
    renderRoute('/dashboard/assignments')

    expect(await screen.findByText('No assignments yet.')).toBeInTheDocument()
  })
})

const detailOf = (overrides: Partial<AssignmentDetail> = {}): AssignmentDetail => ({
  ...assignment({ id: 'a-1', title: 'Limits worksheet', file: { name: 'questions.pdf', type: 'application/pdf', size: 2048 } }),
  hand_ins: [
    { student: { id: 's-alba', first_name: 'Alba', last_name: 'Krasniqi', student_number: 'STU-1' }, status: 'LATE', hand_in: handedIn({ id: 'h-alba', text: 'x = 2', is_late: true, file: { name: 'working.pdf', type: 'application/pdf', size: 1200 } }) },
    { student: { id: 's-dren', first_name: 'Dren', last_name: 'Morina', student_number: 'STU-3' }, status: 'NOT_HANDED_IN', hand_in: null },
    { student: { id: 's-erza', first_name: 'Erza', last_name: 'Shala', student_number: 'STU-4' }, status: 'HANDED_IN', hand_in: handedIn({ id: 'h-erza', text: 'On time.' }) },
  ],
  ...overrides,
})

const serveDetail = (detail: AssignmentDetail) => server.use(http.get(`${ORG}/${detail.id}`, () => HttpResponse.json({ data: detail })))

/** Stands in for the browser saving a fetched file, and records the file's name and text */
const catchSavedFiles = () => {
  const saved: { name: string; text: Promise<string> }[] = []
  const blobs = new Map<string, Blob>()
  Object.assign(URL, {
    createObjectURL: vi.fn((blob: Blob) => {
      const url = `blob:${blobs.size}`
      blobs.set(url, blob)
      return url
    }),
    revokeObjectURL: vi.fn(),
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function saveLink(this: HTMLAnchorElement) {
    saved.push({ name: this.download, text: blobs.get(this.href)?.text() ?? Promise.resolve('') })
  })
  return saved
}

describe('assignments: reviewing hand-ins', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens an assignment from the list and shows every student with where their hand-in stands', async () => {
    signInWithRole('LECTURER')
    serveGroups([GROUP_A])
    serveAssignments({ [GROUP_A_ID]: [assignment({ id: 'a-1', title: 'Limits worksheet' })] })
    serveDetail(detailOf({ accepts_late_hand_ins: false }))
    const { user, router } = renderRoute('/dashboard/assignments')

    await user.click(await screen.findByRole('link', { name: 'Limits worksheet' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/assignments/a-1'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Limits worksheet' })).toBeInTheDocument()
    expect(screen.getByText('No late hand-ins')).toBeInTheDocument()
    const handIns = within(screen.getByRole('list', { name: 'Hand-ins' }))
    const rows = handIns.getAllByRole('listitem')
    expect(rows.map((row) => within(row).getByRole('heading', { level: 3 }).textContent)).toEqual(['Alba Krasniqi', 'Dren Morina', 'Erza Shala'])
    // Each row also holds its closed hand-in dialog, which is left out
    expect(within(rows[0]).getByText('Late', { ignore: 'dialog *' })).toBeInTheDocument()
    expect(within(rows[1]).getByText('Not handed in', { ignore: 'dialog *' })).toBeInTheDocument()
    expect(within(rows[2]).getByText('Handed in', { ignore: 'dialog *' })).toBeInTheDocument()
    expect(within(rows[1]).queryByRole('button', { name: /Open/ })).not.toBeInTheDocument()
  })

  it('opens a student’s text and downloads their file with the member’s token', async () => {
    signInWithRole('LECTURER')
    serveDetail(detailOf())
    let authorization: string | null = null
    server.use(
      http.get(`${ORG}/a-1/submissions/h-alba/download`, ({ request }) => {
        authorization = request.headers.get('Authorization')
        return new HttpResponse('%PDF-1.7 working', { headers: { 'Content-Type': 'application/pdf' } })
      }),
    )
    const saved = catchSavedFiles()
    const { user } = renderRoute('/dashboard/assignments/a-1')

    await user.click(await screen.findByRole('button', { name: 'Open Alba Krasniqi’s hand-in' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Alba Krasniqi’s hand-in' }))
    expect(dialog.getByText('x = 2')).toBeInTheDocument()
    expect(dialog.getByText('Late')).toBeInTheDocument()
    await user.click(dialog.getByRole('button', { name: 'Download working.pdf' }))

    await waitFor(() => expect(saved).toHaveLength(1))
    expect(saved[0].name).toBe('working.pdf')
    expect(await saved[0].text).toBe('%PDF-1.7 working')
    expect(authorization).toBe('Bearer access-token')
  })

  it('lets a student download the file they handed in', async () => {
    signInWithRole('STUDENT')
    serveMine([studentAssignment({ id: 'a-1', title: 'Limits worksheet', status: 'HANDED_IN', hand_in: handedIn({ id: 'h-1', file: { name: 'working.pdf', type: 'application/pdf', size: 1200 } }) })])
    server.use(http.get(`${ORG}/a-1/submissions/h-1/download`, () => new HttpResponse('mine', { headers: { 'Content-Type': 'application/pdf' } })))
    const saved = catchSavedFiles()
    const { user } = renderRoute('/dashboard/assignments')

    await user.click(await screen.findByRole('button', { name: 'Download working.pdf' }))

    await waitFor(() => expect(saved).toHaveLength(1))
    expect(await saved[0].text).toBe('mine')
  })

  it('says when the assignment is not found', async () => {
    signInWithRole('LECTURER')
    server.use(http.get(`${ORG}/a-gone`, () => HttpResponse.json({ error: 'Assignment not found' }, { status: 404 })))
    renderRoute('/dashboard/assignments/a-gone')

    expect(await screen.findByText('Assignment not found.')).toBeInTheDocument()
  })
})

describe('assignments: marking', () => {
  it('marks a hand-in with points and feedback, and shows it as marked', async () => {
    signInWithRole('LECTURER')
    const detail = detailOf()
    serveDetail(detail)
    let sent: unknown = null
    server.use(
      http.put(`${ORG}/a-1/submissions/h-alba/mark`, async ({ request }) => {
        sent = await request.json()
        const row = detail.hand_ins[0]
        return HttpResponse.json({ data: { ...row, status: 'MARKED', hand_in: { ...row.hand_in, mark: { points: 18, feedback: 'Good work.', marked_at: '2026-11-21T10:00:00.000Z' } } } })
      }),
    )
    const { user } = renderRoute('/dashboard/assignments/a-1')

    await user.click(await screen.findByRole('button', { name: 'Open Alba Krasniqi’s hand-in' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Alba Krasniqi’s hand-in' }))
    await user.type(dialog.getByLabelText(/Points/), '21')
    await user.click(dialog.getByRole('button', { name: 'Save mark' }))
    expect(await dialog.findByText('Points can be at most 20.')).toBeInTheDocument()
    expect(sent).toBeNull()

    await user.clear(dialog.getByLabelText(/Points/))
    await user.type(dialog.getByLabelText(/Points/), '18')
    await user.type(dialog.getByLabelText('Feedback'), 'Good work.')
    await user.click(dialog.getByRole('button', { name: 'Save mark' }))

    await waitFor(() => expect(sent).toEqual({ points: 18, feedback: 'Good work.' }))
    expect(await dialog.findByText('Mark saved. The student sees it now.')).toBeInTheDocument()
    expect(dialog.getByLabelText(/Points/)).toHaveValue('18')
    const row = within(screen.getByRole('list', { name: 'Hand-ins' })).getAllByRole('listitem')[0]
    expect(await within(row).findByText('Marked', { ignore: 'dialog *' })).toBeInTheDocument()
  })

  it('starts from the saved mark so the lecturer can change it', async () => {
    signInWithRole('LECTURER')
    const detail = detailOf()
    const row = detail.hand_ins[2]
    serveDetail({ ...detail, hand_ins: [{ ...row, status: 'MARKED', hand_in: handedIn({ id: 'h-erza', mark: { points: 15, feedback: 'Fine.', marked_at: '2026-11-21T10:00:00.000Z' } }) }] })
    const { user } = renderRoute('/dashboard/assignments/a-1')

    await user.click(await screen.findByRole('button', { name: 'Open Erza Shala’s hand-in' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Erza Shala’s hand-in' }))

    expect(dialog.getByLabelText(/Points/)).toHaveValue('15')
    expect(dialog.getByLabelText('Feedback')).toHaveValue('Fine.')
  })

  it('shows the student their mark and feedback, with no way to hand in again', async () => {
    signInWithRole('STUDENT')
    serveMine([studentAssignment({ id: 'a-1', title: 'Limits worksheet', status: 'MARKED', can_hand_in: false, hand_in: handedIn({ mark: { points: 18, feedback: 'Good work.', marked_at: '2026-11-21T10:00:00.000Z' } }) })])
    renderRoute('/dashboard/assignments')

    const done = within(await screen.findByRole('region', { name: 'Done' }))
    expect(done.getByText('18 / 20 points')).toBeInTheDocument()
    expect(done.getByText('Good work.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Replace hand-in/ })).not.toBeInTheDocument()
  })
})

describe('assignments: archived groups', () => {
  it('hides Set assignment and the menus in an archived group, and says it is read-only', async () => {
    signInWithRole('LECTURER')
    serveGroups([{ ...GROUP_A, is_archived: true, can_set: false }])
    serveAssignments({ [GROUP_A_ID]: [assignment({ id: 'a-old', title: 'Last year’s essay', can_edit: false, can_remove: false })] })
    renderRoute('/dashboard/assignments')

    expect(await screen.findByText('Last year’s essay')).toBeInTheDocument()
    expect(screen.getByText('This group is archived. Its assignments and hand-ins stay readable, and nothing can be changed.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Set assignment' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Actions for/ })).not.toBeInTheDocument()
  })

  it('shows a lecturer an archived group’s hand-ins without a mark form', async () => {
    signInWithRole('LECTURER')
    serveDetail(detailOf({ can_edit: false, can_remove: false }))
    const { user } = renderRoute('/dashboard/assignments/a-1')

    await user.click(await screen.findByRole('button', { name: 'Open Alba Krasniqi’s hand-in' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Alba Krasniqi’s hand-in' }))

    expect(dialog.getByText('Not marked.')).toBeInTheDocument()
    expect(dialog.queryByRole('button', { name: 'Save mark' })).not.toBeInTheDocument()
  })
})

describe('assignments: navigation', () => {
  it.each(['LECTURER', 'STUDENT', 'OWNER'] as const)('has an Assignments link in the %s sidebar', async (role) => {
    signInWithRole(role)
    serveGroups([])
    serveAssignments({})
    serveMine([])
    renderRoute('/dashboard/assignments')

    const sidebar = within(await screen.findByRole('navigation', { name: 'Modules' }))
    expect(await sidebar.findByRole('link', { name: 'Assignments' })).toHaveAttribute('href', '/dashboard/assignments')
  })

  it('opens the page for an admin with Grades, with the link in their sidebar', async () => {
    signInWithRole('ADMIN', ['MANAGE_GRADES'])
    serveGroups([GROUP_A])
    serveAssignments({})
    renderRoute('/dashboard/assignments')

    expect(await screen.findByRole('heading', { level: 1, name: 'Assignments' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Modules' })).getByRole('link', { name: 'Assignments' })).toHaveAttribute('href', '/dashboard/assignments')
  })

  it('sends an admin without Grades back to their dashboard and leaves the link out', async () => {
    signInWithRole('ADMIN')
    server.use(http.get('*/api/organizations/org-1/academic-periods/years', () => HttpResponse.json({ data: [] })))
    const { router } = renderRoute('/dashboard/assignments')

    const sidebar = within(await screen.findByRole('navigation', { name: 'Modules' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/academic-periods'))
    expect(sidebar.queryByRole('link', { name: 'Assignments' })).not.toBeInTheDocument()
  })
})
