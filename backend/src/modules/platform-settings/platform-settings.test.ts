import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createUser, loginAs } from '../../../test/factories.ts'

const settingsPath = '/api/platform/settings'

let adminAuth: string
let userAuth: string

const DEFAULT_SETTINGS = { platform_name: 'Shigjetademy', logo_url: null, maintenance_mode: false, maintenance_message: null, default_trial_days: 14 }

const UPDATE = {
  platform_name: 'Shigjetademy Platform',
  logo_url: 'https://cdn.shigjetademy.test/logo.png',
  maintenance_mode: true,
  maintenance_message: 'Back soon',
  default_trial_days: 30,
}

beforeEach(async () => {
  await createUser({ email: 'admin@platform.test', isPlatformAdmin: true })
  await createUser({ email: 'owner@oxford.test' })
  adminAuth = await loginAs('admin@platform.test')
  userAuth = await loginAs('owner@oxford.test')
})

describe('platform settings', () => {
  it('gives the platform the defaults when no row exists yet', async () => {
    const response = await request(app).get(settingsPath).set('Authorization', adminAuth)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual(DEFAULT_SETTINGS)
    expect(await prisma.platformSettings.count()).toBe(0)
  })

  it('saves the new settings and logs the change', async () => {
    const response = await request(app).put(settingsPath).set('Authorization', adminAuth).send(UPDATE)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual(UPDATE)
    expect((await request(app).get(settingsPath).set('Authorization', adminAuth)).body.data).toEqual(UPDATE)
    const activity = await prisma.activityLog.findMany({ select: { action: true, actor_id: true, organization_id: true } })
    expect(activity).toEqual([{ action: 'PLATFORM_SETTINGS_UPDATED', actor_id: expect.any(String), organization_id: null }])
  })

  it('refuses a user who isn’t a platform admin', async () => {
    expect((await request(app).get(settingsPath).set('Authorization', userAuth)).status).toBe(403)
    expect((await request(app).put(settingsPath).set('Authorization', userAuth).send(UPDATE)).status).toBe(403)
  })

  it('refuses a negative trial days', async () => {
    const response = await request(app).put(settingsPath).set('Authorization', adminAuth).send({ ...UPDATE, default_trial_days: -1 })

    expect(response.status).toBe(400)
    expect(response.body.details.fieldErrors.default_trial_days).toBeDefined()
  })
})
