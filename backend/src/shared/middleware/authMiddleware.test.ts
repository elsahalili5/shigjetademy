import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { clearPlatformSettingsCache } from '@modules/platform-settings/platform-settings.service.ts'
import { createUser, loginAs } from '../../../test/factories.ts'

let adminAuth: string
let userAuth: string

// A direct write bypasses PlatformSettingsService.updateSettings, so it must clear the cache itself
const turnOnMaintenance = async (maintenance_message: string | null = 'Back soon') => {
  await prisma.platformSettings.upsert({
    where: { id: 1 },
    update: { maintenance_mode: true, maintenance_message },
    create: { id: 1, maintenance_mode: true, maintenance_message },
  })
  clearPlatformSettingsCache()
}

beforeEach(async () => {
  await createUser({ email: 'admin@platform.test', isPlatformAdmin: true })
  await createUser({ email: 'owner@oxford.test' })
  adminAuth = await loginAs('admin@platform.test')
  userAuth = await loginAs('owner@oxford.test')
})

describe('authMiddleware: maintenance mode', () => {
  it('lets a non-admin request through when maintenance mode is off', async () => {
    expect((await request(app).get('/api/auth/me').set('Authorization', userAuth)).status).toBe(200)
  })

  it('refuses a non-admin request with 503 and the maintenance message', async () => {
    await turnOnMaintenance('We’re upgrading. Back in an hour.')

    const response = await request(app).get('/api/auth/me').set('Authorization', userAuth)

    expect(response.status).toBe(503)
    expect(response.body.error).toBe('We’re upgrading. Back in an hour.')
  })

  it('lets a platform admin through during maintenance', async () => {
    await turnOnMaintenance()

    expect((await request(app).get('/api/auth/me').set('Authorization', adminAuth)).status).toBe(200)
  })
})
