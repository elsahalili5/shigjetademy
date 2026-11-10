// Staff read and change a student's guardians. A guardian is one record per person in the organization, found by their email,
// so adding the same parent to a second child only adds a link; unlinking removes only the link.
import type { Prisma } from '@generated/prisma/client.ts'
import { getGuardianName } from '@shigjetademy/shared/guardians'
import { getStudentName } from '@shigjetademy/shared/students'
import { HttpError, refuseField } from '@lib/httpError.ts'
import { lockOrganization } from '@lib/organization-lock.ts'
import type { OrganizationScope } from '@lib/organization-lock.ts'
import { prisma } from '@lib/prisma.ts'
import { revokePendingRecordInvitation } from '@modules/invitations/invitations.service.ts'
import type { Guardian, GuardianInput, GuardianLoginStatus, StudentGuardian } from './guardians.types.ts'

export const guardianSelect = {
  id: true,
  first_name: true,
  last_name: true,
  email: true,
  phone: true,
  // Read only to derive login_status; the user id itself never leaves the server
  user_id: true,
  invitations: { where: { status: 'PENDING' }, select: { email: true, expires_at: true }, orderBy: { created_at: 'desc' }, take: 1 },
} as const satisfies Prisma.GuardianSelect

type StoredGuardian = Prisma.GuardianGetPayload<{ select: typeof guardianSelect }>

const toGuardianJson = ({ user_id, invitations, ...guardian }: StoredGuardian): Guardian => {
  // A pending invitation past its expiry no longer counts
  const invitation = invitations.find((item) => item.expires_at > new Date()) ?? null
  const loginStatus: GuardianLoginStatus = user_id ? 'LINKED' : invitation ? 'INVITED' : 'NONE'
  return { ...guardian, login_status: loginStatus, invitation: loginStatus === 'INVITED' && invitation ? { email: invitation.email, expires_at: invitation.expires_at.toISOString() } : null }
}

const linkSelect = { relationship: true, guardian: { select: guardianSelect } } as const satisfies Prisma.StudentGuardianSelect

type StoredLink = Prisma.StudentGuardianGetPayload<{ select: typeof linkSelect }>

const toStudentGuardianJson = ({ relationship, guardian }: StoredLink): StudentGuardian => ({ ...toGuardianJson(guardian), relationship })

type StudentScope = OrganizationScope & {
  studentId: string
}

/** The organization's student, or a 404 */
const findStudent = async ({ tx, organizationId, studentId }: StudentScope) => {
  const student = await tx.student.findFirst({ where: { id: studentId, organization_id: organizationId }, select: { id: true, first_name: true, last_name: true } })
  if (!student) {
    throw new HttpError(404, 'Student not found')
  }
  return student
}

type LinkScope = StudentScope & {
  guardianId: string
}

/** The guardian's link to this student of the organization, or a 404 when they aren't linked */
const findLink = async ({ tx, organizationId, studentId, guardianId }: LinkScope) => {
  const link = await tx.studentGuardian.findFirst({
    where: { student_id: studentId, guardian_id: guardianId, student: { organization_id: organizationId }, guardian: { organization_id: organizationId } },
    select: linkSelect,
  })
  if (!link) {
    throw new HttpError(404, 'This guardian isn’t linked to this student.')
  }
  return link
}

const EMAIL_TAKEN_MESSAGE = 'Another guardian in your organization already has this email.'

type RefuseTakenEmailParams = OrganizationScope & {
  email: string | null
  guardianId: string
}

const refuseTakenEmail = async ({ tx, organizationId, email, guardianId }: RefuseTakenEmailParams) => {
  if (!email) return
  const taken = await tx.guardian.findFirst({ where: { organization_id: organizationId, email, id: { not: guardianId } }, select: { id: true } })
  if (taken) {
    throw refuseField({ field: 'email', status: 409, message: EMAIL_TAKEN_MESSAGE })
  }
}

// Optional fields come in as '' when left empty and are stored as null; the schema already trimmed and lowercased the email
const toGuardianData = (data: GuardianInput) => ({
  first_name: data.first_name,
  last_name: data.last_name,
  email: data.email || null,
  phone: data.phone || null,
})

type ListGuardiansParams = {
  organizationId: string
  studentId: string
}

type AddGuardianParams = ListGuardiansParams & {
  actorId: string
  data: GuardianInput
}

type UpdateGuardianParams = AddGuardianParams & {
  guardianId: string
}

