import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { createUser, TEST_PASSWORD } from '../../../test/factories.ts'

let session: { accessToken: string; refreshToken: string }

beforeEach(async () => {
  await createUser({ email: 'elsa@school.test' })
  const login = await request(app).post('/api/auth/login').send({ email: 'elsa@school.test', password: TEST_PASSWORD })
  session = login.body.data
})

const authHeader = () => `Bearer ${session.accessToken}`

describe('PUT /api/auth/me', () => {
  it('updates the name and email', async () => {
    const response = await request(app)
      .put('/api/auth/me')
      .set('Authorization', authHeader())
      .send({ first_name: 'Elsa', last_name: 'Krasniqi', email: 'Elsa.K@school.test' })

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ last_name: 'Krasniqi', email: 'elsa.k@school.test' })
  })

  it('refuses an email another account uses', async () => {
    await createUser({ email: 'taken@school.test' })

    const response = await request(app)
      .put('/api/auth/me')
      .set('Authorization', authHeader())
      .send({ first_name: 'Elsa', last_name: 'Halili', email: 'taken@school.test' })

    expect(response.status).toBe(409)
  })
})

describe('POST /api/auth/change-password', () => {
  const changePassword = (current_password: string, new_password: string) =>
    request(app).post('/api/auth/change-password').set('Authorization', authHeader()).send({ current_password, new_password })

  it('refuses a wrong current password', async () => {
    expect((await changePassword('not-my-password', 'new-password-1')).status).toBe(400)
  })

  it('changes the password and logs out other sessions', async () => {
    const response = await changePassword(TEST_PASSWORD, 'new-password-1')

    expect(response.status).toBe(200)
    expect(response.body.data.refreshToken).toEqual(expect.any(String))

    const oldRefresh = await request(app).post('/api/auth/refresh-token').send({ refreshToken: session.refreshToken })
    expect(oldRefresh.status).toBe(401)

    const oldLogin = await request(app).post('/api/auth/login').send({ email: 'elsa@school.test', password: TEST_PASSWORD })
    const newLogin = await request(app).post('/api/auth/login').send({ email: 'elsa@school.test', password: 'new-password-1' })
    expect(oldLogin.status).toBe(401)
    expect(newLogin.status).toBe(200)
  })
})
