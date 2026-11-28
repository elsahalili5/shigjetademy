import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { clearPlatformSettingsCache } from '@modules/platform-settings/platform-settings.service.ts'
import { TEST_DATABASE_URL } from '../../../vitest.config.ts'
import { createUser, TEST_PASSWORD } from '../../../test/factories.ts'
import { AuthService } from './auth.service.ts'
import { generateRefreshToken, REFRESH_TOKEN_EXPIRY_MS, REUSE_GRACE_MS, SESSION_MAX_MS } from '@lib/jwt.ts'

const RACING_REFRESHES = 5
const RACE_REPEATS = 4

const readMigrationStatements = (migration: string) =>
  readFileSync(join(import.meta.dirname, `../../../prisma/migrations/${migration}/migration.sql`), 'utf8')
    .replace(/--.*$/gm, '')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean)

// Written out here, not imported, so the tests check the stored format independently of the service
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

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

  describe('maintenance mode', () => {
    const login = (email: string) => request(app).post('/api/auth/login').send({ email, password: TEST_PASSWORD })

    it('refuses a non-admin login with 503 and the maintenance message, and succeeds once maintenance is off', async () => {
      await createUser({ email: 'owner@school.test' })
      await prisma.platformSettings.create({ data: { id: 1, maintenance_mode: true, maintenance_message: 'Down for an upgrade' } })
      clearPlatformSettingsCache()

      const duringMaintenance = await login('owner@school.test')

      expect(duringMaintenance.status).toBe(503)
      expect(duringMaintenance.body.error).toBe('Down for an upgrade')

      await prisma.platformSettings.update({ where: { id: 1 }, data: { maintenance_mode: false } })
      clearPlatformSettingsCache()
      expect((await login('owner@school.test')).status).toBe(200)
    })

    it('lets a platform admin log in during maintenance', async () => {
      await createUser({ email: 'admin@platform.test', isPlatformAdmin: true })
      await prisma.platformSettings.create({ data: { id: 1, maintenance_mode: true } })
      clearPlatformSettingsCache()

      expect((await login('admin@platform.test')).status).toBe(200)
    })
  })

  describe('sessions', () => {
    const HOUR_MS = 60 * 60 * 1000
    const DAY_MS = 24 * HOUR_MS
    const refresh = (refreshToken: string) => AuthService.refreshAccessToken({ refreshToken })
    const findToken = (token: string) => prisma.refreshTokens.findUniqueOrThrow({ where: { token: sha256(token) } })
    const login = async (email: string) => {
      await createUser({ email })
      return AuthService.loginUser({ email, password: TEST_PASSWORD })
    }
    const ageRevocation = async ({ token, ms }: { token: string; ms: number }) => {
      await prisma.refreshTokens.update({ where: { token: sha256(token) }, data: { revoked_at: new Date(Date.now() - ms) } })
    }

    it('keeps the family and session start on rotation and never lets the expiry pass the 30-day cap', async () => {
      const first = await login('owner@school.test')
      const sessionStartedAt = new Date(Date.now() - SESSION_MAX_MS + HOUR_MS)
      await prisma.refreshTokens.update({ where: { token: sha256(first.refreshToken) }, data: { session_started_at: sessionStartedAt } })

      const second = await refresh(first.refreshToken)

      const before = await findToken(first.refreshToken)
      const after = await findToken(second.refreshToken)
      expect(after.family_id).toBe(before.family_id)
      expect(after.session_started_at).toEqual(sessionStartedAt)
      expect(after.expires.getTime()).toBeLessThanOrEqual(sessionStartedAt.getTime() + SESSION_MAX_MS)
      expect(after.expires.getTime()).toBeGreaterThan(Date.now())
      expect(after.expires.getTime()).toBeLessThan(Date.now() + 2 * HOUR_MS)
      const exp = JSON.parse(Buffer.from(second.refreshToken.split('.')[1] ?? '', 'base64url').toString()).exp
      expect(exp * 1000).toBe(after.expires.getTime())
    })

    it('expires a rotated token 7 days out inside the cap', async () => {
      const first = await login('owner@school.test')

      const second = await refresh(first.refreshToken)

      const { expires } = await findToken(second.refreshToken)
      expect(Math.abs(expires.getTime() - (Date.now() + REFRESH_TOKEN_EXPIRY_MS))).toBeLessThan(5000)
    })

    it('refuses a refresh after the 30-day cap with an unexpired token and revokes the family', async () => {
      const first = await login('owner@school.test')
      await prisma.refreshTokens.update({
        where: { token: sha256(first.refreshToken) },
        data: { session_started_at: new Date(Date.now() - SESSION_MAX_MS - HOUR_MS) },
      })

      await expect(refresh(first.refreshToken)).rejects.toMatchObject({ status: 401, message: 'Session expired' })

      const { family_id } = await findToken(first.refreshToken)
      const family = await prisma.refreshTokens.findMany({ where: { family_id } })
      expect(family.every((row) => row.revoked && row.revoked_at)).toBe(true)
    })

    it('revokes the whole family when a token revoked more than 10 seconds ago is reused', async () => {
      const first = await login('owner@school.test')
      const second = await refresh(first.refreshToken)
      await ageRevocation({ token: first.refreshToken, ms: REUSE_GRACE_MS + 1000 })

      await expect(refresh(first.refreshToken)).rejects.toMatchObject({ status: 401 })

      await expect(refresh(second.refreshToken)).rejects.toMatchObject({ status: 401 })
    })

    it('revokes the family when the reused token has no revoked_at', async () => {
      const first = await login('owner@school.test')
      const second = await refresh(first.refreshToken)
      await prisma.refreshTokens.update({ where: { token: sha256(first.refreshToken) }, data: { revoked_at: null } })

      await expect(refresh(first.refreshToken)).rejects.toMatchObject({ status: 401 })

      await expect(refresh(second.refreshToken)).rejects.toMatchObject({ status: 401 })
    })

    it('keeps the family alive when a token is reused within 10 seconds', async () => {
      const first = await login('owner@school.test')
      const second = await refresh(first.refreshToken)

      await expect(refresh(first.refreshToken)).rejects.toMatchObject({ status: 401, message: 'Token revoked' })

      await expect(refresh(second.refreshToken)).resolves.toHaveProperty('refreshToken')
    })

    it('does not extend the grace window when the token is replayed inside it', async () => {
      const first = await login('owner@school.test')
      const second = await refresh(first.refreshToken)
      await ageRevocation({ token: first.refreshToken, ms: REUSE_GRACE_MS - 2000 })
      const { revoked_at } = await findToken(first.refreshToken)

      for (let replay = 0; replay < 5; replay += 1) {
        await expect(refresh(first.refreshToken)).rejects.toMatchObject({ status: 401 })
      }

      expect((await findToken(first.refreshToken)).revoked_at).toEqual(revoked_at)
      await ageRevocation({ token: first.refreshToken, ms: REUSE_GRACE_MS + 1000 })
      await expect(refresh(first.refreshToken)).rejects.toMatchObject({ status: 401 })
      await expect(refresh(second.refreshToken)).rejects.toMatchObject({ status: 401 })
    })

    it('gives one new pair to five parallel refreshes and keeps the family alive', async () => {
      const first = await login('owner@school.test')

      const results = await Promise.allSettled(Array.from({ length: RACING_REFRESHES }, () => refresh(first.refreshToken)))

      const fulfilled = results.filter((result) => result.status === 'fulfilled')
      const rejected = results.filter((result) => result.status === 'rejected')
      expect(fulfilled).toHaveLength(1)
      expect(rejected).toHaveLength(RACING_REFRESHES - 1)
      rejected.forEach((result) => expect(result.reason).toMatchObject({ status: 401 }))
      const winner = fulfilled[0]?.status === 'fulfilled' ? fulfilled[0].value : null
      await expect(refresh(winner?.refreshToken ?? '')).resolves.toHaveProperty('refreshToken')
    })

    it('revokes the whole family on logout', async () => {
      const first = await login('owner@school.test')
      const second = await refresh(first.refreshToken)

      await AuthService.logoutUser({ refreshToken: second.refreshToken })

      const family = await prisma.refreshTokens.findMany({ where: { family_id: (await findToken(second.refreshToken)).family_id } })
      expect(family.every((row) => row.revoked && row.revoked_at)).toBe(true)
      await expect(refresh(second.refreshToken)).rejects.toMatchObject({ status: 401 })
    })

    it('revokes every session on a password change and issues a pair in a new family', async () => {
      const user = await createUser({ email: 'owner@school.test' })
      const phone = await AuthService.loginUser({ email: 'owner@school.test', password: TEST_PASSWORD })
      const laptop = await AuthService.loginUser({ email: 'owner@school.test', password: TEST_PASSWORD })

      const changed = await AuthService.changePassword({
        userId: user.id,
        data: { current_password: TEST_PASSWORD, new_password: 'a-new-password-1' },
      })

      const phoneRow = await findToken(phone.refreshToken)
      const laptopRow = await findToken(laptop.refreshToken)
      const changedRow = await findToken(changed.refreshToken)
      expect(phoneRow.family_id).not.toBe(laptopRow.family_id)
      expect([phoneRow, laptopRow].every((row) => row.revoked && row.revoked_at)).toBe(true)
      expect(changedRow.revoked).toBe(false)
      expect([phoneRow.family_id, laptopRow.family_id]).not.toContain(changedRow.family_id)
      await expect(refresh(changed.refreshToken)).resolves.toHaveProperty('refreshToken')
    })

    it('never touches another user\'s family', async () => {
      const mine = await login('owner@school.test')
      const theirs = await login('other@school.test')
      const second = await refresh(mine.refreshToken)
      await ageRevocation({ token: mine.refreshToken, ms: REUSE_GRACE_MS + 1000 })
      await expect(refresh(mine.refreshToken)).rejects.toMatchObject({ status: 401 })
      await prisma.refreshTokens.update({
        where: { token: sha256(theirs.refreshToken) },
        data: { session_started_at: new Date(Date.now() - DAY_MS) },
      })

      await AuthService.logoutUser({ refreshToken: second.refreshToken })

      const theirRow = await findToken(theirs.refreshToken)
      expect(theirRow.revoked).toBe(false)
      expect(theirRow.revoked_at).toBeNull()
      await expect(refresh(theirs.refreshToken)).resolves.toHaveProperty('refreshToken')
    })

    it('backfills a row from before the change with the migration file and refreshes it', async () => {
      const user = await createUser({ email: 'owner@school.test' })
      const expires = new Date(Math.floor((Date.now() + DAY_MS) / 1000) * 1000)
      const token = generateRefreshToken({ userId: user.id, expires })
      const oldRowId = crypto.randomUUID()
      const created = new Date(Date.now() - 3 * DAY_MS)

      // A temp table named like the real one shadows it on this connection, so the file runs against the old shape
      const client = new pg.Client({ connectionString: TEST_DATABASE_URL })
      await client.connect()
      try {
        await client.query(`CREATE TEMP TABLE "RefreshTokens" (
          id UUID PRIMARY KEY, user_id UUID NOT NULL, token TEXT NOT NULL UNIQUE, expires TIMESTAMP(3) NOT NULL,
          created TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, revoked BOOLEAN NOT NULL DEFAULT false)`)
        await client.query(`INSERT INTO "RefreshTokens" (id, user_id, token, expires, created) VALUES ($1, $2, $3, $4, $5)`, [
          oldRowId,
          user.id,
          sha256(token),
          expires,
          created,
        ])
        for (const statement of readMigrationStatements('20261128100000_refresh_token_families')) {
          await client.query(statement)
        }
        const { rows } = await client.query('SELECT family_id, session_started_at, revoked_at FROM "RefreshTokens"')
        expect(rows).toHaveLength(1)
        expect(rows[0].family_id).toBe(oldRowId)
        expect(rows[0].session_started_at).toEqual(created)
        expect(rows[0].revoked_at).toBeNull()
      } finally {
        await client.end()
      }

      await prisma.refreshTokens.create({
        data: { id: oldRowId, user_id: user.id, token: sha256(token), expires, created, family_id: oldRowId, session_started_at: created },
      })
      const rotated = await refresh(token)
      const rotatedRow = await findToken(rotated.refreshToken)
      expect(rotatedRow.family_id).toBe(oldRowId)
      expect(rotatedRow.session_started_at).toEqual(created)
    })

    it('refuses a token whose expiry is past the 30-day cap and revokes its family', async () => {
      const user = await createUser({ email: 'owner@school.test' })
      const startedAt = new Date(Date.now() - SESSION_MAX_MS - DAY_MS)
      const expires = new Date(Math.floor((startedAt.getTime() + SESSION_MAX_MS + 2 * DAY_MS) / 1000) * 1000)
      const token = generateRefreshToken({ userId: user.id, expires })
      const row = await prisma.refreshTokens.create({
        data: { user_id: user.id, token: sha256(token), expires, session_started_at: startedAt },
      })

      await expect(refresh(token)).rejects.toMatchObject({ status: 401, message: 'Session expired' })

      expect((await prisma.refreshTokens.findUniqueOrThrow({ where: { id: row.id } })).revoked).toBe(true)
      expect(await prisma.refreshTokens.count()).toBe(1)
    })

    it('revokes the live sibling when logout uses a token that was already rotated', async () => {
      const first = await login('owner@school.test')
      const second = await refresh(first.refreshToken)

      await expect(AuthService.logoutUser({ refreshToken: first.refreshToken })).resolves.toEqual({ message: 'Already logged out' })

      expect((await findToken(second.refreshToken)).revoked).toBe(true)
      await expect(refresh(second.refreshToken)).rejects.toMatchObject({ status: 401 })
    })

    it('leaves the old token unrevoked and usable when the insert of the new token fails', async () => {
      const first = await login('owner@school.test')
      const realTransaction = prisma.$transaction.bind(prisma) as (run: (tx: unknown) => Promise<unknown>) => Promise<unknown>
      vi.spyOn(prisma, '$transaction').mockImplementationOnce(((run: (tx: Record<string, unknown>) => Promise<unknown>) =>
        realTransaction((tx) =>
          run(
            new Proxy(tx as Record<string, unknown>, {
              get: (target, property) =>
                property === 'refreshTokens'
                  ? new Proxy(target.refreshTokens as Record<string, unknown>, {
                      get: (model, method) =>
                        method === 'create' ? () => Promise.reject(new Error('insert failed')) : (model[method as string] as (...args: unknown[]) => unknown).bind(model),
                    })
                  : target[property as string],
            }),
          ),
        )) as never)

      await expect(refresh(first.refreshToken)).rejects.toThrow('insert failed')

      expect((await findToken(first.refreshToken)).revoked).toBe(false)
      await expect(refresh(first.refreshToken)).resolves.toHaveProperty('refreshToken')
      vi.restoreAllMocks()
    })

    it.each([
      ['refresh then logout', true],
      ['logout then refresh', false],
    ])('leaves no live row in the family when %s run at the same time', async (_name, isRefreshFirst) => {
      for (let attempt = 0; attempt < RACE_REPEATS; attempt += 1) {
        const session = await login(`owner${attempt}${isRefreshFirst}@school.test`)
        const { family_id, user_id } = await findToken(session.refreshToken)
        const rotate = () => refresh(session.refreshToken).catch(() => null)
        const logout = () => AuthService.logoutUser({ refreshToken: session.refreshToken }).catch(() => null)

        await Promise.all(isRefreshFirst ? [rotate(), logout()] : [logout(), rotate()])

        const live = await prisma.refreshTokens.findMany({ where: { family_id, user_id, revoked: false } })
        expect(live).toHaveLength(0)
      }
    })

    it.each([
      ['refresh before password change', true],
      ['password change before refresh', false],
    ])('leaves no live old session when %s run at the same time', async (_name, isRefreshFirst) => {
      for (let attempt = 0; attempt < RACE_REPEATS; attempt += 1) {
        const email = `owner${attempt}${isRefreshFirst}@school.test`
        const user = await createUser({ email })
        const session = await AuthService.loginUser({ email, password: TEST_PASSWORD })
        const rotate = () => refresh(session.refreshToken).catch(() => null)
        const changePassword = () =>
          AuthService.changePassword({ userId: user.id, data: { current_password: TEST_PASSWORD, new_password: 'a-new-password-1' } })

        const started = isRefreshFirst ? [rotate(), changePassword()] : [changePassword(), rotate()]
        const changed = await (isRefreshFirst ? started[1] : started[0])
        await Promise.all(started)

        // The only live row is the pair the password change itself issued
        const live = await prisma.refreshTokens.findMany({ where: { user_id: user.id, revoked: false } })
        expect(live.map((row) => row.token)).toEqual([sha256(changed?.refreshToken ?? '')])
      }
    })
  })

  describe('hashed refresh tokens', () => {
    const HOUR_MS = 60 * 60 * 1000
    const SHA256_HEX = /^[0-9a-f]{64}$/
    const runMigration = async () => {
      for (const statement of readMigrationStatements('20261128110000_hash_refresh_tokens')) {
        await prisma.$executeRawUnsafe(statement)
      }
    }
    const login = async (email: string) => {
      await createUser({ email })
      return AuthService.loginUser({ email, password: TEST_PASSWORD })
    }
    const seedRow = ({ userId, expires, revoked }: { userId: string; expires: Date; revoked: boolean }) =>
      prisma.refreshTokens.create({ data: { user_id: userId, token: sha256(crypto.randomUUID()), expires, revoked, revoked_at: revoked ? new Date() : null } })
    const exists = async (id: string) => (await prisma.refreshTokens.findUnique({ where: { id } })) !== null

    it('stores a sha256 digest, never the issued token, and the issued token still refreshes and logs out', async () => {
      const session = await login('owner@school.test')

      const rows = await prisma.refreshTokens.findMany()
      expect(rows).toHaveLength(1)
      expect(rows[0]?.token).toBe(sha256(session.refreshToken))
      expect(rows[0]?.token).toMatch(SHA256_HEX)
      expect(rows[0]?.token).not.toBe(session.refreshToken)
      const rotated = await AuthService.refreshAccessToken({ refreshToken: session.refreshToken })
      expect((await prisma.refreshTokens.findMany()).every((row) => SHA256_HEX.test(row.token))).toBe(true)
      await expect(AuthService.logoutUser({ refreshToken: rotated.refreshToken })).resolves.toEqual({ message: 'Logged out successfully' })
    })

    it('refuses the stored digest as a refresh token', async () => {
      const session = await login('owner@school.test')
      const stored = sha256(session.refreshToken)

      const response = await request(app).post('/api/auth/refresh-token').send({ refreshToken: stored })

      expect(response.status).toBe(401)
    })

    it('keeps a session from before the change working after the migration, and a second run changes nothing', async () => {
      const user = await createUser({ email: 'owner@school.test' })
      const expires = new Date(Math.floor((Date.now() + HOUR_MS) / 1000) * 1000)
      const rawToken = generateRefreshToken({ userId: user.id, expires })
      await prisma.refreshTokens.create({ data: { user_id: user.id, token: rawToken, expires } })

      await runMigration()

      const [migrated] = await prisma.refreshTokens.findMany()
      expect(migrated?.token).toBe(sha256(rawToken))
      await runMigration()
      expect((await prisma.refreshTokens.findMany())[0]?.token).toBe(sha256(rawToken))
      const response = await request(app).post('/api/auth/refresh-token').send({ refreshToken: rawToken })
      expect(response.status).toBe(200)
      expect(response.body.data.refreshToken).toEqual(expect.any(String))
      expect(response.body.data.accessToken).toEqual(expect.any(String))
    })

    it('deletes only expired rows on login and keeps a revoked unexpired row for reuse detection', async () => {
      const owner = await login('owner@school.test')
      const other = await login('other@school.test')
      const ownerUser = await prisma.user.findUniqueOrThrow({ where: { email: 'owner@school.test' } })
      const otherUser = await prisma.user.findUniqueOrThrow({ where: { email: 'other@school.test' } })
      const past = new Date(Date.now() - HOUR_MS)
      const future = new Date(Date.now() + HOUR_MS)
      const expiredRevoked = await seedRow({ userId: ownerUser.id, expires: past, revoked: true })
      const expiredActive = await seedRow({ userId: otherUser.id, expires: past, revoked: false })
      const active = await seedRow({ userId: ownerUser.id, expires: future, revoked: false })
      const rotated = await AuthService.refreshAccessToken({ refreshToken: owner.refreshToken })
      await prisma.refreshTokens.update({
        where: { token: sha256(owner.refreshToken) },
        data: { revoked_at: new Date(Date.now() - REUSE_GRACE_MS - 1000), expires: future },
      })

      await AuthService.loginUser({ email: 'owner@school.test', password: TEST_PASSWORD })

      expect(await exists(expiredRevoked.id)).toBe(false)
      expect(await exists(expiredActive.id)).toBe(false)
      expect(await exists(active.id)).toBe(true)
      expect(await prisma.refreshTokens.findUnique({ where: { token: sha256(other.refreshToken) } })).not.toBeNull()
      await expect(AuthService.refreshAccessToken({ refreshToken: owner.refreshToken })).rejects.toMatchObject({ status: 401 })
      await expect(AuthService.refreshAccessToken({ refreshToken: rotated.refreshToken })).rejects.toMatchObject({ status: 401 })
    })

    it('still logs in when the cleanup fails', async () => {
      await createUser({ email: 'owner@school.test' })
      const deleteMany = vi.spyOn(prisma.refreshTokens, 'deleteMany').mockRejectedValueOnce(new Error('db down'))
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

      const session = await AuthService.loginUser({ email: 'owner@school.test', password: TEST_PASSWORD })

      expect(deleteMany).toHaveBeenCalledOnce()
      expect(consoleError).toHaveBeenCalled()
      expect(session.refreshToken).toEqual(expect.any(String))
      deleteMany.mockRestore()
      consoleError.mockRestore()
    })
  })
})
