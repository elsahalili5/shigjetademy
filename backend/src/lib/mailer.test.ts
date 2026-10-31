import { afterEach, describe, expect, it, vi } from 'vitest'
import { sentEmails } from '../../test/fake-mailer.ts'
import { createSmtpTransport, sendInvitationEmail } from './mailer.ts'

const invitation = {
  to: 'arta@student.test',
  inviterName: 'Drita Krasniqi',
  inviterEmail: 'drita@oxford.test',
  organizationName: 'Oxford <Academy>',
  role: 'STUDENT',
  expiresAt: new Date('2026-11-07T12:00:00.000Z'),
  timeZone: 'Europe/Belgrade',
  link: 'http://localhost:5173/invite/abc123',
} as const

describe('sendInvitationEmail', () => {
  it('sends from the inviter via Shigjetademy, with replies going to the inviter', async () => {
    await sendInvitationEmail(invitation)

    expect(sentEmails()).toHaveLength(1)
    expect(sentEmails()[0]).toMatchObject({
      to: 'arta@student.test',
      from: { name: 'Drita Krasniqi via Shigjetademy', address: 'invitations@shigjetademy.test' },
      replyTo: 'drita@oxford.test',
      subject: 'You’re invited to join Oxford <Academy>',
    })
  })

  it('carries the link, role and expiry in text and escaped HTML', async () => {
    await sendInvitationEmail(invitation)
    const [email] = sentEmails()

    expect(email?.text).toContain('http://localhost:5173/invite/abc123')
    expect(email?.text).toContain('as a student')
    expect(email?.text).toContain('7 November 2026')
    expect(email?.html).toContain('href="http://localhost:5173/invite/abc123"')
    expect(email?.html).toContain('Oxford &lt;Academy&gt;')
    expect(email?.html).not.toContain('Oxford <Academy>')
  })
})

describe('the SMTP transport without SMTP_HOST', () => {
  const email = { from: { name: 'Drita via Shigjetademy', address: 'a@b.test' }, to: 'arta@student.test', replyTo: 'drita@oxford.test', subject: 'Hi', text: 'secret link', html: '' }

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('logs the email in development instead of sending it', async () => {
    vi.stubEnv('SMTP_HOST', '')
    const log = vi.spyOn(console, 'info').mockImplementation(() => undefined)

    await createSmtpTransport()(email)

    expect(log).toHaveBeenCalledWith(expect.stringContaining('secret link'))
  })

  it('refuses to send in production, and never logs the link', async () => {
    vi.stubEnv('SMTP_HOST', '')
    vi.stubEnv('NODE_ENV', 'production')
    const log = vi.spyOn(console, 'info').mockImplementation(() => undefined)

    await expect(createSmtpTransport()(email)).rejects.toThrow('SMTP_HOST must be set in production')
    expect(log).not.toHaveBeenCalled()
  })
})
