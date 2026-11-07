import bcrypt from 'bcrypt'
import request from 'supertest'
import type { MemberRole, Permission } from '@generated/prisma/enums.ts'
import { app } from '../src/app.ts'
import { prisma } from '@lib/prisma.ts'
import { ROLES } from '@lib/roles.ts'

export const TEST_PASSWORD = 'password123'

type CreateUserParams = {
  email: string
  isPlatformAdmin?: boolean
}

export const createUser = async ({ email, isPlatformAdmin = false }: CreateUserParams) => {
  const user = await prisma.user.create({
    data: {
      first_name: 'Test',
      last_name: 'User',
      email,
      password_hash: await bcrypt.hash(TEST_PASSWORD, 4),
      status: 'ACTIVE',
    },
  })
  if (isPlatformAdmin) {
    const role = await prisma.role.upsert({
      where: { name: ROLES.PLATFORM_ADMIN },
      update: {},
      create: { name: ROLES.PLATFORM_ADMIN, normalized_name: 'platform_admin' },
    })
    await prisma.userRole.create({ data: { user_id: user.id, role_id: role.id } })
  }
  return user
}

type CreateOrganizationParams = {
  name: string
  ownerId: string
  type?: 'SCHOOL' | 'KINDERGARTEN' | 'ACADEMY'
  members?: { userId: string; role: MemberRole; permissions?: Permission[] }[]
}

export const createOrganization = ({ name, ownerId, type = 'SCHOOL', members = [] }: CreateOrganizationParams) =>
  prisma.organization.create({
    data: {
      name,
      type,
      country: 'XK',
      currency: 'EUR',
      memberships: {
        create: [{ user_id: ownerId, role: 'OWNER' }, ...members.map((member) => ({ user_id: member.userId, role: member.role, permissions: member.permissions }))],
      },
    },
  })

type CreateCourseParams = {
  organizationId: string
  name: string
  code?: string
  status?: 'ACTIVE' | 'ARCHIVED'
  /** The organization's General department when left out */
  departmentId?: string
}

const GENERAL_DEPARTMENT = 'General'

/** A course stored straight in the database, with the level and department every course needs */
export const createCourse = async ({ organizationId, name, code, status, departmentId }: CreateCourseParams) => {
  const department = departmentId
    ? { id: departmentId }
    : await prisma.department.upsert({
        where: { organization_id_name: { organization_id: organizationId, name: GENERAL_DEPARTMENT } },
        update: {},
        create: { organization_id: organizationId, name: GENERAL_DEPARTMENT },
      })
  return prisma.course.create({ data: { organization_id: organizationId, name, code, status, level: 'B2', department_id: department.id } })
}

/** Logs in through the API and returns the bearer header value */
export const loginAs = async (email: string) => {
  const response = await request(app).post('/api/auth/login').send({ email, password: TEST_PASSWORD })
  return `Bearer ${response.body.data.accessToken}`
}
