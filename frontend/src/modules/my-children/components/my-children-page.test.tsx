import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { AuthUser } from '@shigjetademy/shared/auth'
import type { MyChild } from '@shigjetademy/shared/guardians'
import { buildUser, DEFAULT_SETTINGS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const GUARDIAN_MEMBERSHIPS: AuthUser['memberships'] = [
  { id: 'membership-5', role: 'GUARDIAN', permissions: [], organization: { id: 'org-1', name: 'Oxford Academy', type: 'ACADEMY', status: 'ACTIVE', ...DEFAULT_SETTINGS } },
]

const ARTA: MyChild = { id: 'student-1', first_name: 'Arta', last_name: 'Gashi' }
const BESA: MyChild = { id: 'student-2', first_name: 'Besa', last_name: 'Gashi' }

const serveChildren = (children: MyChild[]) => server.use(http.get('*/api/organizations/org-1/me/children', () => HttpResponse.json({ data: children })))

describe('MyChildrenPage', () => {
  it('lists the linked children, each opening their own page', async () => {
    signInAs(buildUser({ memberships: GUARDIAN_MEMBERSHIPS }))
    serveChildren([ARTA, BESA])
    renderRoute('/dashboard/my-children')

    expect(await screen.findByRole('heading', { level: 1, name: 'My children' })).toBeInTheDocument()
    const list = await screen.findByRole('list', { name: 'Children' })
    expect(within(list).getByRole('link', { name: 'Arta Gashi' })).toHaveAttribute('href', '/dashboard/my-children/student-1')
    expect(within(list).getByRole('link', { name: 'Besa Gashi' })).toHaveAttribute('href', '/dashboard/my-children/student-2')
  })

  it('says when no child is linked yet', async () => {
    signInAs(buildUser({ memberships: GUARDIAN_MEMBERSHIPS }))
    serveChildren([])
    renderRoute('/dashboard/my-children')

    expect(await screen.findByText('No children linked yet.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Children' })).not.toBeInTheDocument()
  })

  it('shows a skeleton while loading, and offers to try again when it fails', async () => {
    signInAs(buildUser({ memberships: GUARDIAN_MEMBERSHIPS }))
    serveChildren([ARTA])
    server.use(http.get('*/api/organizations/org-1/me/children', () => HttpResponse.json({ error: 'Down' }, { status: 500 }), { once: true }))
    const { user } = renderRoute('/dashboard/my-children')

    await user.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('link', { name: 'Arta Gashi' })).toBeInTheDocument()
  })
})
