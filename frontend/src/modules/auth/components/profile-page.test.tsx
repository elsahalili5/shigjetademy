import { act, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { storeActiveOrganizationId } from '#/modules/auth/utils/active-organization-storage'
import { buildUser, OWNER_MEMBERSHIPS, signInAs, YLLKA_ADMIN_MEMBERSHIP } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const owner = buildUser({ memberships: OWNER_MEMBERSHIPS })

describe('ProfilePage', () => {
  it('saves new details and shows the new name in the sidebar', async () => {
    signInAs(owner)
    server.use(http.put('*/api/auth/me', () => HttpResponse.json({ data: { ...owner, last_name: 'Krasniqi' } })))
    const { user } = renderRoute('/dashboard/profile')

    const lastName = await screen.findByLabelText('Last name')
    await user.clear(lastName)
    await user.type(lastName, 'Krasniqi')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Your details are saved.')).toBeInTheDocument()
    expect(within(screen.getByRole('link', { name: 'Your profile' })).getByText('Elsa Krasniqi')).toBeInTheDocument()
  })

  it('shows the active organization and follows a switch to another one', async () => {
    signInAs(buildUser({ memberships: [...OWNER_MEMBERSHIPS, YLLKA_ADMIN_MEMBERSHIP] }))
    storeActiveOrganizationId('org-2')
    renderRoute('/dashboard/profile')

    const identity = await screen.findByRole('region', { name: 'Elsa Halili' })
    expect(identity).toHaveTextContent('School admin')
    expect(identity).toHaveTextContent('Yllka Kindergarten')
    const organizations = screen.getByRole('region', { name: 'Your organizations' })
    expect(within(organizations).getByRole('listitem', { current: true })).toHaveTextContent('Yllka Kindergarten')

    act(() => storeActiveOrganizationId('org-1'))

    expect(identity).toHaveTextContent('Owner')
    expect(identity).toHaveTextContent('Oxford Academy')
    expect(within(organizations).getByRole('listitem', { current: true })).toHaveTextContent('Oxford Academy')
  })

  it('checks that the new passwords match before sending', async () => {
    signInAs(owner)
    const { user } = renderRoute('/dashboard/profile')

    await user.type(await screen.findByLabelText('Current password'), 'password123')
    await user.type(screen.getByLabelText('New password'), 'new-password-1')
    await user.type(screen.getByLabelText('Repeat new password'), 'new-password-2')
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByText('The passwords don’t match.')).toBeInTheDocument()
  })

  it('shows the server’s message when the current password is wrong', async () => {
    signInAs(owner)
    server.use(http.post('*/api/auth/change-password', () => HttpResponse.json({ error: 'Your current password isn’t right' }, { status: 400 })))
    const { user } = renderRoute('/dashboard/profile')

    await user.type(await screen.findByLabelText('Current password'), 'wrong-password')
    await user.type(screen.getByLabelText('New password'), 'new-password-1')
    await user.type(screen.getByLabelText('Repeat new password'), 'new-password-1')
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Your current password isn’t right')
  })
})

describe('Avatar', () => {
  it('uploads a photo and shows it in the sidebar', async () => {
    signInAs(owner)
    let uploadedName: string | null = null
    // Like the real server, refuse anything that isn't a multipart body carrying the file; the raw body is read
    // because undici's formData() parser rejects jsdom's File in this environment
    server.use(
      http.post('*/api/auth/avatar', async ({ request }) => {
        const isMultipart = request.headers.get('content-type')?.startsWith('multipart/form-data') ?? false
        const filePart = /name="avatar"; filename="([^"]+)"/.exec(await request.text())
        if (!isMultipart || !filePart) return HttpResponse.json({ message: 'Choose an image to upload.' }, { status: 400 })
        uploadedName = filePart[1]
        return HttpResponse.json({ data: { ...owner, avatar_url: '/api/uploads/avatars/user-1-1.png' } })
      }),
    )
    const { user } = renderRoute('/dashboard/profile')

    const file = new File(['fake-image-bytes'], 'avatar.png', { type: 'image/png' })
    await user.upload(await screen.findByLabelText('Profile photo file'), file)

    await waitFor(() => {
      const sidebarAvatar = screen.getByRole('link', { name: 'Your profile' }).querySelector('img')
      expect(sidebarAvatar).toHaveAttribute('src', '/api/uploads/avatars/user-1-1.png')
    })
    expect(uploadedName).toBe('avatar.png')
  })

  it('rejects an oversized image before uploading', async () => {
    signInAs(owner)
    const { user } = renderRoute('/dashboard/profile')

    const file = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
    await user.upload(await screen.findByLabelText('Profile photo file'), file)

    expect(await screen.findByRole('alert')).toHaveTextContent('Images must be 2MB or smaller.')
  })

  it('removes the photo', async () => {
    signInAs({ ...owner, avatar_url: '/api/uploads/avatars/user-1-1.png' })
    server.use(http.delete('*/api/auth/avatar', () => HttpResponse.json({ data: { ...owner, avatar_url: null } })))
    const { user } = renderRoute('/dashboard/profile')

    await user.click(await screen.findByRole('button', { name: 'Remove photo' }))

    expect(await screen.findByRole('button', { name: 'Add photo' })).toBeInTheDocument()
  })
})
