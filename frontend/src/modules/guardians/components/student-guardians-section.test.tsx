import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { AuthUser } from '@shigjetademy/shared/auth'
import { guardianSchema } from '@shigjetademy/shared/guardians'
import type { StudentGuardian } from '@shigjetademy/shared/guardians'
import type { StudentRosterDetail } from '@shigjetademy/shared/student-roster'
import { buildUser, OWNER_MEMBERSHIPS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const STUDENT_ID = 'student-1'

const DETAIL: StudentRosterDetail = {
  student: { id: STUDENT_ID, first_name: 'Arta', last_name: 'Gashi' },
  groups: [],
  attendance: [],
  summary: { present: 0, tardy: 0, absent: 0, rate: null },
}

const DRITA: StudentGuardian = {
  id: 'guardian-1',
  first_name: 'Drita',
  last_name: 'Gashi',
  email: 'drita@family.test',
  phone: null,
  relationship: 'MOTHER',
  login_status: 'NONE',
  invitation: null,
}

const GUARDIANS_PATH = `*/api/organizations/org-1/students/${STUDENT_ID}/guardians`

const DETAIL_PATH = `/dashboard/students/${STUDENT_ID}`

const serve = (guardians: StudentGuardian[]) =>
  server.use(
    http.get(`*/api/organizations/org-1/my-students/${STUDENT_ID}`, () => HttpResponse.json({ data: DETAIL })),
    http.get(GUARDIANS_PATH, () => HttpResponse.json({ data: guardians })),
  )

const guardiansSection = () => screen.findByRole('region', { name: 'Guardians' })

describe('StudentGuardiansSection', () => {
  it('lists the student’s guardians with how they’re related and whether they have a login', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    serve([DRITA, { ...DRITA, id: 'guardian-2', first_name: 'Agim', email: null, relationship: 'FATHER', login_status: 'LINKED' }])
    renderRoute(DETAIL_PATH)

    const section = await guardiansSection()
    const items = await within(section).findAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Drita Gashi')
    expect(items[0]).toHaveTextContent('Mother')
    expect(items[0]).toHaveTextContent('drita@family.test')
    expect(items[0]).toHaveTextContent('No login')
    expect(items[1]).toHaveTextContent('Father')
    expect(items[1]).toHaveTextContent('Has login')
  })

  it('says when no guardian is linked yet', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    serve([])
    renderRoute(DETAIL_PATH)

    expect(await within(await guardiansSection()).findByText('No guardians yet.')).toBeInTheDocument()
  })

  it('adds a guardian with a relationship and shows them in the list', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    serve([])
    let sent: unknown
    server.use(
      http.post(GUARDIANS_PATH, async ({ request }) => {
        sent = guardianSchema.parse(await request.json())
        return HttpResponse.json({ data: DRITA }, { status: 201 })
      }),
    )
    const { user } = renderRoute(DETAIL_PATH)

    await user.click(within(await guardiansSection()).getByRole('button', { name: 'Add guardian' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a guardian for Arta Gashi' })
    await user.type(within(dialog).getByLabelText('First name'), 'Drita')
    await user.type(within(dialog).getByLabelText('Last name'), 'Gashi')
    await user.selectOptions(within(dialog).getByLabelText('Relationship'), 'Mother')
    await user.type(within(dialog).getByLabelText('Email (optional)'), 'drita@family.test')
    await user.click(within(dialog).getByRole('button', { name: 'Add guardian' }))

    expect(await within(await guardiansSection()).findByText('Drita Gashi')).toBeInTheDocument()
    expect(sent).toEqual({ first_name: 'Drita', last_name: 'Gashi', email: 'drita@family.test', phone: '', relationship: 'MOTHER' })
    expect(dialog).not.toBeVisible()
  })

  it('asks for the names and the relationship', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    serve([])
    const { user } = renderRoute(DETAIL_PATH)

    await user.click(within(await guardiansSection()).getByRole('button', { name: 'Add guardian' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a guardian for Arta Gashi' })
    await user.click(within(dialog).getByRole('button', { name: 'Add guardian' }))

    expect(within(dialog).getByText('Enter the first name.')).toBeInTheDocument()
    expect(within(dialog).getByText('Choose how they’re related.')).toBeInTheDocument()
  })

  it('edits a guardian’s details and relationship', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    serve([DRITA])
    let sent: unknown
    server.use(
      http.put(`${GUARDIANS_PATH}/${DRITA.id}`, async ({ request }) => {
        sent = guardianSchema.parse(await request.json())
        return HttpResponse.json({ data: { ...DRITA, phone: '+383 44 000 000', relationship: 'LEGAL_GUARDIAN' } })
      }),
    )
    const { user } = renderRoute(DETAIL_PATH)

    await user.click(await within(await guardiansSection()).findByRole('button', { name: 'Edit Drita Gashi' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit Drita Gashi' })
    expect(within(dialog).getByLabelText('First name')).toHaveValue('Drita')
    await user.type(within(dialog).getByLabelText('Phone (optional)'), '+383 44 000 000')
    await user.selectOptions(within(dialog).getByLabelText('Relationship'), 'Legal guardian')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await within(within(await guardiansSection()).getByRole('list', { name: 'Guardians' })).findByText('Legal guardian')).toBeInTheDocument()
    expect(sent).toMatchObject({ phone: '+383 44 000 000', relationship: 'LEGAL_GUARDIAN' })
  })

  it('unlinks a guardian after one confirmation', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    serve([DRITA])
    let isUnlinked = false
    server.use(
      http.delete(`${GUARDIANS_PATH}/${DRITA.id}`, () => {
        isUnlinked = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderRoute(DETAIL_PATH)

    const section = await guardiansSection()
    await user.click(await within(section).findByRole('button', { name: 'Unlink Drita Gashi' }))
    await user.click(within(within(section).getByRole('group', { name: 'Unlink Drita Gashi' })).getByRole('button', { name: 'Unlink' }))

    expect(await within(section).findByText('No guardians yet.')).toBeInTheDocument()
    expect(isUnlinked).toBe(true)
  })

  it('stays hidden from an admin who manages students but not guardians', async () => {
    const memberships: AuthUser['memberships'] = [{ ...OWNER_MEMBERSHIPS[0], id: 'membership-9', role: 'ADMIN', permissions: ['MANAGE_STUDENTS'] }]
    signInAs(buildUser({ memberships }))
    serve([DRITA])
    renderRoute(DETAIL_PATH)

    expect(await screen.findByRole('heading', { name: 'Arta Gashi' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Guardians' })).not.toBeInTheDocument()
  })
})

describe('StudentGuardiansSection: logins', () => {
  const INVITED: StudentGuardian = { ...DRITA, login_status: 'INVITED', invitation: { email: 'drita@family.test', expires_at: '2026-11-20T09:00:00.000Z' } }

  it('invites a guardian at their email and shows them as invited', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    serve([DRITA])
    let isInvited = false
    server.use(
      http.post(`*/api/organizations/org-1/guardians/${DRITA.id}/invitation`, () => {
        isInvited = true
        return HttpResponse.json({ data: INVITED }, { status: 201 })
      }),
    )
    const { user } = renderRoute(DETAIL_PATH)

    await user.click(await within(await guardiansSection()).findByRole('button', { name: 'Invite Drita Gashi to log in' }))

    expect(await within(await guardiansSection()).findByText('Invited')).toBeInTheDocument()
    expect(isInvited).toBe(true)
    expect(within(await guardiansSection()).getByText(/drita@family.test · until/)).toBeInTheDocument()
  })

  it('can’t invite a guardian with no email, and says why', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    serve([{ ...DRITA, email: null }])
    renderRoute(DETAIL_PATH)

    const section = await guardiansSection()
    expect(await within(section).findByRole('button', { name: 'Invite Drita Gashi to log in' })).toBeDisabled()
    expect(within(section).getByText('Add an email to invite them.')).toBeInTheDocument()
  })

  it('resends a pending invitation, and revokes it after one confirmation', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    serve([INVITED])
    const calls: string[] = []
    server.use(
      http.post(`*/api/organizations/org-1/guardians/${DRITA.id}/invitation/resend`, () => {
        calls.push('resend')
        return HttpResponse.json({ data: INVITED })
      }),
      http.delete(`*/api/organizations/org-1/guardians/${DRITA.id}/invitation`, () => {
        calls.push('revoke')
        return HttpResponse.json({ data: DRITA })
      }),
    )
    const { user } = renderRoute(DETAIL_PATH)

    const section = await guardiansSection()
    await user.click(await within(section).findByRole('button', { name: 'Resend invitation to Drita Gashi' }))
    expect(await screen.findByText('Sent a new link to drita@family.test. The old one no longer works.')).toBeInTheDocument()
    await user.click(within(section).getByRole('button', { name: 'Revoke invitation to Drita Gashi' }))
    await user.click(within(within(section).getByRole('group', { name: 'Revoke invitation to Drita Gashi' })).getByRole('button', { name: 'Revoke' }))

    expect(await within(section).findByText('No login')).toBeInTheDocument()
    expect(calls).toEqual(['resend', 'revoke'])
  })

  it('shows the server’s refusal when the email belongs to staff', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    serve([DRITA])
    server.use(
      http.post(`*/api/organizations/org-1/guardians/${DRITA.id}/invitation`, () =>
        HttpResponse.json({ error: 'This email belongs to a staff member or student here.' }, { status: 409 }),
      ),
    )
    const { user } = renderRoute(DETAIL_PATH)

    await user.click(await within(await guardiansSection()).findByRole('button', { name: 'Invite Drita Gashi to log in' }))

    expect(await screen.findByText('This email belongs to a staff member or student here.')).toBeInTheDocument()
  })

  it('shows a guardian with a login as having one, with nothing to invite', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    serve([{ ...DRITA, login_status: 'LINKED' }])
    renderRoute(DETAIL_PATH)

    const section = await guardiansSection()
    expect(await within(section).findByText('Has login')).toBeInTheDocument()
    expect(within(section).queryByRole('button', { name: /Invite/ })).not.toBeInTheDocument()
  })
})

