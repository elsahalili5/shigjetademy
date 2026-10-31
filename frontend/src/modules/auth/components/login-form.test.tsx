import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { buildUser, OWNER_MEMBERSHIPS } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

describe('LoginForm', () => {
  it('shows the server’s message when the password is wrong', async () => {
    server.use(http.post('*/api/auth/login', () => HttpResponse.json({ error: 'Invalid email or password' }, { status: 401 })))
    const { user } = renderRoute('/login')

    await user.type(await screen.findByLabelText('Email'), 'elsa@school.test')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
  })

  it('clears the server’s message once the user edits the form again', async () => {
    server.use(http.post('*/api/auth/login', () => HttpResponse.json({ error: 'Invalid email or password' }, { status: 401 })))
    const { user } = renderRoute('/login')

    await user.type(await screen.findByLabelText('Email'), 'elsa@school.test')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    await screen.findByRole('alert')
    await user.type(screen.getByLabelText('Password'), '1')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('takes an owner to their Overview after logging in', async () => {
    const owner = buildUser({ memberships: OWNER_MEMBERSHIPS })
    server.use(
      http.post('*/api/auth/login', () => HttpResponse.json({ data: { user: owner, accessToken: 'a', refreshToken: 'r' } })),
      http.get('*/api/organizations/org-1/overview', () =>
        HttpResponse.json({ data: { counts: { members: 1, admins: 0, pending_invitations: 0 }, pending_invitations: [], activity: [] } }),
      ),
    )
    const { router, user } = renderRoute('/login')

    await user.type(await screen.findByLabelText('Email'), 'elsa@school.test')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/overview'))
  })
})

describe('LoginForm server validation', () => {
  it('puts the server’s field errors under their fields', async () => {
    server.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json({ error: 'Validation failed', details: { formErrors: [], fieldErrors: { email: ['This email is blocked'] } } }, { status: 400 }),
      ),
    )
    const { user } = renderRoute('/login')

    await user.type(await screen.findByLabelText('Email'), 'elsa@school.test')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findAllByText('This email is blocked')).not.toHaveLength(0)
  })
})
