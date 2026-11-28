import bcrypt from 'bcrypt'
import type { Prisma } from '@generated/prisma/client.ts'
import { prisma } from '@lib/prisma.ts'
import { deleteAvatarFile, saveAvatarFile } from '@lib/avatar-storage.ts'
import { SALT_ROUNDS, safeUserSelect } from '@lib/constants.ts'
import { HttpError } from '@lib/httpError.ts'
import { generateAccessToken, generateRefreshToken, getRefreshExpiry, hashRefreshToken, REUSE_GRACE_MS, SESSION_MAX_MS, verifyRefreshToken } from '@lib/jwt.ts'
import { getMaintenanceRefusal } from '@lib/maintenance.ts'
import { toSessionUser } from '@lib/session-user.ts'
import type { SessionUser } from '@lib/session-user.ts'
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
const MINUTE_MS = 60 * 1000
const LOCKOUT_DURATION_MS = 15 * MINUTE_MS

// Whole minutes left on a lock, rounded up, so the message never says "0 minutes"
const lockedMessage = (lockedUntil: Date | null) => {
  const minutesLeft = lockedUntil ? Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / MINUTE_MS)) : LOCKOUT_DURATION_MS / MINUTE_MS
  return `Too many failed attempts. Try again in ${minutesLeft} ${minutesLeft === 1 ? 'minute' : 'minutes'}.`
}

type Session = {
  familyId: string
  startedAt: Date
}

type IssueTokensParams = {
  userId: string
  session: Session
  db?: Pick<Prisma.TransactionClient, 'refreshTokens'>
}

const startSession = (): Session => ({ familyId: crypto.randomUUID(), startedAt: new Date() })

const issueTokens = async ({ userId, session, db = prisma }: IssueTokensParams): Promise<AuthTokens> => {
  const expires = getRefreshExpiry({ now: new Date(), sessionStartedAt: session.startedAt })
  const accessToken = generateAccessToken(userId)
  const refreshToken = generateRefreshToken({ userId, expires })

  await db.refreshTokens.create({
    data: { user_id: userId, token: hashRefreshToken(refreshToken), expires, family_id: session.familyId, session_started_at: session.startedAt },
  })

  return { accessToken, refreshToken }
}

// Only expired rows go: a revoked row that has not expired is still needed to detect a replayed token
const deleteExpiredTokens = async () => {
  try {
    await prisma.refreshTokens.deleteMany({ where: { expires: { lt: new Date() } } })
  } catch (error) {
    console.error('Failed to delete expired refresh tokens', error)
  }
}

