import { screen, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStudentSchema, updateStudentSchema } from '@shigjetademy/shared/students'
import type { Student, StudentPage, StudentStatus } from '@shigjetademy/shared/students'
import { buildUser, OWNER_MEMBERSHIPS, signInAs, YLLKA_ADMIN_MEMBERSHIP } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const ARTA: Student = {
  id: '9b1c2f43-0d1e-4c55-9a3e-6b1f0c2a1a01',
  first_name: 'Arta',
  last_name: 'Gashi',
  date_of_birth: '2019-03-14',
  student_number: 'STU-0001',
  enrolled_on: '2025-09-01',
  status: 'ACTIVE',
  notes: null,
  created_at: '2026-10-01T09:00:00.000Z',
  login_status: 'NONE',
  invitation: null,
}

const BESA: Student = { ...ARTA, id: '9b1c2f43-0d1e-4c55-9a3e-6b1f0c2a1a02', first_name: 'Besa', last_name: 'Berisha', date_of_birth: null, student_number: 'STU-0002' }

const STUDENTS_PATH = '*/api/organizations/org-1/students'

type ServeParams = {
  active?: Student[]
  archived?: Student[]
}

/** Answers the list like the server: by status, filtered by the search, with both counts */
const serveStudents = ({ active = [ARTA], archived = [] }: ServeParams = {}) => {
  const requests: URLSearchParams[] = []
  server.use(
    http.get(STUDENTS_PATH, ({ request }) => {
      const params = new URL(request.url).searchParams
      requests.push(params)
      const search = (params.get('search') ?? '').toLowerCase()
      const matches = (students: Student[]) => students.filter((student) => `${student.first_name} ${student.last_name} ${student.student_number}`.toLowerCase().includes(search))
      const byStatus: Record<StudentStatus, Student[]> = { ACTIVE: matches(active), ARCHIVED: matches(archived) }
      const status = params.get('status') === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE'
      const page: StudentPage = { students: byStatus[status], total: byStatus[status].length, counts: { ACTIVE: byStatus.ACTIVE.length, ARCHIVED: byStatus.ARCHIVED.length } }
      return HttpResponse.json({ data: page })
    }),
  )
  return requests
}

const signInAsOwner = (params?: ServeParams) => {
  signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
  return serveStudents(params)
}

const studentsTable = () => screen.findByRole('table', { name: 'Students' })

const rowsOf = async () => within(await studentsTable()).getAllByRole('row').slice(1)

