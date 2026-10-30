import { apiClient } from '#/api/client'
import type {
  AuthTokens,
  AuthUser,
  ChangePasswordInput,
  LoginUserInput,
  LoginUserResponse,
  LogoutInput,
  RegisterUserInput,
  RegisterUserResponse,
  UpdateProfileInput,
} from '@shigjetademy/shared/auth'

export const authApi = {
  login: (payload: LoginUserInput) => apiClient.post<LoginUserResponse, LoginUserInput>('/auth/login', payload),
  register: (payload: RegisterUserInput) => apiClient.post<RegisterUserResponse, RegisterUserInput>('/auth/register', payload),
  me: () => apiClient.get<AuthUser>('/auth/me'),
  updateProfile: (payload: UpdateProfileInput) => apiClient.put<AuthUser, UpdateProfileInput>('/auth/me', payload),
  changePassword: (payload: ChangePasswordInput) => apiClient.post<AuthTokens, ChangePasswordInput>('/auth/change-password', payload),
  logout: (refreshToken: string) => apiClient.post<unknown, LogoutInput>('/auth/logout', { refreshToken }),
}
