import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import type { AuthUser } from '@shigjetademy/shared/auth'
import type { StudentNoteEntry } from '@shigjetademy/shared/student-notes'
import type { StudentRosterDetail } from '@shigjetademy/shared/student-roster'
import { buildUser, DEFAULT_SETTINGS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const LECTURER_MEMBERSHIPS: AuthUser['memberships'] = [
  { id: 'membership-8', role: 'LECTURER', permissions: [], organization: { id: 'org-1', name: 'Oxford Academy', type: 'ACADEMY', status: 'ACTIVE', ...DEFAULT_SETTINGS } },
]

const DETAIL: StudentRosterDetail = {
  student: { id: 'student-1', first_name: 'Alba', last_name: 'Gashi' },
  groups: [{ id: '00000000-0000-4000-8000-000000000001', name: 'Group A' }],
  attendance: [
    { date: '2026-09-21', group: { id: '00000000-0000-4000-8000-000000000001', name: 'Group A' }, start_time: '17:00', status: 'ABSENT' },
    { date: '2026-09-14', group: { id: '00000000-0000-4000-8000-000000000001', name: 'Group A' }, start_time: '17:00', status: 'TARDY' },
    { date: '2026-09-07', group: { id: '00000000-0000-4000-8000-000000000001', name: 'Group A' }, start_time: '17:00', status: 'PRESENT' },
  ],
  summary: { present: 1, tardy: 1, absent: 1, rate: 67 },
}

const DETAIL_PATH = `/dashboard/my-students/${DETAIL.student.id}`

const signInAsLecturer = () => signInAs(buildUser({ first_name: 'Arben', last_name: 'Hoxha', email: 'arben@lecturer.test', memberships: LECTURER_MEMBERSHIPS }))

const serveStudent = (detail: StudentRosterDetail | null, status = 200) =>
  server.use(http.get(`*/api/organizations/org-1/my-students/${DETAIL.student.id}`, () => HttpResponse.json(detail ? { data: detail } : { error: 'Not found' }, { status })))

const NOTES_PATH = `*/api/organizations/org-1/my-students/${DETAIL.student.id}/notes`

const serveNotes = (notes: StudentNoteEntry[]) => server.use(http.get(NOTES_PATH, () => HttpResponse.json({ data: notes })))

afterEach(() => {
  server.resetHandlers()
})

describe('StudentDetailPage', () => {
  it('shows the student’s name, groups, attendance rate and history, newest first', async () => {
    signInAsLecturer()
    serveStudent(DETAIL)
    serveNotes([])
    renderRoute(DETAIL_PATH)

    expect(await screen.findByRole('heading', { name: 'Alba Gashi' })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Groups' })).getByText('Group A')).toBeInTheDocument()
    expect(screen.getByText('67%')).toBeInTheDocument()

    const history = screen.getByRole('list', { name: 'Attendance history' })
    const rows = within(history).getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('Absent')
    expect(rows[1]).toHaveTextContent('Tardy')
    expect(rows[2]).toHaveTextContent('Present')
  })

  it('shows "No attendance recorded yet" instead of a 0% rate when nothing is marked', async () => {
    signInAsLecturer()
    serveStudent({ ...DETAIL, attendance: [], summary: { present: 0, tardy: 0, absent: 0, rate: null } })
    serveNotes([])
    renderRoute(DETAIL_PATH)

    await screen.findByRole('heading', { name: 'Alba Gashi' })
    expect(screen.getByText('No attendance recorded yet.')).toBeInTheDocument()
    expect(screen.getByText('No attendance recorded yet', { selector: 'p' })).toBeInTheDocument()
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
  })

  it('shows a not-found message for a student outside the lecturer’s groups', async () => {
    signInAsLecturer()
    serveStudent(null, 403)
    renderRoute(DETAIL_PATH)

    expect(await screen.findByText('Student not found.')).toBeInTheDocument()
  })
})

const NOTE: StudentNoteEntry = { id: 'note-1', body: 'Struggling with fractions.', group: { id: '00000000-0000-4000-8000-000000000001', name: 'Group A' }, lecturer: { first_name: 'Arben', last_name: 'Hoxha' }, created_at: '2026-10-01T09:00:00.000Z' }

describe('StudentDetailPage: notes', () => {
  it('shows "No notes yet" when none are written', async () => {
    signInAsLecturer()
    serveStudent(DETAIL)
    serveNotes([])
    renderRoute(DETAIL_PATH)

    await screen.findByRole('heading', { name: 'Alba Gashi' })
    expect(await screen.findByText('No notes yet')).toBeInTheDocument()
  })

  it('lists notes newest first with the body, group, author and when', async () => {
    signInAsLecturer()
    serveStudent(DETAIL)
    serveNotes([NOTE])
    renderRoute(DETAIL_PATH)

    const list = await screen.findByRole('list', { name: 'Notes' })
    const row = within(list).getByText('Struggling with fractions.').closest('li')
    expect(row).not.toBeNull()
    expect(row).toHaveTextContent('Group A')
    expect(row).toHaveTextContent('Arben Hoxha')
  })

  it('defaults the group to the only one when the student shares just one, and adds the note on submit', async () => {
    const user = userEvent.setup()
    signInAsLecturer()
    serveStudent(DETAIL)
    const notes: StudentNoteEntry[] = []
    let created: unknown
    server.use(
      http.get(NOTES_PATH, () => HttpResponse.json({ data: notes })),
      http.post(NOTES_PATH, async ({ request }) => {
        created = await request.json()
        notes.unshift(NOTE)
        return HttpResponse.json({ data: NOTE }, { status: 201 })
      }),
    )
    renderRoute(DETAIL_PATH)
    await screen.findByRole('heading', { name: 'Alba Gashi' })

    expect(screen.queryByRole('combobox', { name: 'Group' })).not.toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Note' }), 'Struggling with fractions.')
    await user.click(screen.getByRole('button', { name: 'Add note' }))

    await screen.findByText('Struggling with fractions.')
    expect(created).toEqual({ group_id: '00000000-0000-4000-8000-000000000001', body: 'Struggling with fractions.' })
  })

  it('asks which group when the student shares more than one', async () => {
    signInAsLecturer()
    serveStudent({ ...DETAIL, groups: [{ id: '00000000-0000-4000-8000-000000000001', name: 'Group A' }, { id: '00000000-0000-4000-8000-000000000002', name: 'Group B' }] })
    serveNotes([])
    renderRoute(DETAIL_PATH)
    await screen.findByRole('heading', { name: 'Alba Gashi' })

    const select = screen.getByRole('combobox', { name: 'Group' })
    expect(within(select).getByRole('option', { name: 'Group A' })).toBeInTheDocument()
    expect(within(select).getByRole('option', { name: 'Group B' })).toBeInTheDocument()
  })
})
