import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { failSends, lastInviteToken, sentEmails } from '../../../test/fake-mailer.ts'
import { createOrganization, createUser, loginAs, TEST_PASSWORD } from '../../../test/factories.ts'

let organizationId: string
let invitationsPath: string
let ownerAuth: string

const ADMIN_INVITE = { email: 'New.Admin@Oxford.test', permissions: ['MANAGE_STUDENTS', 'VIEW_REPORTS'] }

const inviteAdmin = (body: object = ADMIN_INVITE, auth = ownerAuth) => request(app).post(invitationsPath).set('Authorization', auth).send(body)

const preview = (token: string) => request(app).get(`/api/invitations/${token}`)

const accept = (token: string, auth: string) => request(app).post(`/api/invitations/${token}/accept`).set('Authorization', auth)

const register = async (email: string) => {
  const response = await request(app).post('/api/auth/register').send({ first_name: 'Blerta', last_name: 'Hoxha', email, password: TEST_PASSWORD })
  return `Bearer ${response.body.data.accessToken}`
}

const actionsLogged = async () => (await prisma.activityLog.findMany({ where: { organization_id: organizationId }, orderBy: { created_at: 'asc' } })).map(({ action, subject_name }) => ({ action, subject_name }))

beforeEach(async () => {
  const owner = await prisma.user.update({ where: { id: (await createUser({ email: 'owner@oxford.test' })).id }, data: { first_name: 'Drita', last_name: 'Krasniqi' } })
  const admin = await createUser({ email: 'admin@oxford.test' })
  await createUser({ email: 'owner@yllka.test' })
  organizationId = (
    await createOrganization({
      name: 'Oxford Academy',
      ownerId: owner.id,
      members: [{ userId: admin.id, role: 'ADMIN', permissions: ['MANAGE_STUDENTS', 'MANAGE_LECTURERS'] }],
    })
  ).id
  await createOrganization({ name: 'Yllka Kindergarten', ownerId: (await prisma.user.findUniqueOrThrow({ where: { email: 'owner@yllka.test' } })).id })
  invitationsPath = `/api/organizations/${organizationId}/invitations`
  ownerAuth = await loginAs('owner@oxford.test')
})

describe('sending an invitation', () => {
  it('emails a 7-day link from the inviter, replying to them, and stores only a hash of the token', async () => {
    const response = await inviteAdmin()
    const token = lastInviteToken()
    const stored = await prisma.invitation.findFirstOrThrow({ where: { organization_id: organizationId } })

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({ email: 'new.admin@oxford.test', role: 'ADMIN', permissions: ['MANAGE_STUDENTS', 'VIEW_REPORTS'] })
    expect(response.body.data).not.toHaveProperty('token_hash')
    expect(response.body.data).not.toHaveProperty('link')
    expect(sentEmails()[0]?.text).toContain(`http://localhost:5173/invite/${token}`)
    expect(sentEmails()[0]).toMatchObject({ to: 'new.admin@oxford.test', from: { name: 'Drita Krasniqi via Shigjetademy' }, replyTo: 'owner@oxford.test', subject: 'You’re invited to join Oxford Academy' })
    expect(stored.token_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(stored)).not.toContain(token)
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    expect(Math.abs(stored.expires_at.getTime() - Date.now() - sevenDays)).toBeLessThan(60_000)
  })
})

describe('who may invite a school admin', () => {
  it('refuses everyone but the owner, and other organizations', async () => {
    const { id } = (await inviteAdmin()).body.data
    const calls = [
      (auth: string) => inviteAdmin({ ...ADMIN_INVITE, email: 'other@oxford.test' }, auth),
      (auth: string) => request(app).post(`${invitationsPath}/${id}/resend`).set('Authorization', auth),
      (auth: string) => request(app).post(`${invitationsPath}/${id}/link`).set('Authorization', auth),
      (auth: string) => request(app).delete(`${invitationsPath}/${id}`).set('Authorization', auth),
    ]

    for (const email of ['admin@oxford.test', 'owner@yllka.test']) {
      const auth = await loginAs(email)
      for (const call of calls) {
        expect((await call(auth)).status, email).toBe(403)
      }
    }
    expect(sentEmails()).toHaveLength(1)
  })

  it('never invites an owner: the role is always school admin', async () => {
    const response = await inviteAdmin({ ...ADMIN_INVITE, role: 'OWNER' })

    expect(response.body.data.role).toBe('ADMIN')
  })
})