beforeEach(() => {
  // Ages are counted from today
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-31T10:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('StudentsPage: list', () => {
  it('lists students with their number, age and enrolment date', async () => {
    signInAsOwner({ active: [ARTA, BESA] })
    renderRoute('/dashboard/students')

    expect(await screen.findByRole('heading', { level: 1, name: 'Students' })).toBeInTheDocument()
    const [arta, besa] = await rowsOf()
    expect(arta).toHaveTextContent('Arta Gashi')
    expect(arta).toHaveTextContent('STU-0001')
    expect(arta).toHaveTextContent('7 years')
    expect(arta).toHaveTextContent('1 Sep 2025')
    expect(besa).toHaveTextContent('Besa Berisha')
    expect(besa).toHaveTextContent('Not recorded')
  })
})

describe('StudentsPage: list states', () => {
  it('shows a skeleton while loading', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    server.use(http.get(STUDENTS_PATH, () => new Promise<never>(() => {})))
    renderRoute('/dashboard/students')

    expect(await screen.findByRole('list', { name: 'Loading' })).toBeInTheDocument()
  })

  it('says there are no students yet and offers to add one', async () => {
    signInAsOwner({ active: [] })
    const { user } = renderRoute('/dashboard/students')

    expect(await screen.findByText('No students yet.')).toBeInTheDocument()
    await user.click(within(screen.getByRole('tabpanel')).getByRole('button', { name: 'Add student' }))
    expect(screen.getByRole('dialog', { name: 'Add a student' })).toBeVisible()
  })

  it('offers to try again when the list fails to load', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    serveStudents()
    // Added last, so it answers first, once
    server.use(http.get(STUDENTS_PATH, () => HttpResponse.json({ error: 'Down' }, { status: 500 }), { once: true }))
    const { user } = renderRoute('/dashboard/students')

    await user.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Arta Gashi')).toBeInTheDocument()
  })

  it('searches by name or number once typing pauses, and says when nothing matches', async () => {
    const requests = signInAsOwner({ active: [ARTA, BESA] })
    const { user } = renderRoute('/dashboard/students')
    await screen.findByText('Besa Berisha')

    await user.type(screen.getByRole('searchbox', { name: 'Search students' }), 'stu-0002')
    await vi.waitFor(() => expect(screen.queryByText('Arta Gashi')).not.toBeInTheDocument())
    expect(screen.getByText('Besa Berisha')).toBeInTheDocument()
    expect(requests.at(-1)?.get('search')).toBe('stu-0002')
    expect(requests.filter((params) => params.get('search')?.startsWith('stu')).length).toBeLessThan('stu-0002'.length)

    await user.clear(screen.getByRole('searchbox', { name: 'Search students' }))
    await user.type(screen.getByRole('searchbox', { name: 'Search students' }), 'nobody')
    expect(await screen.findByText('No students match.')).toBeInTheDocument()
  })

  it('switches between active and archived students, with counts on the tabs', async () => {
    const archivedDren: Student = { ...ARTA, id: '9b1c2f43-0d1e-4c55-9a3e-6b1f0c2a1a03', first_name: 'Dren', last_name: 'Hoxha', status: 'ARCHIVED' }
    signInAsOwner({ active: [ARTA, BESA], archived: [archivedDren] })
    const { user } = renderRoute('/dashboard/students')

    expect(await screen.findByRole('tab', { name: 'Active 2' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: 'Archived 1' }))

    expect(await screen.findByText('Dren Hoxha')).toBeInTheDocument()
    expect(screen.queryByText('Arta Gashi')).not.toBeInTheDocument()
  })

  it('loads the next page', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    server.use(
      http.get(STUDENTS_PATH, ({ request }) => {
        const isSecond = new URL(request.url).searchParams.get('page') === '2'
        const page: StudentPage = { students: isSecond ? [BESA] : [ARTA], total: 2, counts: { ACTIVE: 2, ARCHIVED: 0 } }
        return HttpResponse.json({ data: page })
      }),
    )
    const { user } = renderRoute('/dashboard/students')

    await user.click(await screen.findByRole('button', { name: 'Load more' }))

    expect(await screen.findByText('Besa Berisha')).toBeInTheDocument()
    expect(screen.getByText('Arta Gashi')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
  })
})

