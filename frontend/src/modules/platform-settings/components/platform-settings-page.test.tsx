import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { updatePlatformSettingsSchema } from '@shigjetademy/shared/platform-settings'
import type { PlatformSettings, UpdatePlatformSettingsInput } from '@shigjetademy/shared/platform-settings'
import { buildUser, DEFAULT_PLATFORM_SETTINGS, PLATFORM_ADMIN_ROLES, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const serveSettings = (settings: PlatformSettings = DEFAULT_PLATFORM_SETTINGS) =>
  server.use(http.get('*/api/platform/settings', () => HttpResponse.json({ data: settings })))

const signInAsPlatformAdmin = () => {
  signInAs(buildUser({ user_roles: PLATFORM_ADMIN_ROLES }))
  serveSettings()
}

describe('platform settings', () => {
  it('shows the saved settings and saves new ones', async () => {
    signInAsPlatformAdmin()
    let sent: UpdatePlatformSettingsInput | undefined
    server.use(
      http.put('*/api/platform/settings', async ({ request }) => {
        sent = updatePlatformSettingsSchema.parse(await request.json())
        return HttpResponse.json({ data: sent })
      }),
    )
    const { user } = renderRoute('/dashboard/settings')

    expect(await screen.findByRole('heading', { level: 1, name: 'Platform settings' })).toBeInTheDocument()
    const platformName = await screen.findByLabelText('Platform name')
    expect(platformName).toHaveValue('Shigjetademy')
    expect(screen.getByLabelText('Maintenance mode')).toHaveValue('false')

    await user.clear(platformName)
    await user.type(platformName, 'Shigjetademy Platform')
    await user.click(screen.getByRole('button', { name: 'Save settings' }))

    expect(await screen.findByText('The platform settings are saved.')).toBeInTheDocument()
    expect(sent).toMatchObject({ platform_name: 'Shigjetademy Platform' })
  })

  it('shows the maintenance message field only once maintenance mode is on', async () => {
    signInAsPlatformAdmin()
    const { user } = renderRoute('/dashboard/settings')

    await screen.findByLabelText('Platform name')
    expect(screen.queryByLabelText('Maintenance message', { exact: false })).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Maintenance mode'), 'true')

    expect(await screen.findByLabelText('Maintenance message', { exact: false })).toBeInTheDocument()
  })

  it('rejects a negative trial length', async () => {
    signInAsPlatformAdmin()
    const { user } = renderRoute('/dashboard/settings')

    const trialDays = await screen.findByLabelText('Default trial length (days)', { exact: false })
    await user.clear(trialDays)
    await user.type(trialDays, '-5')
    await user.click(screen.getByRole('button', { name: 'Save settings' }))

    expect(await screen.findByText('Enter zero or more days.')).toBeInTheDocument()
  })

  it('shows the server’s message when saving fails', async () => {
    signInAsPlatformAdmin()
    server.use(http.put('*/api/platform/settings', () => HttpResponse.json({ error: 'Something went wrong on our end' }, { status: 500 })))
    const { user } = renderRoute('/dashboard/settings')

    const platformName = await screen.findByLabelText('Platform name')
    await user.type(platformName, ' Platform')
    await user.click(screen.getByRole('button', { name: 'Save settings' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our end')
  })

  it('offers a retry when the settings don’t load', async () => {
    signInAs(buildUser({ user_roles: PLATFORM_ADMIN_ROLES }))
    server.use(http.get('*/api/platform/settings', () => HttpResponse.json({ error: 'Down' }, { status: 500 })))
    renderRoute('/dashboard/settings')

    expect(await screen.findByText('We couldn’t load the platform settings.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
