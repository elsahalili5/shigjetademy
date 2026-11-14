import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getHomePath } from '#/modules/auth/utils/session-user'
import { buildUser, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'

describe('opening the site', () => {
  it('sends a visitor who is not signed in to log in', async () => {
    const { router } = renderRoute('/')

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })

  it('sends a signed-in user to their dashboard', async () => {
    const user = buildUser()
    signInAs(user)
    const { router } = renderRoute('/')

    await waitFor(() => expect(router.state.location.pathname).toBe(getHomePath(user)))
  })

  it('keeps the marketing homepage at /home', async () => {
    renderRoute('/home')

    expect(await screen.findByRole('link', { name: 'Shigjetademy home' })).toHaveAttribute('href', '/home')
  })
})
