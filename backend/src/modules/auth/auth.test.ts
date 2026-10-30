import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { createUser, TEST_PASSWORD } from '../../../test/factories.ts'

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
})