describe('reading an invitation link', () => {
  it('shows anyone with the link the organization, role, inviter and email', async () => {
    await inviteAdmin()

    const response = await preview(lastInviteToken())

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      email: 'new.admin@oxford.test',
      role: 'ADMIN',
      organization: { id: organizationId, name: 'Oxford Academy' },
      invited_by: { first_name: 'Drita', last_name: 'Krasniqi' },
    })
  })

  it('refuses a link that matches no invitation', async () => {
    const response = await preview('not-a-real-token')

    expect(response.status).toBe(404)
  })

  it('refuses an expired link and marks the invitation expired', async () => {
    await inviteAdmin()
    await prisma.invitation.updateMany({ data: { expires_at: new Date(Date.now() - 1000) } })

    const response = await preview(lastInviteToken())

    expect(response.status).toBe(410)
    expect(response.body.error).toBe('This invitation has expired. Ask for a new one.')
    expect((await prisma.invitation.findFirstOrThrow()).status).toBe('EXPIRED')
  })
})

describe('resending and revoking', () => {
  it('resending emails a new link, and the old link stops working', async () => {
    const { id } = (await inviteAdmin()).body.data
    const oldToken = lastInviteToken()

    const resent = await request(app).post(`${invitationsPath}/${id}/resend`).set('Authorization', ownerAuth)
    const newToken = lastInviteToken()

    expect(resent.status).toBe(200)
    expect(resent.body.data).not.toHaveProperty('link')
    expect(sentEmails()).toHaveLength(2)
    expect(newToken).not.toBe(oldToken)
    expect((await preview(oldToken)).status).toBe(404)
    expect((await preview(newToken)).status).toBe(200)
  })

  it('gives the owner a fresh link to copy, which is also emailed, and kills the old one', async () => {
    const { id } = (await inviteAdmin()).body.data
    const oldToken = lastInviteToken()

    const renewed = await request(app).post(`${invitationsPath}/${id}/link`).set('Authorization', ownerAuth)

    expect(renewed.status).toBe(200)
    expect(renewed.body.data.link).toBe(`http://localhost:5173/invite/${lastInviteToken()}`)
    expect((await preview(oldToken)).status).toBe(404)
  })

  it('revoking refuses the link from then on', async () => {
    const { id } = (await inviteAdmin()).body.data

    const revoked = await request(app).delete(`${invitationsPath}/${id}`).set('Authorization', ownerAuth)
    const read = await preview(lastInviteToken())

    expect(revoked.status).toBe(204)
    expect(read.status).toBe(410)
    expect(read.body.error).toBe('This invitation was withdrawn.')
    expect((await prisma.invitation.findFirstOrThrow()).revoked_at).not.toBeNull()
  })

  it('logs sending, resending and revoking with the invited email', async () => {
    const { id } = (await inviteAdmin()).body.data
    await request(app).post(`${invitationsPath}/${id}/resend`).set('Authorization', ownerAuth)
    await request(app).delete(`${invitationsPath}/${id}`).set('Authorization', ownerAuth)

    expect(await actionsLogged()).toEqual([
      { action: 'INVITATION_SENT', subject_name: 'new.admin@oxford.test' },
      { action: 'INVITATION_RESENT', subject_name: 'new.admin@oxford.test' },
      { action: 'INVITATION_REVOKED', subject_name: 'new.admin@oxford.test' },
    ])
  })

  it('refuses a second pending invitation for the same email', async () => {
    await inviteAdmin()

    const second = await inviteAdmin({ ...ADMIN_INVITE, email: 'new.admin@oxford.test' })

    expect(second.status).toBe(409)
    expect(second.body.details.fieldErrors.email).toEqual(['There’s already a pending invitation for this email.'])
  })

  it('refuses inviting someone who is already a member', async () => {
    const response = await inviteAdmin({ ...ADMIN_INVITE, email: 'admin@oxford.test' })

    expect(response.status).toBe(409)
    expect(sentEmails()).toHaveLength(0)
  })

  it('answers 429 once the organization has sent 50 invitations in the last hour', async () => {
    await prisma.activityLog.createMany({ data: Array.from({ length: 50 }, () => ({ action: 'INVITATION_SENT' as const, organization_id: organizationId })) })

    const response = await inviteAdmin()

    expect(response.status).toBe(429)
    expect(sentEmails()).toHaveLength(0)
  })
})

