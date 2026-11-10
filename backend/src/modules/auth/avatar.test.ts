import { existsSync } from 'node:fs'
import path from 'node:path'
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { AVATAR_DIR, AVATAR_URL_PREFIX } from '@lib/avatar-storage.ts'
import { app } from '../../app.ts'
import { createUser, TEST_PASSWORD } from '../../../test/factories.ts'

let session: { accessToken: string; refreshToken: string }

beforeEach(async () => {
  await createUser({ email: 'avatar@school.test' })
  const login = await request(app).post('/api/auth/login').send({ email: 'avatar@school.test', password: TEST_PASSWORD })
  session = login.body.data
})

const authHeader = () => `Bearer ${session.accessToken}`

const pathForAvatarUrl = (avatarUrl: string) => path.join(AVATAR_DIR, avatarUrl.replace(`${AVATAR_URL_PREFIX}/`, ''))

const uploadAvatar = (buffer: Buffer, options: { filename: string; contentType: string }) =>
  request(app).post('/api/auth/avatar').set('Authorization', authHeader()).attach('avatar', buffer, options)

describe('POST /api/auth/avatar', () => {
  it('stores the image and returns its url', async () => {
    const response = await uploadAvatar(Buffer.from('fake-image-bytes'), { filename: 'avatar.png', contentType: 'image/png' })

    expect(response.status).toBe(200)
    expect(response.body.data.avatar_url).toMatch(new RegExp(`^${AVATAR_URL_PREFIX}/`))
    expect(existsSync(pathForAvatarUrl(response.body.data.avatar_url))).toBe(true)
  })

  it('rejects a file that is not an allowed image type', async () => {
    const response = await uploadAvatar(Buffer.from('not an image'), { filename: 'file.txt', contentType: 'text/plain' })

    expect(response.status).toBe(400)
  })

  it('rejects a file over 2MB', async () => {
    const response = await uploadAvatar(Buffer.alloc(2 * 1024 * 1024 + 1), { filename: 'big.png', contentType: 'image/png' })

    expect(response.status).toBe(400)
  })

  it('requires authentication', async () => {
    const response = await request(app)
      .post('/api/auth/avatar')
      .attach('avatar', Buffer.from('fake-image-bytes'), { filename: 'avatar.png', contentType: 'image/png' })

    expect(response.status).toBe(401)
  })

  it('removes the previous avatar file when replacing it', async () => {
    const first = await uploadAvatar(Buffer.from('one'), { filename: 'a.png', contentType: 'image/png' })
    const firstPath = pathForAvatarUrl(first.body.data.avatar_url)
    expect(existsSync(firstPath)).toBe(true)

    const second = await uploadAvatar(Buffer.from('two'), { filename: 'b.png', contentType: 'image/png' })

    expect(existsSync(firstPath)).toBe(false)
    expect(existsSync(pathForAvatarUrl(second.body.data.avatar_url))).toBe(true)
  })
})

describe('DELETE /api/auth/avatar', () => {
  it('clears the avatar field and deletes the stored file', async () => {
    const upload = await uploadAvatar(Buffer.from('fake-image-bytes'), { filename: 'avatar.png', contentType: 'image/png' })
    const filePath = pathForAvatarUrl(upload.body.data.avatar_url)

    const response = await request(app).delete('/api/auth/avatar').set('Authorization', authHeader())

    expect(response.status).toBe(200)
    expect(response.body.data.avatar_url).toBeNull()
    expect(existsSync(filePath)).toBe(false)
  })

  it('requires authentication', async () => {
    const response = await request(app).delete('/api/auth/avatar')
    expect(response.status).toBe(401)
  })
})
