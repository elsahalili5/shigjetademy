import type { SafeUser } from '@lib/types.ts'
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
  user: SafeUser
}

export type RegisterUserResponse = LoginUserResponse
