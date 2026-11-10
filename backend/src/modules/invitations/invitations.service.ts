import { createHash, randomBytes } from 'node:crypto'
import type { Prisma } from '@generated/prisma/client.ts'
import type { InvitationStatus, MemberRole, Permission } from '@generated/prisma/enums.ts'
import { INVITATION_VALID_DAYS } from '@shigjetademy/shared/invitations'
import { resolveOrganizationSettings } from '@shigjetademy/shared/organization-settings'
import { DAY_MS } from '@lib/constants.ts'
import { HttpError } from '@lib/httpError.ts'
import { sendInvitationEmail } from '@lib/mailer.ts'
import { lockOrganization } from '@lib/organization-lock.ts'
import type { OrganizationScope } from '@lib/organization-lock.ts'
import { prisma } from '@lib/prisma.ts'

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

/** Who an invitation lets in: a school admin with chosen permissions, or the login for one existing student, lecturer or guardian record */
export type InvitationTarget =
  | { role: 'ADMIN'; permissions: Permission[] }
  | { role: 'STUDENT'; studentId: string }
  | { role: 'LECTURER'; lecturerId: string }
  | { role: 'GUARDIAN'; guardianId: string }

type CreateInvitationParams = {
  organizationId: string
  actorId: string
  email: string
  target: InvitationTarget
}

const emailTaken = (message: string) => new HttpError(409, message, { fieldErrors: { email: [message] } })

/** A student, lecturer or guardian record an invitation logs in to */
export type RecordRef = { kind: 'STUDENT' | 'LECTURER' | 'GUARDIAN'; id: string }

const toRecord = (target: Exclude<InvitationTarget, { role: 'ADMIN' }>): RecordRef => {
  switch (target.role) {
    case 'STUDENT':
      return { kind: 'STUDENT', id: target.studentId }
    case 'LECTURER':
      return { kind: 'LECTURER', id: target.lecturerId }
    case 'GUARDIAN':
      return { kind: 'GUARDIAN', id: target.guardianId }
    default: {
      const unhandled: never = target
      throw new Error(`Unhandled invitation target: ${JSON.stringify(unhandled)}`)
    }
  }
}

/** What differs between the kinds of record: their words, and whether an account linked elsewhere is refused already when inviting */
const RECORD_KINDS = {
  STUDENT: {
    noun: 'student',
    notFoundMessage: 'Student not found',
    otherRoleMessage: 'This email belongs to someone who already works in your organization.',
    isLinkedElsewhereRefusedOnInvite: false,
  },
  LECTURER: {
    noun: 'lecturer',
    notFoundMessage: 'Lecturer not found',
    otherRoleMessage: 'This email belongs to someone with another role in your organization.',
    isLinkedElsewhereRefusedOnInvite: true,
  },
  GUARDIAN: {
    noun: 'guardian',
    notFoundMessage: 'Guardian not found',
    otherRoleMessage: 'This email belongs to a staff member or student here.',
    isLinkedElsewhereRefusedOnInvite: true,
  },
} as const satisfies Record<RecordRef['kind'], { noun: string; notFoundMessage: string; otherRoleMessage: string; isLinkedElsewhereRefusedOnInvite: boolean }>

type RecordScope = OrganizationScope & {
  record: RecordRef
}

/** The organization's record of this kind, with its status and login, or null; a guardian is never archived */
const findRecord = async ({ tx, organizationId, record }: RecordScope) => {
  const where = { id: record.id, organization_id: organizationId }
  const select = { status: true, user_id: true } as const
  switch (record.kind) {
    case 'STUDENT':
      return tx.student.findFirst({ where, select })
    case 'LECTURER':
      return tx.lecturer.findFirst({ where, select })
    case 'GUARDIAN': {
      const guardian = await tx.guardian.findFirst({ where, select: { user_id: true } })
      return guardian && { status: 'ACTIVE' as const, user_id: guardian.user_id }
    }
    default: {
      const unhandled: never = record.kind
      throw new Error(`Unhandled record kind: ${String(unhandled)}`)
    }
  }
}

type FindLinkedElsewhereParams = RecordScope & {
  user: Prisma.UserWhereInput
}

