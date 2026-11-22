import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import type { AuthUser } from '@shigjetademy/shared/auth'
import { buildUser, DEFAULT_SETTINGS, OWNER_MEMBERSHIPS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'
import { FOCUS_SESSION_STORAGE_KEY } from '../hooks/use-focus-session'

const STUDENT_MEMBERSHIPS: AuthUser['memberships'] = [
  { id: 'membership-9', role: 'STUDENT', permissions: [], organization: { id: 'org-1', name: 'Oxford Academy', type: 'ACADEMY', status: 'ACTIVE', ...DEFAULT_SETTINGS } },
]

const STUDENT = buildUser({ first_name: 'Arta', last_name: 'Gashi', email: 'arta@student.test', memberships: STUDENT_MEMBERSHIPS })

const storeSession = (session: object) => localStorage.setItem(FOCUS_SESSION_STORAGE_KEY, JSON.stringify(session))

const getModules = async () => within(await screen.findByRole('navigation', { name: 'Modules' }))

afterEach(() => {
  localStorage.removeItem(FOCUS_SESSION_STORAGE_KEY)
})

describe('Focus', () => {
  it('opens from the student sidebar with a 25 minute timer and no goal', async () => {
    signInAs(STUDENT)
    server.use(http.get('*/api/organizations/org-1/me/student', () => HttpResponse.json({ data: null })))
    const { router, user } = renderRoute('/dashboard/my-school')

    await user.click((await getModules()).getByRole('link', { name: 'Focus' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/focus'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Focus' })).toBeInTheDocument()
    expect(screen.getByRole('timer', { name: 'Time left' })).toHaveTextContent('25:00')
    expect(screen.getByRole('button', { name: '25 min' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('What will you work on?')).toHaveValue('')
  })

  it('sets a goal and a length, starts, pauses and resets the timer, and shows the time left in the sidebar', async () => {
    signInAs(STUDENT)
    const { user } = renderRoute('/dashboard/focus')

    await user.click(await screen.findByRole('button', { name: '45 min' }))
    expect(screen.getByRole('timer', { name: 'Time left' })).toHaveTextContent('45:00')

    await user.click(screen.getByRole('button', { name: 'Start' }))

    expect(screen.getByRole('button', { name: '15 min' })).toBeDisabled()
    expect((await getModules()).getByRole('link', { name: /^Focus/ })).toHaveTextContent(/^Focus(45:00|44:5\d)$/)

    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByRole('timer', { name: 'Time left' })).toHaveTextContent('45:00')
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
    expect((await getModules()).getByRole('link', { name: 'Focus' })).toHaveTextContent(/^Focus$/)
  })

  it('adds goals, ticks one off, adds the next, and removes one', async () => {
    signInAs(STUDENT)
    const { user } = renderRoute('/dashboard/focus')

    await user.type(await screen.findByLabelText('What will you work on?'), 'Maths exercises 1 to 10{Enter}')
    expect(screen.getByLabelText('What will you work on?')).toHaveValue('')
    const timer = screen.getByRole('region', { name: 'Timer' })
    expect(within(timer).getByText('Maths exercises 1 to 10')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Maths exercises 1 to 10' }))
    expect(screen.getByText('Every goal reached. Add another or take a break.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('What will you work on?'), 'Read chapter 3')
    await user.click(screen.getByRole('button', { name: 'Add goal' }))

    expect(screen.getByRole('checkbox', { name: 'Maths exercises 1 to 10' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Read chapter 3' })).not.toBeChecked()
    expect(screen.getByText('1 of 2 done')).toBeInTheDocument()
    expect(within(timer).getByText('Read chapter 3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove Maths exercises 1 to 10' }))
    expect(screen.queryByRole('checkbox', { name: 'Maths exercises 1 to 10' })).not.toBeInTheDocument()
    expect(screen.getByText('0 of 1 done')).toBeInTheDocument()
  })

  it('keeps a running timer across a reload, and says when the time is up', async () => {
    storeSession({ status: 'running', goals: [{ id: 'goal-1', text: 'Read chapter 3', isDone: false }], minutes: 25, endsAt: new Date(Date.now() - 1000).toISOString() })
    signInAs(STUDENT)
    const { user } = renderRoute('/dashboard/focus')

    expect(await screen.findByText('Time’s up. Take a short break.')).toBeInTheDocument()
    expect(screen.getByRole('timer', { name: 'Time left' })).toHaveTextContent('0:00')

    await user.click(screen.getByRole('checkbox', { name: 'Read chapter 3' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(screen.getByRole('timer', { name: 'Time left' })).toHaveTextContent('25:00')
    expect(screen.getByRole('checkbox', { name: 'Read chapter 3' })).toBeChecked()
  })

  it('starts fresh when the stored session is broken', async () => {
    localStorage.setItem(FOCUS_SESSION_STORAGE_KEY, '{not json')
    signInAs(STUDENT)
    renderRoute('/dashboard/focus')

    expect(await screen.findByRole('timer', { name: 'Time left' })).toHaveTextContent('25:00')
  })

  it('is only for students', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    const { router } = renderRoute('/dashboard/focus')

    await waitFor(() => expect(router.state.location.pathname).not.toBe('/dashboard/focus'))
  })
})
