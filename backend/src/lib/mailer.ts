import nodemailer from 'nodemailer'
import type { MemberRole } from '@shigjetademy/shared/auth'
import { INVITED_ROLE_PHRASES } from '@shigjetademy/shared/invitations'

/** One email as it leaves the app; a transport delivers it */
export type OutgoingEmail = {
  from: { name: string; address: string }
  to: string
  replyTo: string
  subject: string
  text: string
  html: string
}

export type MailTransport = (email: OutgoingEmail) => Promise<void>

const DEFAULT_MAIL_FROM = 'no-reply@shigjetademy.local'

const SENDER_NAME = 'Shigjetademy'

/** Well under a request's patience, so a stuck mail server fails the send instead of hanging it */
const SMTP_TIMEOUT_MS = 10_000

/**
 * SMTP from SMTP_* (Mailpit in development). Without SMTP_HOST, development and tests log the email instead,
 * and production refuses to send, so a link is never printed to production logs.
 */
export const createSmtpTransport = (): MailTransport => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env
  if (!SMTP_HOST) {
    if (process.env.NODE_ENV === 'production') {
      return async () => {
        throw new Error('SMTP_HOST must be set in production')
      }
    }
    return async (email) => {
      console.info(`[mailer] SMTP_HOST is not set, so this email was not sent. To: ${email.to}. Subject: ${email.subject}\n${email.text}`)
    }
  }
  const smtp = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 1025),
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASSWORD ?? '' } : undefined,
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  })
  return async (email) => {
    await smtp.sendMail(email)
  }
}

let transport: MailTransport | null = null

/** Replaces how emails are delivered; tests install a fake that records them */
export const setMailTransport = (next: MailTransport) => {
  transport = next
}

const deliver = (email: OutgoingEmail) => {
  transport ??= createSmtpTransport()
  return transport(email)
}

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as const

const isEscapedCharacter = (character: string): character is keyof typeof HTML_ESCAPES => character in HTML_ESCAPES

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => (isEscapedCharacter(character) ? HTML_ESCAPES[character] : character))

export type InvitationEmail = {
  to: string
  inviterName: string
  inviterEmail: string
  organizationName: string
  role: MemberRole
  expiresAt: Date
  /** The organization's IANA time zone, so the expiry reads as its local day */
  timeZone: string
  link: string
}

export const sendInvitationEmail = ({ to, inviterName, inviterEmail, organizationName, role, expiresAt, timeZone, link }: InvitationEmail) => {
  const expiry = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone }).format(expiresAt)
  const invitedLine = `${inviterName} invited you to join ${organizationName} on Shigjetademy ${INVITED_ROLE_PHRASES[role]}.`
  const expiryLine = `This invitation works until ${expiry}.`
  const text = [invitedLine, '', `Accept the invitation: ${link}`, '', expiryLine, 'If you weren’t expecting it, you can ignore this email.'].join('\n')
  const html = `<!doctype html>
<html lang="en">
  <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937">
    <p>${escapeHtml(invitedLine)}</p>
    <p><a href="${escapeHtml(link)}" style="display: inline-block; padding: 12px 20px; background: #1f2937; color: #ffffff; text-decoration: none; border-radius: 6px">Accept invitation</a></p>
    <p>Or open this link: <a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>
    <p>${escapeHtml(expiryLine)} If you weren’t expecting it, you can ignore this email.</p>
  </body>
</html>`
  return deliver({
    from: { name: `${inviterName} via ${SENDER_NAME}`, address: process.env.MAIL_FROM || DEFAULT_MAIL_FROM },
    to,
    replyTo: inviterEmail,
    subject: `You’re invited to join ${organizationName}`,
    text,
    html,
  })
}
