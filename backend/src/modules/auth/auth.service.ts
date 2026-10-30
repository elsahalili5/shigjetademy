import bcrypt from 'bcrypt'
import { prisma } from '@lib/prisma.ts'
import { SALT_ROUNDS, safeUserSelect } from '@lib/constants.ts'
import { HttpError } from '@lib/httpError.ts'
import { generateAccessToken, generateRefreshToken, REFRESH_TOKEN_EXPIRY_MS, verifyRefreshToken } from '@lib/jwt.ts'
import type { SafeUser } from '@lib/types.ts'
import type {
  AuthTokens,
  ChangePasswordInput,
  LoginUserInput,
  LoginUserResponse,
  LogoutInput,
  RefreshTokenInput,
  RefreshTokenResponse,
  RegisterUserInput,
  RegisterUserResponse,
  UpdateProfileInput,
} from './auth.types.ts'

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

const issueTokens = async (userId: string): Promise<AuthTokens> => {
  const accessToken = generateAccessToken(userId)
  const refreshToken = generateRefreshToken(userId)

  await prisma.refreshTokens.create({
    data: { user_id: userId, token: refreshToken, expires: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS) },
  })

  return { accessToken, refreshToken }
}

type UpdateProfileParams = {
  userId: string
  data: UpdateProfileInput
}

type ChangePasswordParams = {
  userId: string
  data: ChangePasswordInput
}

export const AuthService = {
  // Education providers sign up here; everyone else joins an organization through an invitation
  registerUser: async (data: RegisterUserInput): Promise<RegisterUserResponse> => {
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } })
    if (existingUser) {
      throw new HttpError(409, 'An account with this email already exists')
    }

    const user = await prisma.user.create({
      data: {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        password_hash: await bcrypt.hash(data.password, SALT_ROUNDS),
        status: 'ACTIVE',
      },
      select: safeUserSelect,
    })

    return { user, ...(await issueTokens(user.id)) }
  },

  loginUser: async ({ email, password }: LoginUserInput): Promise<LoginUserResponse> => {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      throw new HttpError(401, 'Invalid email or password')
    }

    // A lock that has run out is lifted before the password is checked
    const isLockExpired = user.status === 'LOCKED' && !!user.locked_until && user.locked_until <= new Date()
    if (isLockExpired) {
      await prisma.user.update({ where: { id: user.id }, data: { status: 'ACTIVE', access_failed_count: 0, locked_until: null } })
      user.status = 'ACTIVE'
      user.access_failed_count = 0
    }

    switch (user.status) {
      case 'ACTIVE':
        break
      case 'LOCKED':
        throw new HttpError(403, `Too many failed attempts. Try again after ${user.locked_until?.toISOString() ?? 'a while'}`)
      case 'DISABLED':
      case 'PENDING':
        throw new HttpError(403, 'Account access denied')
      default: {
        const unhandled: never = user.status
        throw new Error(`Unhandled user status: ${String(unhandled)}`)
      }
    }

    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch) {
      if (user.lockout_enabled) {
        const failedCount = user.access_failed_count + 1
        const isLocking = failedCount >= MAX_FAILED_ATTEMPTS
        const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS)

        await prisma.user.update({
          where: { id: user.id },
          data: {
            access_failed_count: failedCount,
            status: isLocking ? 'LOCKED' : user.status,
            locked_until: isLocking ? lockedUntil : null,
          },
        })

        if (isLocking) {
          throw new HttpError(403, `Too many failed attempts. Try again after ${lockedUntil.toISOString()}`)
        }
      }
      throw new HttpError(401, 'Invalid email or password')
    }

    if (user.access_failed_count !== 0) {
      await prisma.user.update({ where: { id: user.id }, data: { access_failed_count: 0 } })
    }

    const safeUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: safeUserSelect })
    return { user: safeUser, ...(await issueTokens(user.id)) }
  },

  // Each refresh token works once: it is revoked and replaced by a new pair
  refreshAccessToken: async ({ refreshToken }: RefreshTokenInput): Promise<RefreshTokenResponse> => {
    let userId: string
    try {
      userId = verifyRefreshToken(refreshToken)
    } catch {
      throw new HttpError(401, 'Invalid refresh token')
    }

    const storedToken = await prisma.refreshTokens.findUnique({ where: { token: refreshToken } })
    if (!storedToken || storedToken.user_id !== userId) {
      throw new HttpError(401, 'Invalid refresh token')
    }
    if (storedToken.revoked) {
      throw new HttpError(401, 'Token revoked')
    }
    if (storedToken.expires < new Date()) {
      throw new HttpError(401, 'Refresh token expired')
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new HttpError(401, 'User not found')
    }
    if (user.status !== 'ACTIVE') {
      throw new HttpError(403, 'Account not allowed to refresh token')
    }

    await prisma.refreshTokens.update({ where: { token: refreshToken }, data: { revoked: true } })
    return issueTokens(user.id)
  },

  logoutUser: async ({ refreshToken }: LogoutInput) => {
    const tokenRecord = await prisma.refreshTokens.findUnique({ where: { token: refreshToken } })
    if (!tokenRecord) {
      throw new HttpError(401, 'Invalid token')
    }
    if (tokenRecord.revoked) {
      return { message: 'Already logged out' }
    }

    await prisma.refreshTokens.update({ where: { token: refreshToken }, data: { revoked: true } })
    return { message: 'Logged out successfully' }
  },

  getCurrentUser: async (userId: string): Promise<SafeUser> => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: safeUserSelect })
    if (!user) {
      throw new HttpError(404, 'User not found')
    }
    return user
  },

  updateProfile: async ({ userId, data }: UpdateProfileParams): Promise<SafeUser> => {
    const emailOwner = await prisma.user.findUnique({ where: { email: data.email } })
    if (emailOwner && emailOwner.id !== userId) {
      throw new HttpError(409, 'Another account already uses this email')
    }

    return prisma.user.update({
      where: { id: userId },
      data: { first_name: data.first_name, last_name: data.last_name, email: data.email },
      select: safeUserSelect,
    })
  },

  // A new password logs out every other device: all refresh tokens are revoked and this one gets a fresh pair
  changePassword: async ({ userId, data }: ChangePasswordParams): Promise<AuthTokens> => {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new HttpError(404, 'User not found')
    }

    const isMatch = await bcrypt.compare(data.current_password, user.password_hash)
    if (!isMatch) {
      throw new HttpError(400, 'Your current password isn’t right')
    }
    if (data.current_password === data.new_password) {
      throw new HttpError(400, 'Choose a password you haven’t used here')
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { password_hash: await bcrypt.hash(data.new_password, SALT_ROUNDS) } }),
      prisma.refreshTokens.updateMany({ where: { user_id: userId, revoked: false }, data: { revoked: true } }),
    ])

    return issueTokens(userId)
  },
}