// One lock per user serializes rotation, logout, reuse revocation and password change, so a revoke can never
// miss a row that a rotation inserts a moment later. The lock is released when the transaction ends.
const withUserLock = <Result>(userId: string, run: (tx: Prisma.TransactionClient) => Promise<Result>) =>
  prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`
    return run(tx)
  })

const revokeFamily = ({ tx, familyId }: { tx: Prisma.TransactionClient; familyId: string }) =>
  tx.refreshTokens.updateMany({ where: { family_id: familyId, revoked: false }, data: { revoked: true, revoked_at: new Date() } })

// A refresh ends in new tokens or in the error to throw; the error is thrown after the commit so a revoke made on the way is kept
type RotationOutcome = { tokens: AuthTokens; error?: undefined } | { error: HttpError; tokens?: undefined }

type UpdateProfileParams = {
  userId: string
  data: UpdateProfileInput
}

type ChangePasswordParams = {
  userId: string
  data: ChangePasswordInput
}

type UploadAvatarParams = {
  userId: string
  mimeType: string
  buffer: Buffer
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

    return { user: toSessionUser(user), ...(await issueTokens({ userId: user.id, session: startSession() })) }
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
        throw new HttpError(403, lockedMessage(user.locked_until))
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

        // A lockout is a system event, so its log entry has no actor
        await prisma.$transaction([
          prisma.user.update({
            where: { id: user.id },
            data: {
              access_failed_count: failedCount,
              status: isLocking ? 'LOCKED' : user.status,
              locked_until: isLocking ? lockedUntil : null,
            },
          }),
          ...(isLocking ? [prisma.activityLog.create({ data: { action: 'ACCOUNT_LOCKED', target_user_id: user.id } })] : []),
        ])

        if (isLocking) {
          throw new HttpError(403, lockedMessage(lockedUntil))
        }
      }
      throw new HttpError(401, 'Invalid email or password')
    }

    if (user.access_failed_count !== 0) {
      await prisma.user.update({ where: { id: user.id }, data: { access_failed_count: 0 } })
    }

    const safeUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: safeUserSelect })
    const maintenanceMessage = await getMaintenanceRefusal(safeUser)
    if (maintenanceMessage) {
      throw new HttpError(503, maintenanceMessage)
    }
    await deleteExpiredTokens()
    return { user: toSessionUser(safeUser), ...(await issueTokens({ userId: user.id, session: startSession() })) }
  },

  // Each refresh token works once: it is revoked and replaced by a new pair
  refreshAccessToken: async ({ refreshToken }: RefreshTokenInput): Promise<RefreshTokenResponse> => {
    let userId: string
    try {
      userId = verifyRefreshToken(refreshToken)
    } catch {
      throw new HttpError(401, 'Invalid refresh token')
    }

    const outcome = await withUserLock(userId, async (tx): Promise<RotationOutcome> => {
      // Read again under the lock: a logout or a rotation may have run since the token was verified
      const storedToken = await tx.refreshTokens.findUnique({ where: { token: hashRefreshToken(refreshToken) } })
      if (!storedToken || storedToken.user_id !== userId) {
        return { error: new HttpError(401, 'Invalid refresh token') }
      }
      if (storedToken.revoked) {
        // The grace window runs from the fixed revoked_at, so replays never extend it
        const isRace = !!storedToken.revoked_at && Date.now() - storedToken.revoked_at.getTime() <= REUSE_GRACE_MS
        if (!isRace) {
          await revokeFamily({ tx, familyId: storedToken.family_id })
        }
        return { error: new HttpError(401, 'Token revoked') }
      }
      if (storedToken.expires < new Date()) {
        return { error: new HttpError(401, 'Refresh token expired') }
      }

      const user = await tx.user.findUnique({ where: { id: userId } })
      if (!user) {
        return { error: new HttpError(401, 'User not found') }
      }
      if (user.status !== 'ACTIVE') {
        return { error: new HttpError(403, 'Account not allowed to refresh token') }
      }

      if (Date.now() > storedToken.session_started_at.getTime() + SESSION_MAX_MS) {
        await revokeFamily({ tx, familyId: storedToken.family_id })
        return { error: new HttpError(401, 'Session expired') }
      }

      // The flip and the new row commit together, so a failed insert leaves the old token usable
      await tx.refreshTokens.update({ where: { id: storedToken.id }, data: { revoked: true, revoked_at: new Date() } })
      const tokens = await issueTokens({
        userId: user.id,
        session: { familyId: storedToken.family_id, startedAt: storedToken.session_started_at },
        db: tx,
      })
      return { tokens }
    })

    if (outcome.error) throw outcome.error
    return outcome.tokens
  },

  // The family is always revoked, even for a token that was already rotated: its live sibling must die too
  logoutUser: async ({ refreshToken }: LogoutInput) => {
    const tokenRecord = await prisma.refreshTokens.findUnique({ where: { token: hashRefreshToken(refreshToken) } })
    if (!tokenRecord) {
      throw new HttpError(401, 'Invalid token')
    }

    await withUserLock(tokenRecord.user_id, (tx) => revokeFamily({ tx, familyId: tokenRecord.family_id }))
    return { message: tokenRecord.revoked ? 'Already logged out' : 'Logged out successfully' }
  },

  getCurrentUser: async (userId: string): Promise<SessionUser> => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: safeUserSelect })
    if (!user) {
      throw new HttpError(404, 'User not found')
    }
    return toSessionUser(user)
  },

  updateProfile: async ({ userId, data }: UpdateProfileParams): Promise<SessionUser> => {
    const emailOwner = await prisma.user.findUnique({ where: { email: data.email } })
    if (emailOwner && emailOwner.id !== userId) {
      throw new HttpError(409, 'Another account already uses this email')
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { first_name: data.first_name, last_name: data.last_name, email: data.email },
      select: safeUserSelect,
    })
    return toSessionUser(user)
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

    const passwordHash = await bcrypt.hash(data.new_password, SALT_ROUNDS)
    await withUserLock(userId, async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { password_hash: passwordHash } })
      await tx.refreshTokens.updateMany({ where: { user_id: userId, revoked: false }, data: { revoked: true, revoked_at: new Date() } })
      await tx.activityLog.create({ data: { actor_id: userId, action: 'PASSWORD_CHANGED', target_user_id: userId } })
    })

    return issueTokens({ userId, session: startSession() })
  },

  // Replacing a photo removes the old file only once the DB points at the new one, so a failed update never
  // deletes a file the record still references and never orphans the just-saved file
  uploadAvatar: async ({ userId, mimeType, buffer }: UploadAvatarParams): Promise<SessionUser> => {
    const existing = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { avatar_url: true } })
    const avatarUrl = await saveAvatarFile({ userId, mimeType, buffer })

    const user = await prisma.user.update({ where: { id: userId }, data: { avatar_url: avatarUrl }, select: safeUserSelect })
    await deleteAvatarFile(existing.avatar_url)
    return toSessionUser(user)
  },

  removeAvatar: async (userId: string): Promise<SessionUser> => {
    const existing = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { avatar_url: true } })

    const user = await prisma.user.update({ where: { id: userId }, data: { avatar_url: null }, select: safeUserSelect })
    await deleteAvatarFile(existing.avatar_url)
    return toSessionUser(user)
  },
}
