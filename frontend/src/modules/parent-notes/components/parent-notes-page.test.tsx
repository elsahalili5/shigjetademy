import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import type { AuthUser } from '@shigjetademy/shared/auth'
import type { ParentNote, ParentNoteConversation, ParentNoteGroup, ParentNoteThread } from '@shigjetademy/shared/parent-notes'
import { buildUser, DEFAULT_SETTINGS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const LECTURER_MEMBERSHIPS: AuthUser['memberships'] = [
  { id: 'membership-8', role: 'LECTURER', permissions: [], organization: { id: 'org-1', name: 'Oxford Academy', type: 'ACADEMY', status: 'ACTIVE', ...DEFAULT_SETTINGS } },
]

const ALBA = { id: 'student-1', first_name: 'Alba', last_name: 'Gashi' }
const BESA = { id: 'student-2', first_name: 'Besa', last_name: 'Berisha' }

const GROUPS: ParentNoteGroup[] = [
  { id: 'group-a', name: 'Group A', students: [ALBA, BESA] },
  { id: 'group-b', name: 'Group B', students: [] },
]

const EARLIER_NOTE: ParentNote = { id: 'note-1', body: 'Alba did well in the quiz.', created_at: '2026-11-03T09:15:00.000Z' }

const ALBA_THREAD: ParentNoteThread = {
  student: ALBA,
  guardians: [
    { id: 'guardian-1', first_name: 'Drita', last_name: 'Gashi', relationship: 'MOTHER', email: 'drita@family.test', phone: '+383 44 111 222' },
    { id: 'guardian-2', first_name: 'Gent', last_name: 'Gashi', relationship: 'FATHER', email: null, phone: null },
  ],
  notes: [EARLIER_NOTE],
}

const BESA_THREAD: ParentNoteThread = { student: BESA, guardians: [], notes: [] }

const CONVERSATIONS: ParentNoteConversation[] = [{ student: ALBA, last_note: EARLIER_NOTE }]

type ServeParams = {
  groups?: ParentNoteGroup[]
  conversations?: ParentNoteConversation[]
}

const serve = ({ groups = GROUPS, conversations = CONVERSATIONS }: ServeParams = {}) =>
  server.use(
    http.get('*/api/organizations/org-1/parent-notes/groups', () => HttpResponse.json({ data: groups })),
    http.get('*/api/organizations/org-1/parent-notes/conversations', () => HttpResponse.json({ data: conversations })),
    http.get('*/api/organizations/org-1/parent-notes/students/student-1', () => HttpResponse.json({ data: ALBA_THREAD })),
    http.get('*/api/organizations/org-1/parent-notes/students/student-2', () => HttpResponse.json({ data: BESA_THREAD })),
  )

const signInAsLecturer = () => signInAs(buildUser({ first_name: 'Arben', last_name: 'Hoxha', email: 'arben@lecturer.test', memberships: LECTURER_MEMBERSHIPS }))

afterEach(() => {
  server.resetHandlers()
})

describe('ParentNotesPage', () => {
  it('lists the conversations on the left with the student, the last note and when it was sent', async () => {
    signInAsLecturer()
    serve()
    renderRoute('/dashboard/student-notes')

    const list = await screen.findByRole('list', { name: 'Conversations' })
    const item = within(list).getByRole('button', { name: /Alba Gashi/ })
    expect(item).toHaveTextContent('Alba did well in the quiz.')
    expect(item).toHaveTextContent('3 Nov 2026')
  })

  it('opens a conversation with the student, every guardian, the notes with date and time, and the composer', async () => {
    signInAsLecturer()
    serve()
    const { user } = renderRoute('/dashboard/student-notes')

    await user.click(await screen.findByRole('button', { name: /Alba Gashi/ }))

    const conversation = await screen.findByRole('region', { name: 'Alba Gashi' })
    const guardians = within(within(conversation).getByRole('region', { name: 'Parents and guardians' })).getAllByRole('listitem')
    expect(guardians).toHaveLength(2)
    expect(guardians[0]).toHaveTextContent('Drita Gashi')
    expect(guardians[0]).toHaveTextContent('Mother')
    expect(guardians[0]).toHaveTextContent('drita@family.test')
    expect(guardians[0]).toHaveTextContent('+383 44 111 222')
    expect(guardians[1]).toHaveTextContent('Father')
    const note = within(within(conversation).getByRole('region', { name: 'Notes sent' })).getByRole('listitem')
    expect(note).toHaveTextContent('Alba did well in the quiz.')
    expect(note).toHaveTextContent('3 Nov 2026')
    expect(within(note).getByText(/\d{1,2}:\d{2}/)).toBeInTheDocument()
    expect(within(conversation).getByRole('textbox', { name: /Note to Alba Gashi’s parents/ })).toBeInTheDocument()
    expect(screen.queryByLabelText('Group')).not.toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Conversations' })).toBeInTheDocument()
  })

  it('goes back from a conversation to the pickers with the group kept, then opens another student', async () => {
    signInAsLecturer()
    serve()
    const { user } = renderRoute('/dashboard/student-notes')

    await user.click(await screen.findByRole('button', { name: /Alba Gashi/ }))
    await user.click(await screen.findByRole('button', { name: 'Back' }))

    expect(screen.queryByRole('region', { name: 'Alba Gashi' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Group')).toHaveValue('group-a')
    expect(screen.getByLabelText('Student')).toHaveValue('')
    await user.selectOptions(screen.getByLabelText('Student'), 'student-2')
    expect(await screen.findByRole('region', { name: 'Besa Berisha' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Conversations' })).toBeInTheDocument()
  })

  it('starts a new note from the top-right button with the pickers cleared', async () => {
    signInAsLecturer()
    serve()
    const { user } = renderRoute('/dashboard/student-notes')

    await user.click(await screen.findByRole('button', { name: /Alba Gashi/ }))
    await screen.findByRole('region', { name: 'Alba Gashi' })
    await user.click(screen.getByRole('button', { name: 'New Note' }))

    expect(screen.queryByRole('region', { name: 'Alba Gashi' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Group')).toHaveValue('')
    expect(screen.getByLabelText('Student')).toBeDisabled()
  })

  it('picks a group, then one of its students, then sends a note that shows up in the conversation list at once', async () => {
    signInAsLecturer()
    serve({ conversations: [] })
    let sent: unknown
    server.use(
      http.post('*/api/organizations/org-1/parent-notes/students/student-1', async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ data: { id: 'note-9', body: 'Alba did well in the quiz.', created_at: '2026-11-11T12:00:00.000Z' } }, { status: 201 })
      }),
    )
    const { user } = renderRoute('/dashboard/student-notes')

    expect(await screen.findByText('No conversations yet')).toBeInTheDocument()
    expect(screen.getByLabelText('Student')).toBeDisabled()
    await user.selectOptions(await screen.findByLabelText('Group'), 'group-a')
    expect(within(screen.getByLabelText('Student')).getAllByRole('option').map((option) => option.textContent)).toEqual(['Choose a student', 'Alba Gashi', 'Besa Berisha'])
    await user.selectOptions(screen.getByLabelText('Student'), 'student-1')
    await user.type(await screen.findByRole('textbox', { name: /Note to Alba Gashi’s parents/ }), '  Great progress this week.  ')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(sent).toEqual({ body: 'Great progress this week.' }))
    const list = await screen.findByRole('list', { name: 'Conversations' })
    expect(within(list).getByRole('button', { name: /Alba Gashi/ })).toHaveTextContent('Alba did well in the quiz.')
    expect(within(screen.getByRole('region', { name: 'Notes sent' })).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('textbox', { name: /Note to Alba Gashi’s parents/ })).toHaveValue('')
  })

  it('refuses an empty note without asking the server', async () => {
    signInAsLecturer()
    serve()
    const { user } = renderRoute('/dashboard/student-notes')

    await user.click(await screen.findByRole('button', { name: /Alba Gashi/ }))
    await user.type(await screen.findByRole('textbox', { name: /Note to Alba Gashi’s parents/ }), '   ')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Write a note first.')
  })

  it('shows the server’s reason when the student has no guardian', async () => {
    signInAsLecturer()
    serve({ conversations: [] })
    server.use(http.post('*/api/organizations/org-1/parent-notes/students/student-2', () => HttpResponse.json({ error: 'Besa has no parent or guardian on file yet. Ask the school to add one first.' }, { status: 422 })))
    const { user } = renderRoute('/dashboard/student-notes')

    await user.selectOptions(await screen.findByLabelText('Group'), 'group-a')
    await user.selectOptions(screen.getByLabelText('Student'), 'student-2')
    expect(await screen.findByText('Besa Berisha has no parent or guardian on file yet, so notes can’t be sent.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  it('says when the lecturer has no groups', async () => {
    signInAsLecturer()
    serve({ groups: [], conversations: [] })
    renderRoute('/dashboard/student-notes')

    expect(await screen.findByText('No groups yet')).toBeInTheDocument()
    expect(screen.getByText('No conversations yet')).toBeInTheDocument()
  })

  it('says when a group has no students', async () => {
    signInAsLecturer()
    serve()
    const { user } = renderRoute('/dashboard/student-notes')

    await user.selectOptions(await screen.findByLabelText('Group'), 'group-b')

    expect(screen.getByText('Group B has no active students yet.')).toBeInTheDocument()
  })

  it('offers a retry when the conversations fail to load', async () => {
    signInAsLecturer()
    serve()
    server.use(http.get('*/api/organizations/org-1/parent-notes/conversations', () => HttpResponse.json({ error: 'Nope' }, { status: 500 })))
    renderRoute('/dashboard/student-notes')

    expect(await screen.findByText('We couldn’t load the conversations.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
