// The one gate every guardian read of a child goes through. A route for a new module (grades, materials, payments) lives at
// /me/children/:studentId/<module>, calls findLinkedChild first and then reads by the id it returns.
import type { Prisma } from '@generated/prisma/client.ts'
import { HttpError } from '@lib/httpError.ts'
import { prisma } from '@lib/prisma.ts'

/** Only what a guardian may see of a child: the name. Never notes, the student number or anything staff-only. */
export const linkedChildSelect = { id: true, first_name: true, last_name: true } as const satisfies Prisma.StudentSelect

type LinkedChildWhereParams = {
  organizationId: string
  userId: string
}

/** The organization's active students linked, through a guardian record with this login, to the user */
export const linkedChildWhere = ({ organizationId, userId }: LinkedChildWhereParams): Prisma.StudentWhereInput => ({
  organization_id: organizationId,
  status: 'ACTIVE',
  guardians: { some: { guardian: { organization_id: organizationId, user_id: userId } } },
})

type FindLinkedChildParams = LinkedChildWhereParams & {
  studentId: string
}

/** The child, when this user is linked to them as a guardian in this organization; otherwise 404, the same as a child that doesn't exist */
export const findLinkedChild = async ({ organizationId, userId, studentId }: FindLinkedChildParams) => {
  const child = await prisma.student.findFirst({ where: { ...linkedChildWhere({ organizationId, userId }), id: studentId }, select: linkedChildSelect })
  if (!child) {
    throw new HttpError(404, 'Child not found')
  }
  return child
}
