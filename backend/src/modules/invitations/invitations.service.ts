import { createHash, randomBytes } from 'node:crypto'
import type { Prisma } from '@generated/prisma/client.ts'
import type { InvitationStatus, MemberRole, Permission } from '@generated/prisma/enums.ts'
import { INVITATION_VALID_DAYS } from '@shigjetademy/shared/invitations'
import { resolveOrganizationSettings } from '@shigjetademy/shared/organization-settings'
import { HttpError } from '@lib/httpError.ts'
import { sendInvitationEmail } from '@lib/mailer.ts'
import { lockOrganization } from '@lib/organization-lock.ts'
import type { OrganizationScope } from '@lib/organization-lock.ts'
import { prisma } from '@lib/prisma.ts'

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
/** Invitations (sent or resent) one organization may email per hour */
const SEND_LIMIT_PER_HOUR = 50
const DEVELOPMENT_APP_URL = 'http://localhost:5173'

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

/** A fresh link secret, its hash for the database and its expiry; the raw token only ever goes into the email and the response */
const newToken = () => {
  const token = randomBytes(32).toString('base64url')
  return { token, token_hash: hashToken(token), expires_at: new Date(Date.now() + INVITATION_VALID_DAYS * DAY_MS) }
}

/** Where links point; production must set APP_URL, so a link never points at localhost there */
const appUrl = () => {
  const configured = process.env.APP_URL?.trim()
  if (configured) return configured.replace(/\/+$/, '')
  if (process.env.NODE_ENV === 'production') {
    throw new Error('APP_URL must be set in production')
  }
  return DEVELOPMENT_APP_URL
}

const inviteLink = (token: string) => `${appUrl()}/invite/${token}`

const sentInvitationSelect = {
  id: true,
  email: true,
  role: true,
  permissions: true,
  created_at: true,
  expires_at: true,
} as const satisfies Prisma.InvitationSelect

type Transaction = Prisma.TransactionClient

const SEND_ACTIONS = ['INVITATION_SENT', 'INVITATION_RESENT'] as const

const refuseOverSendLimit = async ({ tx, organizationId }: OrganizationScope) => {
  const sentLastHour = await tx.activityLog.count({
    where: { organization_id: organizationId, action: { in: [...SEND_ACTIONS] }, created_at: { gt: new Date(Date.now() - HOUR_MS) } },
  })
  if (sentLastHour >= SEND_LIMIT_PER_HOUR) {
    throw new HttpError(429, 'This organization has sent a lot of invitations in the last hour. Try again later.')
  }
}

/** Marks open invitations whose time ran out as EXPIRED, so they stop counting as pending */
const expireStale = ({ tx, organizationId }: OrganizationScope) =>
  tx.invitation.updateMany({ where: { organization_id: organizationId, status: 'PENDING', expires_at: { lte: new Date() } }, data: { status: 'EXPIRED' } })

type EmailInvitationParams = {
  invitationId: string
  token: string
  actorId: string
}

const SEND_FAILED_MESSAGE = 'We couldn’t send the email. Try again in a moment.'

/** Emails the link once the transaction has committed, so no mail server call holds the organization's lock; false when sending failed */
const emailInvitation = async ({ invitationId, token, actorId }: EmailInvitationParams) => {
  const invitation = await prisma.invitation.findUniqueOrThrow({
    where: { id: invitationId },
    select: { email: true, role: true, expires_at: true, organization: { select: { name: true, country: true, settings: { select: { time_zone: true, week_start: true, date_format: true } } } } },
  })
  const inviter = await prisma.user.findUniqueOrThrow({ where: { id: actorId }, select: { first_name: true, last_name: true, email: true } })
  const { time_zone } = resolveOrganizationSettings({ stored: invitation.organization.settings, country: invitation.organization.country })
  try {
    await sendInvitationEmail({
      to: invitation.email,
      inviterName: `${inviter.first_name} ${inviter.last_name}`,
      inviterEmail: inviter.email,
      organizationName: invitation.organization.name,
      role: invitation.role,
      expiresAt: invitation.expires_at,
      timeZone: time_zone,
      link: inviteLink(token),
    })
    return true
  } catch (error) {
    console.error('Failed to send an invitation email', { invitationId, error })
    return false
  }
}

