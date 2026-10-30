import { prisma } from '@lib/prisma.ts'
import { safeUserSelect } from '@lib/constants.ts'
import { HttpError } from '@lib/httpError.ts'
import type { UpdateUserInput } from './user.types.ts'

type UpdateUserParams = {
  userId: string
  data: UpdateUserInput
}

// Platform-wide user management for the platform admin; organizations manage their people through memberships
export const UserService = {
  getUsers: () => prisma.user.findMany({ select: safeUserSelect, orderBy: { created_at: 'desc' } }),

  getUserById: async (userId: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: safeUserSelect })
    if (!user) {
      throw new HttpError(404, 'User not found')
    }
    return user
  },

  updateUser: async ({ userId, data }: UpdateUserParams) => {
    const existingUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!existingUser) {
      throw new HttpError(404, 'User not found')
    }

    if (data.email) {
      const emailOwner = await prisma.user.findUnique({ where: { email: data.email } })
      if (emailOwner && emailOwner.id !== userId) {
        throw new HttpError(409, 'Email already in use')
      }
    }

    // Unlocking by hand also clears the lockout counters
    const isUnlocking = data.status === 'ACTIVE' && existingUser.status === 'LOCKED'

    return prisma.user.update({
      where: { id: userId },
      data: { ...data, ...(isUnlocking ? { access_failed_count: 0, locked_until: null } : {}) },
      select: safeUserSelect,
    })
  },

  deleteUser: async (userId: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new HttpError(404, 'User not found')
    }
    return prisma.user.delete({ where: { id: userId }, select: safeUserSelect })
  },
}
