import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { createUser, TEST_PASSWORD } from '../../../test/factories.ts'
import { AuthService } from './auth.service.ts'

const RACING_REFRESHES = 5

const register = (email: string) =>
  request(app).post('/api/auth/register').send({ first_name: 'Elsa', last_name: 'Halili', email, password: TEST_PASSWORD })

describe('auth', () => {
  it('registers a provider and returns a session without the password hash', async () => {
    const response = await register('owner@school.test')

    expect(response.status).toBe(201)
    expect(response.body.data.accessToken).toEqual(expect.any(String))
    expect(response.body.data.user.email).toBe('owner@school.test')
    expect(response.body.data.user).not.toHaveProperty('password_hash')
  })

  it('refuses a password longer than the 72 bytes bcrypt reads, even when it has fewer characters', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ first_name: 'Elsa', last_name: 'Halili', email: 'owner@school.test', password: 'ë'.repeat(40) })

    expect(response.status).toBe(400)
  })

  it('refuses a second account with the same email', async () => {
    await register('owner@school.test')

    const response = await register('OWNER@school.test')

    expect(response.status).toBe(409)
  })

  it('locks the account after 5 wrong passwords, even for the right one', async () => {
    await createUser({ email: 'owner@school.test' })
    const attempt = (password: string) => request(app).post('/api/auth/login').send({ email: 'owner@school.test', password })

    for (let count = 0; count < 4; count += 1) {
      expect((await attempt('wrong-password')).status).toBe(401)
    }
    expect((await attempt('wrong-password')).status).toBe(403)
    expect((await attempt(TEST_PASSWORD)).status).toBe(403)
  })

  it('accepts a refresh token once', async () => {
    const { body } = await register('owner@school.test')
    const refresh = () => request(app).post('/api/auth/refresh-token').send({ refreshToken: body.data.refreshToken })

    expect((await refresh()).status).toBe(200)
    expect((await refresh()).status).toBe(401)
  })

  // Over HTTP the test requests reach the service one after another, so the race runs on the service itself
  it('gives a new pair to only one of several refreshes that race with the same token', async () => {
    const { body } = await register('owner@school.test')
    const refresh = () => AuthService.refreshAccessToken({ refreshToken: body.data.refreshToken })

    const results = await Promise.allSettled(Array.from({ length: RACING_REFRESHES }, refresh))

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
  })

  it('says how many minutes are left when the account locks, without a raw date', async () => {
    await createUser({ email: 'owner@school.test' })
    const attempt = (password: string) => request(app).post('/api/auth/login').send({ email: 'owner@school.test', password })

    for (let count = 0; count < 4; count += 1) {
      await attempt('wrong-password')
    }
    const locking = await attempt('wrong-password')
    const locked = await attempt(TEST_PASSWORD)

    expect(locking.body.error).toBe('Too many failed attempts. Try again in 15 minutes.')
    expect(locked.body.error).toBe('Too many failed attempts. Try again in 15 minutes.')
  })
})
