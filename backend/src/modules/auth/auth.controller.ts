import type { Response } from 'express'
import multer, { MulterError } from 'multer'
import { ALLOWED_AVATAR_MIME_TYPES, AVATAR_MAX_BYTES } from '@lib/avatar-storage.ts'
import { HttpError, sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import { AuthService } from './auth.service.ts'
import type { ChangePasswordInput, LoginUserInput, LogoutInput, RefreshTokenInput, RegisterUserInput, UpdateProfileInput } from './auth.types.ts'

const AVATAR_FIELD_NAME = 'avatar'

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_BYTES },
  fileFilter: (_req, file, callback) => {
    if (!(ALLOWED_AVATAR_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
      return callback(new HttpError(400, 'Upload a JPEG, PNG or WEBP image.'))
    }
    callback(null, true)
  },
}).single(AVATAR_FIELD_NAME)

// multer calls back instead of throwing; this turns that callback into a promise the controller can await and catch
const runAvatarUpload = (req: AuthRequest, res: Response) =>
  new Promise<void>((resolve, reject) => {
    avatarUpload(req, res, (error: unknown) => {
      if (!error) {
        return resolve()
      }
      if (error instanceof HttpError) {
        return reject(error)
      }
      if (error instanceof MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return reject(new HttpError(400, 'Images must be 2MB or smaller.'))
      }
      return reject(new HttpError(400, 'Could not process the uploaded file.'))
    })
  })

export const AuthController = {
  registerUser: async (req: TypedRequest<RegisterUserInput>, res: Response) => {
    try {
      const result = await AuthService.registerUser(req.body)
      return res.status(201).json({ message: 'Account created', data: result })
    } catch (error) {
      return sendError({ res, error, fallback: 'Registration failed' })
    }
  },

  loginUser: async (req: TypedRequest<LoginUserInput>, res: Response) => {
    try {
      const result = await AuthService.loginUser(req.body)
      return res.status(200).json({ message: 'Login successful', data: result })
    } catch (error) {
      return sendError({ res, error, fallback: 'Login failed' })
    }
  },

  refreshToken: async (req: TypedRequest<RefreshTokenInput>, res: Response) => {
    try {
      const result = await AuthService.refreshAccessToken(req.body)
      return res.status(200).json({ message: 'Token refreshed', data: result })
    } catch (error) {
      return sendError({ res, error, fallback: 'Token refresh failed' })
    }
  },

  logoutUser: async (req: TypedRequest<LogoutInput>, res: Response) => {
    try {
      const result = await AuthService.logoutUser(req.body)
      return res.status(200).json({ message: result.message })
    } catch (error) {
      return sendError({ res, error, fallback: 'Logout failed' })
    }
  },

  me: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const user = await AuthService.getCurrentUser(userId)
      return res.status(200).json({ message: 'Current user fetched', data: user })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch current user' })
    }
  },

  updateProfile: async (req: AuthRequest & { body: UpdateProfileInput }, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const user = await AuthService.updateProfile({ userId, data: req.body })
      return res.status(200).json({ message: 'Profile updated', data: user })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to update profile' })
    }
  },

  changePassword: async (req: AuthRequest & { body: ChangePasswordInput }, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const tokens = await AuthService.changePassword({ userId, data: req.body })
      return res.status(200).json({ message: 'Password changed', data: tokens })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to change password' })
    }
  },

  uploadAvatar: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      await runAvatarUpload(req, res)
      if (!req.file) {
        throw new HttpError(400, 'Choose an image to upload.')
      }
      const user = await AuthService.uploadAvatar({ userId, mimeType: req.file.mimetype, buffer: req.file.buffer })
      return res.status(200).json({ message: 'Avatar updated', data: user })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to upload avatar' })
    }
  },

  removeAvatar: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const user = await AuthService.removeAvatar(userId)
      return res.status(200).json({ message: 'Avatar removed', data: user })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to remove avatar' })
    }
  },
}
