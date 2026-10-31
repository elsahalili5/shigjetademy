import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { AuthUser } from '@shigjetademy/shared/auth'
import type { InvitationPreview } from '@shigjetademy/shared/invitations'
import { ACTIVE_ORGANIZATION_STORAGE_KEY } from '#/modules/auth/utils/active-organization-storage'
import { buildUser, DEFAULT_SETTINGS, OWNER_MEMBERSHIPS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const TOKEN = 'abcDEF123_-xyz'

const PREVIEW: InvitationPreview = {
  email: 'arta@student.test',
  role: 'STUDENT',
  organization: { id: 'org-1', name: 'Oxford Academy' },
  invited_by: { first_name: 'Drita', last_name: 'Krasniqi' },
  expires_at: '2026-11-07T12:00:00.000Z',
}

const STUDENT_MEMBERSHIP: AuthUser['memberships'][number] = {
  id: 'membership-9',
  role: 'STUDENT',
  permissions: [],
  organization: { id: 'org-1', name: 'Oxford Academy', type: 'ACADEMY', status: 'ACTIVE', ...DEFAULT_SETTINGS },
}

const serveMySchool = () =>
  server.use(
    http.get('*/api/organizations/org-1/me/student', () =>
      HttpResponse.json({ data: { organization: { id: 'org-1', name: 'Oxford Academy' }, student: { first_name: 'Arta', last_name: 'Gashi', student_number: 'STU-0007' }, academic_year: null, term: null } }),
    ),
  )

const servePreview = (preview: InvitationPreview = PREVIEW) => server.use(http.get(`*/api/invitations/${TOKEN}`, () => HttpResponse.json({ data: preview })))

/** Accepting answers with the organization, and /auth/me from then on includes the new membership */
const serveAccept = (user: AuthUser) => {
  const accepted: string[] = []
  server.use(
    http.post(`*/api/invitations/${TOKEN}/accept`, () => {
      accepted.push(TOKEN)
      server.use(http.get('*/api/auth/me', () => HttpResponse.json({ data: { ...user, memberships: [...user.memberships, STUDENT_MEMBERSHIP] } })))
      return HttpResponse.json({ data: { organization_id: 'org-1' } })
    }),
  )
  return accepted
}

describe('invite page', () => {
  it('shows a logged-out visitor who invited them, and offers to create an account with the email locked or to log in', async () => {
    servePreview()
    renderRoute(`/invite/${TOKEN}`)

    expect(await screen.findByRole('heading', { name: 'Join Oxford Academy' })).toBeInTheDocument()
    expect(screen.getByText(/Drita Krasniqi invited you as a student/)).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('arta@student.test')
    expect(screen.getByLabelText('Email')).toHaveAttribute('readonly')
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', `/login?redirect=%2Finvite%2F${TOKEN}`)
  })

  it('lets a brand-new student create their account from the link and lands them in Oxford Academy', async () => {
    servePreview()
    const newUser = buildUser({ id: 'user-9', first_name: 'Arta', last_name: 'Gashi', email: 'arta@student.test' })
    const registered: unknown[] = []
    server.use(
      http.post('*/api/auth/register', async ({ request }) => {
        registered.push(await request.json())
        return HttpResponse.json({ data: { user: newUser, accessToken: 'a', refreshToken: 'r' } }, { status: 201 })
      }),
    )
    const accepted = serveAccept(newUser)
    serveMySchool()
    const { router, user } = renderRoute(`/invite/${TOKEN}`)

    await user.type(await screen.findByLabelText('First name'), 'Arta')
    await user.type(screen.getByLabelText('Last name'), 'Gashi')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create account and join' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/my-school'))
    expect(registered).toEqual([{ first_name: 'Arta', last_name: 'Gashi', email: 'arta@student.test', password: 'password123' }])
    expect(accepted).toEqual([TOKEN])
    expect(localStorage.getItem(ACTIVE_ORGANIZATION_STORAGE_KEY)).toBe('org-1')
    expect(await screen.findByText('STU-0007')).toBeInTheDocument()
  })

  it('lets the invited user, already logged in, accept and opens that organization', async () => {
    servePreview({ ...PREVIEW, organization: { id: 'org-1', name: 'Oxford Academy' } })
    const invited = buildUser({ email: 'arta@student.test', memberships: [] })
    signInAs(invited)
    const accepted = serveAccept(invited)
    serveMySchool()
    const { router, user } = renderRoute(`/invite/${TOKEN}`)

    await user.click(await screen.findByRole('button', { name: 'Accept invitation' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/my-school'))
    expect(accepted).toEqual([TOKEN])
    expect(localStorage.getItem(ACTIVE_ORGANIZATION_STORAGE_KEY)).toBe('org-1')
  })

  it('refuses a user logged in with another email and offers to switch account', async () => {
    servePreview()
    signInAs(buildUser({ email: 'elsa@school.test', memberships: OWNER_MEMBERSHIPS }))
    server.use(http.post('*/api/auth/logout', () => HttpResponse.json({ message: 'Logged out' })))
    const { user } = renderRoute(`/invite/${TOKEN}`)

    expect(await screen.findByText(/This invitation is for arta@student.test/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Accept invitation' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Switch account' }))

    expect(await screen.findByLabelText('Email')).toHaveValue('arta@student.test')
  })

  it('explains a link that can’t be used', async () => {
    server.use(http.get(`*/api/invitations/${TOKEN}`, () => HttpResponse.json({ error: 'This invitation was withdrawn.' }, { status: 410 })))
    renderRoute(`/invite/${TOKEN}`)

    expect(await screen.findByRole('heading', { name: 'This invitation can’t be used' })).toBeInTheDocument()
    expect(screen.getByText('This invitation was withdrawn.')).toBeInTheDocument()
  })

  it('brings a user who logs in from the link back to it', async () => {
    servePreview()
    const invited = buildUser({ email: 'arta@student.test', memberships: OWNER_MEMBERSHIPS })
    server.use(http.post('*/api/auth/login', () => HttpResponse.json({ data: { user: invited, accessToken: 'a', refreshToken: 'r' } })))
    const { router, user } = renderRoute(`/login?redirect=%2Finvite%2F${TOKEN}`)

    await user.type(await screen.findByLabelText('Email'), 'arta@student.test')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`/invite/${TOKEN}`))
    expect(await screen.findByRole('button', { name: 'Accept invitation' })).toBeInTheDocument()
  })

  it('ignores a redirect that isn’t an invite link', async () => {
    const owner = buildUser({ memberships: OWNER_MEMBERSHIPS })
    server.use(
      http.post('*/api/auth/login', () => HttpResponse.json({ data: { user: owner, accessToken: 'a', refreshToken: 'r' } })),
      http.get('*/api/organizations/org-1/overview', () => HttpResponse.json({ data: { counts: { members: 1, admins: 0, pending_invitations: 0 }, pending_invitations: [], activity: [] } })),
    )
    const { router, user } = renderRoute('/login?redirect=https%3A%2F%2Fevil.test')

    await user.type(await screen.findByLabelText('Email'), 'elsa@school.test')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/overview'))
  })
})