describe('StudentsPage: add, edit, archive', () => {
  it('adds a student with no email, numbered automatically', async () => {
    signInAsOwner({ active: [] })
    const added: Student = { ...ARTA, date_of_birth: '2019-03-14' }
    let sent: unknown
    server.use(
      http.post(STUDENTS_PATH, async ({ request }) => {
        sent = createStudentSchema.parse(await request.json())
        serveStudents({ active: [added] })
        return HttpResponse.json({ data: added }, { status: 201 })
      }),
    )
    const { user } = renderRoute('/dashboard/students')

    await user.click(await screen.findByRole('button', { name: 'Add student' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a student' })
    expect(within(dialog).getByLabelText('Student number')).toHaveAttribute('placeholder', 'Assigned automatically')
    expect(within(dialog).queryByLabelText(/email/i)).not.toBeInTheDocument()
    await user.type(within(dialog).getByLabelText('First name'), 'Arta')
    await user.type(within(dialog).getByLabelText('Last name'), 'Gashi')
    await user.type(within(dialog).getByLabelText('Date of birth (optional)'), '2019-03-14')
    await user.click(within(dialog).getByRole('button', { name: 'Add student' }))

    expect(await screen.findByText('Added Arta Gashi as STU-0001.')).toBeInTheDocument()
    expect(sent).toMatchObject({ first_name: 'Arta', last_name: 'Gashi', date_of_birth: '2019-03-14', enrolled_on: '2026-10-31', student_number: '' })
    expect(dialog).not.toBeVisible()
    expect(await screen.findByText('Arta Gashi')).toBeInTheDocument()
  })

  it('asks for the names, and keeps the dialog open with the server’s error', async () => {
    signInAsOwner({ active: [] })
    const taken = 'Another student already has the number K-1.'
    server.use(http.post(STUDENTS_PATH, () => HttpResponse.json({ error: taken, details: { formErrors: [], fieldErrors: { student_number: [taken] } } }, { status: 409 })))
    const { user } = renderRoute('/dashboard/students')

    await user.click(await screen.findByRole('button', { name: 'Add student' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a student' })
    await user.click(within(dialog).getByRole('button', { name: 'Add student' }))
    expect(within(dialog).getByText('Enter the first name.')).toBeInTheDocument()
    expect(within(dialog).getByText('Enter the last name.')).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText('First name'), 'Arta')
    await user.type(within(dialog).getByLabelText('Last name'), 'Gashi')
    await user.type(within(dialog).getByLabelText('Student number'), 'K-1')
    await user.click(within(dialog).getByRole('button', { name: 'Add student' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(taken)
    expect(within(dialog).getByLabelText('Student number')).toHaveAccessibleDescription(taken)
    expect(dialog).toBeVisible()
  })

  it('shows the server’s field errors next to their fields', async () => {
    signInAsOwner({ active: [] })
    server.use(
      http.post(STUDENTS_PATH, () =>
        HttpResponse.json({ error: 'Validation failed', details: { formErrors: [], fieldErrors: { enrolled_on: ['The enrolment date can’t be before the date of birth.'] } } }, { status: 400 }),
      ),
    )
    const { user } = renderRoute('/dashboard/students')

    await user.click(await screen.findByRole('button', { name: 'Add student' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a student' })
    await user.type(within(dialog).getByLabelText('First name'), 'Arta')
    await user.type(within(dialog).getByLabelText('Last name'), 'Gashi')
    await user.click(within(dialog).getByRole('button', { name: 'Add student' }))

    expect(await within(dialog).findByText('The enrolment date can’t be before the date of birth.')).toBeInTheDocument()
  })

  it('starts each new student from an empty form', async () => {
    signInAsOwner({ active: [] })
    const { user } = renderRoute('/dashboard/students')

    await user.click(await screen.findByRole('button', { name: 'Add student' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a student' })
    await user.type(within(dialog).getByLabelText('First name'), 'Half typed')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getAllByRole('button', { name: 'Add student' })[0])

    expect(within(screen.getByRole('dialog', { name: 'Add a student' })).getByLabelText('First name')).toHaveValue('')
  })

  it('edits a student', async () => {
    signInAsOwner()
    let sent: unknown
    server.use(
      http.put(`${STUDENTS_PATH}/${ARTA.id}`, async ({ request }) => {
        sent = updateStudentSchema.parse(await request.json())
        serveStudents({ active: [{ ...ARTA, last_name: 'Krasniqi' }] })
        return HttpResponse.json({ data: { ...ARTA, last_name: 'Krasniqi' } })
      }),
    )
    const { user } = renderRoute('/dashboard/students')

    await user.click(await screen.findByRole('button', { name: 'Edit Arta Gashi' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit Arta Gashi' })
    expect(within(dialog).getByLabelText('Student number')).toHaveValue('STU-0001')
    await user.clear(within(dialog).getByLabelText('Last name'))
    await user.type(within(dialog).getByLabelText('Last name'), 'Krasniqi')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Saved Arta Krasniqi.')).toBeInTheDocument()
    expect(sent).toMatchObject({ last_name: 'Krasniqi', student_number: 'STU-0001' })
    expect(await screen.findByText('Arta Krasniqi')).toBeInTheDocument()
  })

  it('archives a student after one confirmation, and restores her', async () => {
    signInAsOwner()
    const archivedArta: Student = { ...ARTA, status: 'ARCHIVED' }
    server.use(
      http.post(`${STUDENTS_PATH}/${ARTA.id}/archive`, () => {
        serveStudents({ active: [], archived: [archivedArta] })
        return HttpResponse.json({ data: archivedArta })
      }),
      http.post(`${STUDENTS_PATH}/${ARTA.id}/restore`, () => {
        serveStudents({ active: [ARTA] })
        return HttpResponse.json({ data: ARTA })
      }),
    )
    const { user } = renderRoute('/dashboard/students')

    await user.click(await screen.findByRole('button', { name: 'Archive Arta Gashi' }))
    await user.click(within(screen.getByRole('group', { name: 'Archive Arta Gashi' })).getByRole('button', { name: 'Archive' }))
    expect(await screen.findByText('Archived Arta Gashi.')).toBeInTheDocument()
    expect(await screen.findByText('No students yet.')).toBeInTheDocument()

    await user.click(await screen.findByRole('tab', { name: 'Archived 1' }))
    await user.click(await screen.findByRole('button', { name: 'Restore Arta Gashi' }))
    await user.click(within(screen.getByRole('group', { name: 'Restore Arta Gashi' })).getByRole('button', { name: 'Restore' }))
    expect(await screen.findByText('Restored Arta Gashi.')).toBeInTheDocument()
  })

  it('shows a toast when archiving fails', async () => {
    signInAsOwner()
    server.use(http.post(`${STUDENTS_PATH}/${ARTA.id}/archive`, () => HttpResponse.json({ error: 'This student is already archived.' }, { status: 409 })))
    const { user } = renderRoute('/dashboard/students')

    await user.click(await screen.findByRole('button', { name: 'Archive Arta Gashi' }))
    await user.click(within(screen.getByRole('group', { name: 'Archive Arta Gashi' })).getByRole('button', { name: 'Archive' }))

    expect(await screen.findByText('This student is already archived.')).toBeInTheDocument()
  })
})

describe('StudentsPage: logins', () => {
  const INVITED_BESA: Student = { ...BESA, login_status: 'INVITED', invitation: { email: 'besa@student.test', expires_at: '2026-11-07T10:00:00.000Z' } }
  const LINKED_DRITA: Student = { ...ARTA, id: '9b1c2f43-0d1e-4c55-9a3e-6b1f0c2a1a03', first_name: 'Drita', student_number: 'STU-0003', login_status: 'LINKED' }

  it('shows whether each student has no login, is invited until a date, or has a login', async () => {
    signInAsOwner({ active: [ARTA, INVITED_BESA, LINKED_DRITA] })
    renderRoute('/dashboard/students')

    const [arta, besa, drita] = await rowsOf()
    expect(arta).toHaveTextContent('No login')
    expect(besa).toHaveTextContent('Invited')
    expect(besa).toHaveTextContent('besa@student.test')
    expect(besa).toHaveTextContent('until 7 Nov 2026')
    expect(drita).toHaveTextContent('Has login')
    expect(within(drita).queryByRole('button', { name: /Invite|Resend|Revoke/ })).not.toBeInTheDocument()
  })

  it('invites a student to log in by email and shows her as invited', async () => {
    signInAsOwner()
    let sent: unknown
    server.use(
      http.post(`${STUDENTS_PATH}/${ARTA.id}/invitation`, async ({ request }) => {
        sent = await request.json()
        // The answered row updates the list; the list itself isn't fetched again
        return HttpResponse.json({ data: { ...ARTA, login_status: 'INVITED', invitation: { email: 'arta@student.test', expires_at: '2026-11-07T10:00:00.000Z' } } }, { status: 201 })
      }),
    )
    const { user } = renderRoute('/dashboard/students')

    await user.click(await screen.findByRole('button', { name: 'Invite Arta Gashi to log in' }))
    const dialog = screen.getByRole('dialog', { name: 'Invite Arta Gashi to log in' })
    await user.type(within(dialog).getByLabelText('Email'), 'arta@student.test')
    await user.click(within(dialog).getByRole('button', { name: 'Send invitation' }))

    expect(await screen.findByText('Sent an invitation to arta@student.test.')).toBeInTheDocument()
    expect(sent).toEqual({ email: 'arta@student.test' })
    const [arta] = await rowsOf()
    await vi.waitFor(() => expect(arta).toHaveTextContent('Invited'))
  })

  it('checks the email and shows the server’s field error under it', async () => {
    signInAsOwner()
    server.use(
      http.post(`${STUDENTS_PATH}/${ARTA.id}/invitation`, () =>
        HttpResponse.json({ error: 'Taken', details: { formErrors: [], fieldErrors: { email: ['There’s already a pending invitation for this email.'] } } }, { status: 409 }),
      ),
    )
    const { user } = renderRoute('/dashboard/students')

    await user.click(await screen.findByRole('button', { name: 'Invite Arta Gashi to log in' }))
    const dialog = screen.getByRole('dialog', { name: 'Invite Arta Gashi to log in' })
    await user.click(within(dialog).getByRole('button', { name: 'Send invitation' }))
    expect(await within(dialog).findByText('Enter an email address like name@school.org.')).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText('Email'), 'arta@student.test')
    await user.click(within(dialog).getByRole('button', { name: 'Send invitation' }))
    expect(await within(dialog).findByText('There’s already a pending invitation for this email.')).toBeInTheDocument()
  })

  it('resends a pending invitation', async () => {
    signInAsOwner({ active: [INVITED_BESA] })
    const resent: string[] = []
    server.use(
      http.post(`${STUDENTS_PATH}/${BESA.id}/invitation/resend`, async () => {
        resent.push(BESA.id)
        await delay(50)
        return HttpResponse.json({ data: { ...INVITED_BESA, invitation: { email: 'besa@student.test', expires_at: '2026-11-08T10:00:00.000Z' } } })
      }),
    )
    const { user } = renderRoute('/dashboard/students')

    await user.click(await screen.findByRole('button', { name: 'Resend invitation to Besa Berisha' }))
    expect(screen.getByRole('button', { name: 'Resend invitation to Besa Berisha' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Revoke invitation to Besa Berisha' })).toBeDisabled()

    expect(await screen.findByText('Sent a new link to besa@student.test. The old one no longer works.')).toBeInTheDocument()
    expect(resent).toEqual([BESA.id])
    const [besa] = await rowsOf()
    await vi.waitFor(() => expect(besa).toHaveTextContent('until 8 Nov 2026'))
  })

  it('revokes a pending invitation after one confirmation', async () => {
    signInAsOwner({ active: [INVITED_BESA] })
    server.use(
      http.delete(`${STUDENTS_PATH}/${BESA.id}/invitation`, () => HttpResponse.json({ data: BESA })),
    )
    const { user } = renderRoute('/dashboard/students')

    await user.click(await screen.findByRole('button', { name: 'Revoke invitation to Besa Berisha' }))
    await user.click(within(screen.getByRole('group', { name: 'Revoke invitation to Besa Berisha' })).getByRole('button', { name: 'Revoke' }))

    expect(await screen.findByText('Withdrew the invitation to besa@student.test.')).toBeInTheDocument()
    const [besa] = await rowsOf()
    await vi.waitFor(() => expect(besa).toHaveTextContent('No login'))
  })
})

describe('StudentsPage: access', () => {
  it('lets a school admin with Students in, with Students in the sidebar', async () => {
    signInAs(buildUser({ memberships: [{ ...YLLKA_ADMIN_MEMBERSHIP, permissions: ['MANAGE_STUDENTS'] }] }))
    server.use(http.get('*/api/organizations/org-2/students', () => HttpResponse.json({ data: { students: [ARTA], total: 1, counts: { ACTIVE: 1, ARCHIVED: 0 } } })))
    renderRoute('/dashboard/students')

    expect(await screen.findByText('Arta Gashi')).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Modules' })).getByRole('link', { name: 'Students & enrolment' })).toHaveAttribute('href', '/dashboard/students')
  })

  it('sends a school admin without Students back to the dashboard, and hides it from the sidebar', async () => {
    signInAs(buildUser({ memberships: [YLLKA_ADMIN_MEMBERSHIP] }))
    server.use(http.get('*/api/organizations/org-2/*', () => HttpResponse.json({ data: [] })))
    const { router } = renderRoute('/dashboard/students')

    await vi.waitFor(() => expect(router.state.location.pathname).not.toBe('/dashboard/students'))
    expect(screen.queryByRole('link', { name: 'Students & enrolment' })).not.toBeInTheDocument()
  })

  it('sends a lecturer back to the dashboard', async () => {
    signInAs(buildUser({ memberships: [{ ...YLLKA_ADMIN_MEMBERSHIP, role: 'LECTURER', permissions: ['MANAGE_STUDENTS'] }] }))
    server.use(http.get('*/api/organizations/org-2/*', () => HttpResponse.json({ data: [] })))
    const { router } = renderRoute('/dashboard/students')

    await vi.waitFor(() => expect(router.state.location.pathname).not.toBe('/dashboard/students'))
  })

  it('opens from the owner’s sidebar, at the address the module had', async () => {
    signInAsOwner()
    renderRoute('/dashboard/students')

    await screen.findByText('Arta Gashi')
    expect(within(screen.getByRole('navigation', { name: 'Modules' })).getByRole('link', { name: 'Students' })).toHaveAttribute('href', '/dashboard/students')
  })
})