/** Another record of the same kind in the organization that this user's login is already linked to, or null */
const findLinkedElsewhere = ({ tx, organizationId, record, user }: FindLinkedElsewhereParams) => {
  const where = { organization_id: organizationId, id: { not: record.id }, user }
  switch (record.kind) {
    case 'STUDENT':
      return tx.student.findFirst({ where, select: { id: true } })
    case 'LECTURER':
      return tx.lecturer.findFirst({ where, select: { id: true } })
    case 'GUARDIAN':
      return tx.guardian.findFirst({ where, select: { id: true } })
    default: {
      const unhandled: never = record.kind
      throw new Error(`Unhandled record kind: ${String(unhandled)}`)
    }
  }
}

type SetRecordLoginParams = RecordScope & {
  userId: string
}

/** Links the login, guarded on the record having none, so a record never gets a second one; how many records changed */
const setRecordLogin = async ({ tx, organizationId, record, userId }: SetRecordLoginParams) => {
  const where = { id: record.id, organization_id: organizationId, user_id: null }
  const data = { user_id: userId }
  switch (record.kind) {
    case 'STUDENT':
      return (await tx.student.updateMany({ where, data })).count
    case 'LECTURER':
      return (await tx.lecturer.updateMany({ where, data })).count
    case 'GUARDIAN':
      return (await tx.guardian.updateMany({ where, data })).count
    default: {
      const unhandled: never = record.kind
      throw new Error(`Unhandled record kind: ${String(unhandled)}`)
    }
  }
}

const recordInvitationWhere = (record: RecordRef): Prisma.InvitationWhereInput => {
  switch (record.kind) {
    case 'STUDENT':
      return { student_id: record.id }
    case 'LECTURER':
      return { lecturer_id: record.id }
    case 'GUARDIAN':
      return { guardian_id: record.id }
    default: {
      const unhandled: never = record.kind
      throw new Error(`Unhandled record kind: ${String(unhandled)}`)
    }
  }
}

type RefuseUninvitableRecordParams = RecordScope & {
  email: string
}

const refuseUninvitableRecord = async ({ tx, organizationId, email, record }: RefuseUninvitableRecordParams) => {
  const { noun, notFoundMessage, otherRoleMessage, isLinkedElsewhereRefusedOnInvite } = RECORD_KINDS[record.kind]
  const found = await findRecord({ tx, organizationId, record })
  if (!found) {
    throw new HttpError(404, notFoundMessage)
  }
  if (found.user_id) {
    throw new HttpError(409, `This ${noun} already has a login.`)
  }
  if (found.status === 'ARCHIVED') {
    throw new HttpError(409, `Restore this ${noun} before inviting them.`)
  }
  // One role per organization
  const otherRole = await tx.membership.findFirst({ where: { organization_id: organizationId, status: 'ACTIVE', role: { not: record.kind }, user: { email } }, select: { id: true } })
  if (otherRole) {
    throw emailTaken(otherRoleMessage)
  }
  if (isLinkedElsewhereRefusedOnInvite && (await findLinkedElsewhere({ tx, organizationId, record, user: { email } }))) {
    throw emailTaken(`This email’s account is already linked to another ${noun} in your organization.`)
  }
  const pending = await tx.invitation.findFirst({ where: { ...recordInvitationWhere(record), status: 'PENDING' }, select: { id: true } })
  if (pending) {
    throw new HttpError(409, `This ${noun} already has a pending invitation.`)
  }
}

type RevokePendingRecordInvitationParams = RecordScope & {
  actorId: string
}

/** An archived record can't be invited, so archiving withdraws its open login invitation, and logs it */
export const revokePendingRecordInvitation = async ({ tx, organizationId, record, actorId }: RevokePendingRecordInvitationParams) => {
  const pending = await tx.invitation.findFirst({ where: { organization_id: organizationId, ...recordInvitationWhere(record), status: 'PENDING' }, select: { id: true, email: true } })
  if (!pending) return
  await tx.invitation.update({ where: { id: pending.id }, data: { status: 'REVOKED', revoked_at: new Date() } })
  await tx.activityLog.create({ data: { actor_id: actorId, action: 'INVITATION_REVOKED', organization_id: organizationId, subject_name: pending.email } })
}

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
    case 'STUDENT':
    case 'LECTURER':
    case 'GUARDIAN':
      return refuseUninvitableRecord({ tx, organizationId, email, record: toRecord(target) })
    default: {
      const unhandled: never = target
      throw new Error(`Unhandled invitation target: ${JSON.stringify(unhandled)}`)
    }
  }
}

