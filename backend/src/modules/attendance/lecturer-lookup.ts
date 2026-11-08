// Shared by attendance and lesson plans: both resolve a login to its lecturer record the same way.
import type { Prisma } from '@generated/prisma/client.ts'

type Db = Prisma.TransactionClient

type FindLecturerIdParams = {
  db: Db
  organizationId: string
  userId: string
}

/** The lecturer record linked to the login in this organization, if any */
export const findLecturerId = async ({ db, organizationId, userId }: FindLecturerIdParams) =>
  (await db.lecturer.findFirst({ where: { organization_id: organizationId, user_id: userId }, select: { id: true } }))?.id ?? null
