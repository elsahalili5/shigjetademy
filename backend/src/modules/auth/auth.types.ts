import type { SessionUser } from '@lib/session-user.ts'
import type { AuthTokens } from '@shigjetademy/shared/auth'

export type {
  AuthTokens,
  ChangePasswordInput,
  LoginUserInput,
  LogoutInput,
  RefreshTokenInput,
  RefreshTokenResponse,
  RegisterUserInput,
  UpdateProfileInput,
} from '@shigjetademy/shared/auth'

export type LoginUserResponse = AuthTokens & {
  user: SessionUser
}

export type RegisterUserResponse = LoginUserResponse
