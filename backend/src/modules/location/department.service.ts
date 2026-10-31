import type { Prisma } from '@generated/prisma/client.ts'
import { prisma } from '@lib/prisma.ts'
import { HttpError } from '@lib/httpError.ts'
import { lockOrganization } from './location.service.ts'
import type { DepartmentInput } from './location.types.ts'

const departmentSelect = { id: true, name: true, description: true, location_id: true, created_at: true } as const

type CheckDepartmentParams = {
  tx: Prisma.TransactionClient
  organizationId: string
  data: DepartmentInput
  /** The department being edited, which may keep its own name */
  departmentId?: string
}

/** Names are unique in the organization whatever their case, and the location must be one of its own */
const checkDepartment = async ({ tx, organizationId, data, departmentId }: CheckDepartmentParams) => {
  const sameName = await tx.department.findFirst({
    where: { organization_id: organizationId, name: { equals: data.name, mode: 'insensitive' }, NOT: departmentId ? { id: departmentId } : undefined },
    select: { id: true },
  })
  if (sameName) {
    throw new HttpError(409, 'There is already a department with this name')
  }
  if (data.location_id) {
    const location = await tx.location.findFirst({ where: { id: data.location_id, organization_id: organizationId }, select: { id: true } })
    if (!location) {
      throw new HttpError(400, 'Choose one of your organization’s locations')
    }
  }
}

const toDepartmentData = (data: DepartmentInput) => ({ name: data.name, description: data.description || null, location_id: data.location_id })

type CreateDepartmentParams = {
  organizationId: string
  actorId: string
  data: DepartmentInput
}

type DepartmentChangeParams = {
  organizationId: string
  departmentId: string
  actorId: string
}

type UpdateDepartmentParams = DepartmentChangeParams & {
  data: DepartmentInput
}

type FindDepartmentParams = {
  tx: Prisma.TransactionClient
  organizationId: string
  departmentId: string
}

const findDepartment = async ({ tx, organizationId, departmentId }: FindDepartmentParams) => {
  const department = await tx.department.findFirst({ where: { id: departmentId, organization_id: organizationId }, select: { name: true } })
  if (!department) {
    throw new HttpError(404, 'Department not found')
  }
  return department
}

// Writes lock the organization, so two departments can't be given the same name at the same moment
export const DepartmentService = {
  listDepartments: (organizationId: string) =>
    prisma.department.findMany({ where: { organization_id: organizationId }, orderBy: { name: 'asc' }, select: departmentSelect }),

  createDepartment: ({ organizationId, actorId, data }: CreateDepartmentParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      await checkDepartment({ tx, organizationId, data })
      const department = await tx.department.create({ data: { organization_id: organizationId, ...toDepartmentData(data) }, select: departmentSelect })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'DEPARTMENT_CREATED', organization_id: organizationId, subject_name: department.name } })
      return department
    }),

  updateDepartment: ({ organizationId, departmentId, actorId, data }: UpdateDepartmentParams) =>
    prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      await findDepartment({ tx, organizationId, departmentId })
      await checkDepartment({ tx, organizationId, data, departmentId })
      const department = await tx.department.update({ where: { id: departmentId }, data: toDepartmentData(data), select: departmentSelect })
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'DEPARTMENT_UPDATED', organization_id: organizationId, subject_name: department.name } })
      return department
    }),

  removeDepartment: ({ organizationId, departmentId, actorId }: DepartmentChangeParams) =>
    prisma.$transaction(async (tx) => {
      const department = await findDepartment({ tx, organizationId, departmentId })
      // A removal at the same moment may have won; then there is nothing left to remove or log
      const { count } = await tx.department.deleteMany({ where: { id: departmentId, organization_id: organizationId } })
      if (count === 0) {
        throw new HttpError(404, 'Department not found')
      }
      await tx.activityLog.create({ data: { actor_id: actorId, action: 'DEPARTMENT_REMOVED', organization_id: organizationId, subject_name: department.name } })
    }),
}