/** Who an invitation lets in: a school admin with chosen permissions, or the login for one existing student record */
export type InvitationTarget = { role: 'ADMIN'; permissions: Permission[] } | { role: 'STUDENT'; studentId: string }

type CreateInvitationParams = {
  organizationId: string
  actorId: string
  email: string
  target: InvitationTarget
}

const emailTaken = (message: string) => new HttpError(409, message, { fieldErrors: { email: [message] } })

type RefuseTargetParams = OrganizationScope & {
  email: string
  target: InvitationTarget
}

const refuseUninvitable = async ({ tx, organizationId, email, target }: RefuseTargetParams) => {
  switch (target.role) {
    case 'ADMIN': {
      const member = await tx.membership.findFirst({ where: { organization_id: organizationId, status: 'ACTIVE', user: { email } }, select: { id: true } })
      if (member) {
        throw emailTaken('This person is already a member of your organization.')
      }
      return
    }
    case 'STUDENT': {
      const student = await tx.student.findFirst({ where: { id: target.studentId, organization_id: organizationId }, select: { status: true, user_id: true } })
      if (!student) {
        throw new HttpError(404, 'Student not found')
      }
      if (student.user_id) {
        throw new HttpError(409, 'This student already has a login.')
      }
      if (student.status === 'ARCHIVED') {
        throw new HttpError(409, 'Restore this student before inviting them.')
      }
      const staff = await tx.membership.findFirst({ where: { organization_id: organizationId, status: 'ACTIVE', role: { not: 'STUDENT' }, user: { email } }, select: { id: true } })
      if (staff) {
        throw emailTaken('This email belongs to someone who already works in your organization.')
      }
      const pending = await tx.invitation.findFirst({ where: { student_id: target.studentId, status: 'PENDING' }, select: { id: true } })
      if (pending) {
        throw new HttpError(409, 'This student already has a pending invitation.')
      }
      return
    }
    default: {
      const unhandled: never = target
      throw new Error(`Unhandled invitation target: ${JSON.stringify(unhandled)}`)
    }
  }
}

const targetData = (target: InvitationTarget) => {
  switch (target.role) {
    case 'ADMIN':
      return { role: target.role, permissions: target.permissions, student_id: null }
    case 'STUDENT':
      return { role: target.role, permissions: [], student_id: target.studentId }
    default: {
      const unhandled: never = target
      throw new Error(`Unhandled invitation target: ${JSON.stringify(unhandled)}`)
    }
  }
}

const UNUSABLE_MESSAGES = {
  ACCEPTED: 'This invitation has already been accepted.',
  EXPIRED: 'This invitation has expired. Ask for a new one.',
  REVOKED: 'This invitation was withdrawn.',
} as const satisfies Record<Exclude<InvitationStatus, 'PENDING'>, string>

const INVALID_LINK_MESSAGE = 'This invitation link isn’t valid. Check the link, or ask for a new one.'

type StoredStatus = {
  status: InvitationStatus
  expires_at: Date
}

/** The status as of now: a pending invitation past its expiry reads as EXPIRED */
const currentStatus = ({ status, expires_at }: StoredStatus): InvitationStatus => (status === 'PENDING' && expires_at <= new Date() ? 'EXPIRED' : status)

const refuseUnusable = (status: InvitationStatus) => {
  if (status !== 'PENDING') {
    throw new HttpError(410, UNUSABLE_MESSAGES[status])
  }
}

/** The pending invitation, past its expiry or not, so it can be renewed or withdrawn; 404 when there is none */
const findPending = async ({ tx, where }: { tx: Transaction; where: Prisma.InvitationWhereInput }) => {
  const invitation = await tx.invitation.findFirst({ where: { ...where, status: 'PENDING' }, select: { id: true, organization_id: true, email: true } })
  if (!invitation) {
    throw new HttpError(404, 'There’s no pending invitation to change.')
  }
  return invitation
}

type InvitationChangeParams = {
  organizationId: string
  actorId: string
  /** Which of the organization's invitations: an admin invitation by id, or a student's by the student */
  match: { invitationId: string } | { studentId: string }
}