type UnlinkGuardianParams = ListGuardiansParams & {
  actorId: string
  guardianId: string
}

type GetGuardianParams = {
  organizationId: string
  guardianId: string
}

export const GuardianService = {
  listStudentGuardians: async ({ organizationId, studentId }: ListGuardiansParams) => {
    await findStudent({ tx: prisma, organizationId, studentId })
    const links = await prisma.studentGuardian.findMany({
      where: { student_id: studentId },
      orderBy: [{ guardian: { last_name: 'asc' } }, { guardian: { first_name: 'asc' } }, { guardian_id: 'asc' }],
      select: linkSelect,
    })
    return links.map(toStudentGuardianJson)
  },

  /** The organization's guardian without a student, or a 404 */
  getGuardian: async ({ organizationId, guardianId }: GetGuardianParams) => {
    const guardian = await prisma.guardian.findFirst({ where: { id: guardianId, organization_id: organizationId }, select: guardianSelect })
    if (!guardian) {
      throw new HttpError(404, 'Guardian not found')
    }
    return toGuardianJson(guardian)
  },

  // The organization's guardian with the same email is reused as they are and only linked; never a second record for one person
  addStudentGuardian: ({ organizationId, studentId, actorId, data }: AddGuardianParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      const student = await findStudent({ tx, organizationId, studentId })
      const existing = data.email ? await tx.guardian.findFirst({ where: { organization_id: organizationId, email: data.email }, select: { id: true, first_name: true, last_name: true } }) : null
      if (existing) {
        const linked = await tx.studentGuardian.findUnique({ where: { student_id_guardian_id: { student_id: studentId, guardian_id: existing.id } }, select: { student_id: true } })
        if (linked) {
          throw refuseField({ field: 'email', status: 409, message: `${getGuardianName(existing)} is already a guardian of ${getStudentName(student)}.` })
        }
      }
      const guardianId = existing?.id ?? (await tx.guardian.create({ data: { organization_id: organizationId, ...toGuardianData(data) }, select: { id: true } })).id
      const link = await tx.studentGuardian.create({ data: { student_id: studentId, guardian_id: guardianId, relationship: data.relationship }, select: linkSelect })
      const guardianName = getGuardianName(link.guardian)
      await tx.activityLog.create({
        data: existing
          ? { actor_id: actorId, action: 'GUARDIAN_LINKED', organization_id: organizationId, subject_name: `${guardianName} to ${getStudentName(student)}` }
          : { actor_id: actorId, action: 'GUARDIAN_ADDED', organization_id: organizationId, subject_name: `${guardianName} for ${getStudentName(student)}` },
      })
      return toStudentGuardianJson(link)
    }),

  // A changed email withdraws the open invitation to the old one
  updateStudentGuardian: ({ organizationId, studentId, guardianId, actorId, data }: UpdateGuardianParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      const before = await findLink({ tx, organizationId, studentId, guardianId })
      const guardianData = toGuardianData(data)
      await refuseTakenEmail({ tx, organizationId, email: guardianData.email, guardianId })
      await tx.guardian.update({ where: { id: guardianId }, data: guardianData })
      const link = await tx.studentGuardian.update({ where: { student_id_guardian_id: { student_id: studentId, guardian_id: guardianId } }, data: { relationship: data.relationship }, select: linkSelect })
      if (before.guardian.email !== guardianData.email) {
        await revokePendingRecordInvitation({ tx, organizationId, record: { kind: 'GUARDIAN', id: guardianId }, actorId })
      }
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'GUARDIAN_UPDATED', organization_id: organizationId, subject_name: getGuardianName(link.guardian) } })
      return toStudentGuardianJson(await findLink({ tx, organizationId, studentId, guardianId }))
    }),

  // Only the link goes; the guardian, their login, membership and other children stay
  unlinkStudentGuardian: ({ organizationId, studentId, guardianId, actorId }: UnlinkGuardianParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      const student = await findStudent({ tx, organizationId, studentId })
      const link = await findLink({ tx, organizationId, studentId, guardianId })
      await tx.studentGuardian.delete({ where: { student_id_guardian_id: { student_id: studentId, guardian_id: guardianId } } })
      await tx.activityLog.create({
        data: { actor_id: actorId, action: 'GUARDIAN_UNLINKED', organization_id: organizationId, subject_name: `${getGuardianName(link.guardian)} from ${getStudentName(student)}` },
      })
    }),
}
