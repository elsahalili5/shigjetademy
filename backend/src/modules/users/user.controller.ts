import type { Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import { UserService } from './user.services.ts'
import type { UpdateUserInput, UserIdParam } from './user.types.ts'

export const UserController = {
  getUsers: async (_req: AuthRequest, res: Response) => {
    try {
      const users = await UserService.getUsers()
      return res.status(200).json({ data: users })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch users' })
    }
  },

  getUserById: async (req: TypedRequest<unknown, UserIdParam>, res: Response) => {
    try {
      const user = await UserService.getUserById(req.params.userId)
      return res.status(200).json({ data: user })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch user' })
    }
  },

  updateUser: async (req: TypedRequest<UpdateUserInput, UserIdParam>, res: Response) => {
    try {
      const user = await UserService.updateUser({ userId: req.params.userId, data: req.body })
      return res.status(200).json({ data: user })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to update user' })
    }
  },

  deleteUser: async (req: TypedRequest<unknown, UserIdParam>, res: Response) => {
    try {
      await UserService.deleteUser(req.params.userId)
      return res.status(200).json({ message: 'User deleted successfully' })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to delete user' })
    }
  },
}