describe('when the email can’t be sent', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('answers 502 and keeps no invitation or log entry after a failed first send', async () => {
    failSends()

    const response = await inviteAdmin()

    expect(response.status).toBe(502)
    expect(await prisma.invitation.count()).toBe(0)
    expect(await actionsLogged()).toEqual([])
  })

  it('answers 502 after a failed resend, with the old link already dead and the invitation still pending to resend', async () => {
    const { id } = (await inviteAdmin()).body.data
    const oldToken = lastInviteToken()
    failSends()

    const response = await request(app).post(`${invitationsPath}/${id}/resend`).set('Authorization', ownerAuth)

    expect(response.status).toBe(502)
    expect((await preview(oldToken)).status).toBe(404)
    expect((await prisma.invitation.findFirstOrThrow()).status).toBe('PENDING')
  })

  it('refuses to send in production without APP_URL, before anything is stored', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('APP_URL', '')

    const response = await inviteAdmin()

    expect(response.status).toBe(500)
    expect(await prisma.invitation.count()).toBe(0)
    expect(sentEmails()).toHaveLength(0)
  })
})

describe('accepting an invitation', () => {
  it('asks for a login first', async () => {
    await inviteAdmin()

    const response = await request(app).post(`/api/invitations/${lastInviteToken()}/accept`)

    expect(response.status).toBe(401)
  })

  it('lets a brand-new admin register and accept, with exactly the permissions chosen', async () => {
    await inviteAdmin()
    const token = lastInviteToken()
    const auth = await register('new.admin@oxford.test')

    const accepted = await accept(token, auth)
    const me = await request(app).get('/api/auth/me').set('Authorization', auth)

    expect(accepted.status).toBe(200)
    expect(accepted.body.data).toEqual({ organization_id: organizationId })
    expect(me.body.data.memberships).toEqual([expect.objectContaining({ role: 'ADMIN', permissions: ['MANAGE_STUDENTS', 'VIEW_REPORTS'], organization: expect.objectContaining({ id: organizationId }) })])
    expect((await prisma.invitation.findFirstOrThrow()).status).toBe('ACCEPTED')
    expect((await actionsLogged()).at(-1)).toEqual({ action: 'INVITATION_ACCEPTED', subject_name: 'new.admin@oxford.test' })
  })

  it('refuses an account with another email, whatever the letter case of the invited one', async () => {
    await inviteAdmin()
    const token = lastInviteToken()

    const wrong = await accept(token, await loginAs('owner@yllka.test'))
    const right = await accept(token, await register('NEW.ADMIN@oxford.test'))

    expect(wrong.status).toBe(403)
    expect(wrong.body.error).toBe('This invitation is for new.admin@oxford.test. Log in with that email to accept it.')
    expect(right.status).toBe(200)
  })

  it('refuses the old link after a resend', async () => {
    const { id } = (await inviteAdmin()).body.data
    const oldToken = lastInviteToken()
    await request(app).post(`${invitationsPath}/${id}/resend`).set('Authorization', ownerAuth)

    const response = await accept(oldToken, await register('new.admin@oxford.test'))

    expect(response.status).toBe(404)
    expect(await prisma.membership.count({ where: { user: { email: 'new.admin@oxford.test' } } })).toBe(0)
  })

  it('works once: a second accept, a revoked link and an expired link are refused', async () => {
    const { id } = (await inviteAdmin()).body.data
    const auth = await register('new.admin@oxford.test')
    await accept(lastInviteToken(), auth)
    const again = await accept(lastInviteToken(), auth)

    await inviteAdmin({ ...ADMIN_INVITE, email: 'second@oxford.test' })
    const revokedToken = lastInviteToken()
    const second = await prisma.invitation.findFirstOrThrow({ where: { email: 'second@oxford.test' } })
    await request(app).delete(`${invitationsPath}/${second.id}`).set('Authorization', ownerAuth)
    await inviteAdmin({ ...ADMIN_INVITE, email: 'third@oxford.test' })
    const expiredToken = lastInviteToken()
    await prisma.invitation.updateMany({ where: { email: 'third@oxford.test' }, data: { expires_at: new Date(Date.now() - 1000) } })

    expect(id).toBeTruthy()
    expect(again.status).toBe(410)
    expect((await accept(revokedToken, await register('second@oxford.test'))).status).toBe(410)
    expect((await accept(expiredToken, await register('third@oxford.test'))).status).toBe(410)
    expect(await prisma.membership.count({ where: { organization_id: organizationId } })).toBe(3)
  })
})