const targetData = (target: InvitationTarget) => {
  switch (target.role) {
    case 'ADMIN':
      return { role: target.role, permissions: target.permissions, student_id: null, lecturer_id: null, guardian_id: null }
    case 'STUDENT':
      return { role: target.role, permissions: [], student_id: target.studentId, lecturer_id: null, guardian_id: null }
    case 'LECTURER':
      return { role: target.role, permissions: [], student_id: null, lecturer_id: target.lecturerId, guardian_id: null }
    case 'GUARDIAN':
      return { role: target.role, permissions: [], student_id: null, lecturer_id: null, guardian_id: target.guardianId }
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
  /** Which of the organization's invitations: an admin invitation by id, or a student's, lecturer's or guardian's by their record */
  match: { invitationId: string } | { studentId: string } | { lecturerId: string } | { guardianId: string }
}

const matchWhere = ({ organizationId, match }: Pick<InvitationChangeParams, 'organizationId' | 'match'>): Prisma.InvitationWhereInput => {
  if ('invitationId' in match) return { id: match.invitationId, organization_id: organizationId, student_id: null, lecturer_id: null, guardian_id: null }
  if ('studentId' in match) return { student_id: match.studentId, organization_id: organizationId }
  if ('guardianId' in match) return { guardian_id: match.guardianId, organization_id: organizationId }
  return { lecturer_id: match.lecturerId, organization_id: organizationId }
}

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

/** The record a stored invitation logs in to, if any */
const recordOf = ({ student_id, lecturer_id, guardian_id }: { student_id: string | null; lecturer_id: string | null; guardian_id: string | null }): RecordRef | null => {
  if (student_id) return { kind: 'STUDENT', id: student_id }
  if (lecturer_id) return { kind: 'LECTURER', id: lecturer_id }
  if (guardian_id) return { kind: 'GUARDIAN', id: guardian_id }
  return null
}

type LinkRecordParams = RecordScope & {
  userId: string
  organizationName: string
}

/** Puts the login on the existing record; the record and its history stay as they are, and no second record is made */
const linkRecord = async ({ tx, organizationId, record, userId, organizationName }: LinkRecordParams) => {
  const { noun } = RECORD_KINDS[record.kind]
  const found = await findRecord({ tx, organizationId, record })
  if (found?.status === 'ARCHIVED') {
    throw new HttpError(409, `This ${noun} record is archived. Ask your school to restore it first.`)
  }
  if (await findLinkedElsewhere({ tx, organizationId, record, user: { id: userId } })) {
    throw new HttpError(409, `Your account is already linked to another ${noun} at ${organizationName}.`)
  }
  if ((await setRecordLogin({ tx, organizationId, record, userId })) === 0) {
    throw new HttpError(409, `This ${noun} already has a login.`)
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
        select: { id: true, email: true, role: true, permissions: true, status: true, expires_at: true, student_id: true, lecturer_id: true, guardian_id: true, organization: { select: { name: true, status: true } } },
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
      const record = recordOf(invitation)
      if (record) {
        await linkRecord({ tx, organizationId, record, userId: user.id, organizationName: invitation.organization.name })
      }
      await joinOrganization({ tx, organizationId, userId: user.id, role: invitation.role, permissions: invitation.permissions })
      await tx.invitation.update({ where: { id: invitation.id }, data: { status: 'ACCEPTED', accepted_at: new Date() } })
      await tx.activityLog.create({ data: { actor_id: user.id, action: 'INVITATION_ACCEPTED', organization_id: organizationId, target_user_id: user.id, subject_name: invitation.email } })
      return { organization_id: organizationId }
    }),
}
