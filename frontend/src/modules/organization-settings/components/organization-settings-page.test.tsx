import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { deactivateOrganizationSchema, reactivateOrganizationSchema, transferOwnershipSchema, updateOrganizationSettingsSchema } from '@shigjetademy/shared/organization-settings'
import type { OrganizationSettings, TransferOwnershipInput, UpdateOrganizationSettingsInput } from '@shigjetademy/shared/organization-settings'
import type { OrganizationMember } from '@shigjetademy/shared/organization'
import { buildUser, DEFAULT_SETTINGS, OWNER_MEMBERSHIPS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const [OWNER_MEMBERSHIP] = OWNER_MEMBERSHIPS

const OWNER: OrganizationMember = {
  membership_id: 'membership-1',
  id: 'user-1',
  first_name: 'Elsa',
  last_name: 'Halili',
  email: 'elsa@school.test',
  role: 'OWNER',
  permissions: [],
  joined_at: '2026-10-01T09:00:00.000Z',
}

const ADMIN_MEMBERSHIP_ID = '5b1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e6f'

const ADMIN: OrganizationMember = {
  membership_id: ADMIN_MEMBERSHIP_ID,
  id: 'user-2',
  first_name: 'Drita',
  last_name: 'Berisha',
  email: 'drita@oxford.test',
  role: 'ADMIN',
  permissions: ['MANAGE_STUDENTS'],
  joined_at: '2026-10-31T09:00:00.000Z',
}

const serveSettings = (settings: OrganizationSettings = DEFAULT_SETTINGS) =>
  server.use(http.get('*/api/organizations/org-1/settings', () => HttpResponse.json({ data: settings })))

const serveMembers = (members: OrganizationMember[]) => server.use(http.get('*/api/organizations/org-1/members', () => HttpResponse.json({ data: members })))

const signInAsOwner = () => {
  signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
  serveSettings()
}

const preferences = () => screen.findByRole('region', { name: 'General preferences' })

describe('organization settings: general preferences', () => {
  it('opens from the owner’s sidebar, right under Messages at the end of Organization', async () => {
    signInAsOwner()
    server.use(http.get('*/api/organizations/org-1/overview', () => HttpResponse.json({ data: { counts: { members: 1, admins: 0, pending_invitations: 0 }, pending_invitations: [], activity: [] } })))
    const { user, router } = renderRoute('/dashboard/overview')

    const organization = await screen.findByRole('group', { name: 'Organization' })
    const labels = within(organization).getAllByRole('link').map((link) => link.textContent)
    expect(labels.at(-1)).toBe('Organization settings')
    expect(labels.at(-2)).toBe('Messages')

    await user.click(within(organization).getByRole('link', { name: 'Organization settings' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Organization settings' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/dashboard/organization-settings')
  })

  it('shows the saved preferences and saves a new time zone', async () => {
    signInAsOwner()
    let sent: UpdateOrganizationSettingsInput | undefined
    server.use(
      http.put('*/api/organizations/org-1/settings', async ({ request }) => {
        sent = updateOrganizationSettingsSchema.parse(await request.json())
        return HttpResponse.json({ data: sent })
      }),
    )
    const { user } = renderRoute('/dashboard/organization-settings')

    const section = await preferences()
    const timeZone = within(section).getByLabelText('Time zone')
    expect(timeZone).toHaveValue('Europe/Belgrade')
    expect(within(section).getByLabelText('First day of the week')).toHaveValue('MONDAY')
    expect(within(section).getByLabelText('Date format')).toHaveValue('DAY_MONTH_YEAR')

    await user.selectOptions(timeZone, 'Europe/Tirane')
    await user.click(within(section).getByRole('button', { name: 'Save preferences' }))

    expect(await within(section).findByText('The preferences are saved.')).toBeInTheDocument()
    expect(sent).toEqual({ time_zone: 'Europe/Tirane', week_start: 'MONDAY', date_format: 'DAY_MONTH_YEAR' })
  })

  it('previews the date format before saving it', async () => {
    signInAsOwner()
    const { user } = renderRoute('/dashboard/organization-settings')

    const section = await preferences()
    expect(within(section).getByText('Dates look like 31 Oct 2026')).toBeInTheDocument()

    await user.selectOptions(within(section).getByLabelText('Date format'), 'MONTH_DAY_YEAR')

    expect(within(section).getByText('Dates look like Oct 31, 2026')).toBeInTheDocument()
  })

  it('shows the server’s message when saving fails', async () => {
    signInAsOwner()
    server.use(http.put('*/api/organizations/org-1/settings', () => HttpResponse.json({ error: 'This organization is suspended' }, { status: 403 })))
    const { user } = renderRoute('/dashboard/organization-settings')

    const section = await preferences()
    await user.selectOptions(within(section).getByLabelText('First day of the week'), 'SUNDAY')
    await user.click(within(section).getByRole('button', { name: 'Save preferences' }))

    expect(await within(section).findByRole('alert')).toHaveTextContent('This organization is suspended')
  })

  it('offers a retry when the settings don’t load', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    server.use(http.get('*/api/organizations/org-1/settings', () => HttpResponse.json({ error: 'Down' }, { status: 500 })))
    serveMembers([OWNER, ADMIN])
    renderRoute('/dashboard/organization-settings')

    expect(await screen.findByText('We couldn’t load the settings.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('keeps school admins out and out of their sidebar', async () => {
    signInAs(buildUser({ memberships: [{ ...OWNER_MEMBERSHIP, role: 'ADMIN' }] }))
    const { router } = renderRoute('/dashboard/organization-settings')

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/academic-periods'))
    const sidebar = await screen.findByRole('navigation', { name: 'Modules' })
    expect(within(sidebar).queryByRole('link', { name: 'Organization settings' })).not.toBeInTheDocument()
  })

  it('writes dates in the new format across the dashboard as soon as it is saved', async () => {
    signInAsOwner()
    serveMembers([OWNER, ADMIN])
    server.use(
      http.get('*/api/organizations/org-1/invitations', () => HttpResponse.json({ data: [] })),
      http.put('*/api/organizations/org-1/settings', async ({ request }) => HttpResponse.json({ data: updateOrganizationSettingsSchema.parse(await request.json()) })),
    )
    const { user } = renderRoute('/dashboard/organization-settings')

    const section = await preferences()
    await user.selectOptions(within(section).getByLabelText('Date format'), 'MONTH_DAY_YEAR')
    await user.click(within(section).getByRole('button', { name: 'Save preferences' }))
    expect(await within(section).findByText('The preferences are saved.')).toBeInTheDocument()

    await user.click(within(screen.getByRole('complementary')).getByRole('link', { name: 'Members and permissions' }))
    const people = await screen.findByRole('region', { name: 'People with access' })
    expect(await within(people).findByText('drita@oxford.test · joined Oct 31, 2026')).toBeInTheDocument()
  })

  it('shows a school admin dates in the organization’s format, without reading the settings', async () => {
    signInAs(buildUser({ memberships: [{ ...OWNER_MEMBERSHIP, role: 'ADMIN', organization: { ...OWNER_MEMBERSHIP.organization, date_format: 'MONTH_DAY_YEAR' } }] }))
    server.use(
      http.get('*/api/organizations/org-1/profile', () =>
        HttpResponse.json({
          data: { id: 'org-1', name: 'Oxford Academy', type: 'ACADEMY', country: 'XK', currency: 'EUR', size: null, email: null, phone: null, website: null, status: 'ACTIVE', created_at: '2026-10-01T09:00:00.000Z' },
        }),
      ),
    )
    renderRoute('/dashboard/organization-profile')

    expect(await screen.findByText('Joined Oct 1, 2026')).toBeInTheDocument()
  })
})

// The dialog stays in the page while closed, so it is found even when hidden
const transferDialog = () => screen.getByRole('dialog', { name: 'Transfer ownership', hidden: true })

describe('organization settings: transfer ownership', () => {
  it('hands the organization to a school admin and gives the old owner the school admin sidebar', async () => {
    let me = buildUser({ memberships: OWNER_MEMBERSHIPS })
    signInAs(me)
    server.use(http.get('*/api/auth/me', () => HttpResponse.json({ data: me })))
    serveSettings()
    serveMembers([OWNER, ADMIN])
    let sent: TransferOwnershipInput | undefined
    server.use(
      http.post('*/api/organizations/org-1/settings/transfer-ownership', async ({ request }) => {
        sent = transferOwnershipSchema.parse(await request.json())
        me = buildUser({ memberships: [{ ...OWNER_MEMBERSHIP, role: 'ADMIN' }] })
        return HttpResponse.json({ message: 'Ownership transferred' })
      }),
    )
    const { user, router } = renderRoute('/dashboard/organization-settings')

    const section = await screen.findByRole('region', { name: 'Transfer ownership' })
    await user.click(await within(section).findByRole('button', { name: 'Transfer ownership…' }))
    const dialog = transferDialog()
    await user.selectOptions(within(dialog).getByLabelText('New owner'), ADMIN_MEMBERSHIP_ID)
    await user.type(within(dialog).getByLabelText('Your password'), 'password123')
    await user.click(within(dialog).getByRole('button', { name: 'Transfer ownership' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/academic-periods'))
    expect(sent).toEqual({ membership_id: ADMIN_MEMBERSHIP_ID, password: 'password123' })
    const sidebar = await screen.findByRole('navigation', { name: 'Modules' })
    expect(within(sidebar).queryByRole('group', { name: 'Organization' })).not.toBeInTheDocument()
    expect(within(sidebar).queryByRole('link', { name: 'Overview' })).not.toBeInTheDocument()
  })

  it('shows the server’s message for a wrong password and keeps the dialog open', async () => {
    signInAsOwner()
    serveMembers([OWNER, ADMIN])
    server.use(http.post('*/api/organizations/org-1/settings/transfer-ownership', () => HttpResponse.json({ error: 'Your password isn’t right' }, { status: 400 })))
    const { user, router } = renderRoute('/dashboard/organization-settings')

    const section = await screen.findByRole('region', { name: 'Transfer ownership' })
    await user.click(await within(section).findByRole('button', { name: 'Transfer ownership…' }))
    const dialog = transferDialog()
    await user.selectOptions(within(dialog).getByLabelText('New owner'), ADMIN_MEMBERSHIP_ID)
    await user.type(within(dialog).getByLabelText('Your password'), 'wrong-password')
    await user.click(within(dialog).getByRole('button', { name: 'Transfer ownership' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Your password isn’t right')
    expect(router.state.location.pathname).toBe('/dashboard/organization-settings')
  })

  it('offers only active school admins, and says so when there are none', async () => {
    signInAsOwner()
    serveMembers([OWNER])
    renderRoute('/dashboard/organization-settings')

    const section = await screen.findByRole('region', { name: 'Transfer ownership' })
    expect(await within(section).findByText('Ownership can only go to a school admin. Invite one first.')).toBeInTheDocument()
    expect(within(section).getByRole('link', { name: 'Go to Members' })).toHaveAttribute('href', '/dashboard/members')
    expect(within(section).queryByRole('button', { name: 'Transfer ownership…' })).not.toBeInTheDocument()
  })
})

const withStatus = (status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED') => [{ ...OWNER_MEMBERSHIP, organization: { ...OWNER_MEMBERSHIP.organization, status } }]

const deactivateDialog = () => screen.getByRole('dialog', { name: 'Deactivate Oxford Academy', hidden: true })

describe('organization settings: deactivate and reactivate', () => {
  it('deactivates after the name and password, blocks the Overview, and reactivating restores it', async () => {
    let me = buildUser({ memberships: withStatus('ACTIVE') })
    signInAs(me)
    server.use(http.get('*/api/auth/me', () => HttpResponse.json({ data: me })))
    serveSettings()
    serveMembers([OWNER, ADMIN])
    server.use(
      http.get('*/api/organizations/org-1/overview', () => HttpResponse.json({ data: { counts: { members: 2, admins: 1, pending_invitations: 0 }, pending_invitations: [], activity: [] } })),
      http.post('*/api/organizations/org-1/settings/deactivate', async ({ request }) => {
        deactivateOrganizationSchema.parse(await request.json())
        me = buildUser({ memberships: withStatus('DEACTIVATED') })
        return HttpResponse.json({ data: { id: 'org-1', status: 'DEACTIVATED' } })
      }),
      http.post('*/api/organizations/org-1/settings/reactivate', async ({ request }) => {
        reactivateOrganizationSchema.parse(await request.json())
        me = buildUser({ memberships: withStatus('ACTIVE') })
        return HttpResponse.json({ data: { id: 'org-1', status: 'ACTIVE' } })
      }),
    )
    const { user } = renderRoute('/dashboard/organization-settings')

    const dangerZone = await screen.findByRole('region', { name: 'Danger zone' })
    await user.click(within(dangerZone).getByRole('button', { name: 'Deactivate organization…' }))
    const dialog = deactivateDialog()
    await user.type(within(dialog).getByLabelText('Organization name'), 'Oxford Academy')
    await user.type(within(dialog).getByLabelText('Your password'), 'password123')
    await user.click(within(dialog).getByRole('button', { name: 'Deactivate' }))

    expect(await screen.findByRole('region', { name: 'Reactivate the organization' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'General preferences' })).not.toBeInTheDocument()

    await user.click(within(screen.getByRole('complementary')).getByRole('link', { name: 'Overview' }))
    expect(await screen.findByRole('heading', { name: 'This organization is deactivated' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Open organization settings' }))

    await user.type(within(await screen.findByRole('region', { name: 'Reactivate the organization' })).getByLabelText('Your password'), 'password123')
    await user.click(within(screen.getByRole('region', { name: 'Reactivate the organization' })).getByRole('button', { name: 'Reactivate' }))

    expect(await screen.findByRole('region', { name: 'General preferences' })).toBeInTheDocument()
    await user.click(within(screen.getByRole('complementary')).getByRole('link', { name: 'Overview' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument()
  })

  it('asks for the organization’s name exactly before sending anything', async () => {
    signInAsOwner()
    serveMembers([OWNER, ADMIN])
    let isSent = false
    server.use(
      http.post('*/api/organizations/org-1/settings/deactivate', () => {
        isSent = true
        return HttpResponse.json({ data: { id: 'org-1', status: 'DEACTIVATED' } })
      }),
    )
    const { user } = renderRoute('/dashboard/organization-settings')

    const dangerZone = await screen.findByRole('region', { name: 'Danger zone' })
    await user.click(within(dangerZone).getByRole('button', { name: 'Deactivate organization…' }))
    const dialog = deactivateDialog()
    await user.type(within(dialog).getByLabelText('Organization name'), 'oxford academy')
    await user.type(within(dialog).getByLabelText('Your password'), 'password123')
    await user.click(within(dialog).getByRole('button', { name: 'Deactivate' }))

    expect(await within(dialog).findByText('Type Oxford Academy exactly as it is shown.')).toBeInTheDocument()
    expect(isSent).toBe(false)
  })

  it('shows a school admin of a deactivated organization the notice, without a way to reactivate', async () => {
    signInAs(buildUser({ memberships: [{ ...withStatus('DEACTIVATED')[0], role: 'ADMIN' }] }))
    renderRoute('/dashboard/academic-periods')

    expect(await screen.findByRole('heading', { name: 'This organization is deactivated' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open organization settings' })).not.toBeInTheDocument()
  })

  it('keeps a suspended organization’s owner out of settings too', async () => {
    signInAs(buildUser({ memberships: withStatus('SUSPENDED') }))
    renderRoute('/dashboard/organization-settings')

    expect(await screen.findByRole('heading', { name: 'This organization is suspended' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Reactivate the organization' })).not.toBeInTheDocument()
  })
})