const matchWhere = ({ organizationId, match }: Pick<InvitationChangeParams, 'organizationId' | 'match'>): Prisma.InvitationWhereInput =>
  'invitationId' in match ? { id: match.invitationId, organization_id: organizationId, student_id: null } : { student_id: match.studentId, organization_id: organizationId }

type JoinOrganizationParams = OrganizationScope & {
  userId: string
  role: MemberRole
  permissions: Permission[]
}

/** Gives the user a membership; a removed one comes back with the new role, and an active member keeps theirs, so accepting never duplicates or downgrades */
const joinOrganization = async ({ tx, organizationId, userId, role, permissions }: JoinOrganizationParams) => {
  const membership = await tx.membership.findUnique({ where: { user_id_organization_id: { user_id: userId, organization_id: organizationId } }, select: { id: true, status: true } })
  if (!membership) {
    await tx.membership.create({ data: { user_id: userId, organization_id: organizationId, role, permissions } })
    return
  }
  if (membership.status === 'REMOVED') {
    await tx.membership.update({ where: { id: membership.id }, data: { status: 'ACTIVE', role, permissions } })
  }
}

type LinkStudentParams = OrganizationScope & {
  studentId: string
  userId: string
  organizationName: string
}

/** Puts the login on the existing record; the record, its number and history stay as they are */
const linkStudent = async ({ tx, organizationId, studentId, userId, organizationName }: LinkStudentParams) => {
  const student = await tx.student.findFirst({ where: { id: studentId, organization_id: organizationId }, select: { status: true } })
  if (student?.status === 'ARCHIVED') {
    throw new HttpError(409, 'This student record is archived. Ask your school to restore it first.')
  }
  const linkedElsewhere = await tx.student.findFirst({ where: { organization_id: organizationId, user_id: userId, id: { not: studentId } }, select: { id: true } })
  if (linkedElsewhere) {
    throw new HttpError(409, `Your account is already linked to another student at ${organizationName}.`)
  }
  // Guarded on a missing login, so a record never gets a second one
  const { count } = await tx.student.updateMany({ where: { id: studentId, organization_id: organizationId, user_id: null }, data: { user_id: userId } })
  if (count === 0) {
    throw new HttpError(409, 'This student already has a login.')
  }
}

type AcceptInvitationParams = {
  token: string
  user: { id: string; email: string }
}

export const InvitationService = {
  // Commits first, then emails: a failed send removes the new invitation and its log entry, as if it was never sent
  createInvitation: async ({ organizationId, actorId, email, target }: CreateInvitationParams) => {
    appUrl()
    const { invitation, token, activityId } = await prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      await refuseOverSendLimit({ tx, organizationId })
      await expireStale({ tx, organizationId })
      await refuseUninvitable({ tx, organizationId, email, target })
      const pendingForEmail = await tx.invitation.findFirst({ where: { organization_id: organizationId, email, status: 'PENDING' }, select: { id: true } })
      if (pendingForEmail) {
        throw emailTaken('There’s already a pending invitation for this email.')
      }
      const fresh = newToken()
      const created = await tx.invitation.create({
        data: { organization_id: organizationId, email, invited_by_id: actorId, token_hash: fresh.token_hash, expires_at: fresh.expires_at, ...targetData(target) },
        select: sentInvitationSelect,
      })
      const activity = await tx.activityLog.create({ data: { actor_id: actorId, action: 'INVITATION_SENT', organization_id: organizationId, subject_name: email }, select: { id: true } })
      return { invitation: created, token: fresh.token, activityId: activity.id }
    })
    if (!(await emailInvitation({ invitationId: invitation.id, token, actorId }))) {
      await prisma.$transaction([prisma.invitation.delete({ where: { id: invitation.id } }), prisma.activityLog.delete({ where: { id: activityId } })])
      throw new HttpError(502, SEND_FAILED_MESSAGE)
    }
    return invitation
  },

  /** A new link replaces the old one, which stops working at once; the email goes out after the commit. Returns the link for the owner's Copy link only. */
  resendInvitation: async ({ organizationId, actorId, match }: InvitationChangeParams) => {
    appUrl()
    const { invitation, token } = await prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      await refuseOverSendLimit({ tx, organizationId })
      const { id, email } = await findPending({ tx, where: matchWhere({ organizationId, match }) })
      const fresh = newToken()
      const updated = await tx.invitation.update({ where: { id }, data: { token_hash: fresh.token_hash, expires_at: fresh.expires_at }, select: sentInvitationSelect })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'INVITATION_RESENT', organization_id: organizationId, subject_name: email } })
      return { invitation: updated, token: fresh.token }
    })
    // The old link is already dead; the owner resends to try the email again
    if (!(await emailInvitation({ invitationId: invitation.id, token, actorId }))) {
      throw new HttpError(502, SEND_FAILED_MESSAGE)
    }
    return { invitation, link: inviteLink(token) }
  },

  revokeInvitation: ({ organizationId, actorId, match }: InvitationChangeParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      const { id, email } = await findPending({ tx, where: matchWhere({ organizationId, match }) })
      await tx.invitation.update({ where: { id }, data: { status: 'REVOKED', revoked_at: new Date() } })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'INVITATION_REVOKED', organization_id: organizationId, subject_name: email } })
    }),

  previewInvitation: async (token: string) => {
    const invitation = await prisma.invitation.findUnique({
      where: { token_hash: hashToken(token) },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expires_at: true,
        organization: { select: { id: true, name: true, status: true } },
        invited_by: { select: { first_name: true, last_name: true } },
      },
    })
    if (!invitation) {
      throw new HttpError(404, INVALID_LINK_MESSAGE)
    }
    const status = currentStatus(invitation)
    if (status !== invitation.status) {
      await prisma.invitation.updateMany({ where: { id: invitation.id, status: 'PENDING' }, data: { status } })
    }
    refuseUnusable(status)
    if (invitation.organization.status !== 'ACTIVE') {
      throw new HttpError(410, `${invitation.organization.name} isn’t taking new members right now.`)
    }
    return {
      email: invitation.email,
      role: invitation.role,
      organization: { id: invitation.organization.id, name: invitation.organization.name },
      invited_by: invitation.invited_by,
      expires_at: invitation.expires_at,
    }
  },

  acceptInvitation: ({ token, user }: AcceptInvitationParams) =>
    prisma.$transaction(async (tx) => {
      const found = await tx.invitation.findUnique({ where: { token_hash: hashToken(token) }, select: { id: true, organization_id: true } })
      if (!found) {
        throw new HttpError(404, INVALID_LINK_MESSAGE)
      }
      const organizationId = found.organization_id
      await lockOrganization({ tx, organizationId })
      // Read again under the lock, so two accepts at once can't both pass, and a resend in between (new hash) kills this link
      const invitation = await tx.invitation.findFirst({
        where: { id: found.id, token_hash: hashToken(token) },
        select: { id: true, email: true, role: true, permissions: true, status: true, expires_at: true, student_id: true, organization: { select: { name: true, status: true } } },
      })
      if (!invitation) {
        throw new HttpError(404, INVALID_LINK_MESSAGE)
      }
      refuseUnusable(currentStatus(invitation))
      if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
        throw new HttpError(403, `This invitation is for ${invitation.email}. Log in with that email to accept it.`)
      }
      if (invitation.organization.status !== 'ACTIVE') {
        throw new HttpError(410, `${invitation.organization.name} isn’t taking new members right now.`)
      }
      if (invitation.student_id) {
        await linkStudent({ tx, organizationId, studentId: invitation.student_id, userId: user.id, organizationName: invitation.organization.name })
      }
      await joinOrganization({ tx, organizationId, userId: user.id, role: invitation.role, permissions: invitation.permissions })
      await tx.invitation.update({ where: { id: invitation.id }, data: { status: 'ACCEPTED', accepted_at: new Date() } })
      await tx.activityLog.create({ data: { actor_id: user.id, action: 'INVITATION_ACCEPTED', organization_id: organizationId, target_user_id: user.id, subject_name: invitation.email } })
      return { organization_id: organizationId }
    }),
}
