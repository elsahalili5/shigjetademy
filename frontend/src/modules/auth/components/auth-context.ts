import { createContext } from 'react'
import type { AuthUser, LoginUserResponse, RoleType } from '@shigjetademy/shared/auth'

export const ME_QUERY_KEY = ['auth', 'me'] as const

export type AuthContextValue =
  | { status: 'anonymous'; user: null; setSession: (session: LoginUserResponse) => void; logout: () => Promise<void>; hasRole: (role: RoleType) => boolean }
  | { status: 'authenticated'; user: AuthUser; setSession: (session: LoginUserResponse) => void; logout: () => Promise<void>; hasRole: (role: RoleType) => boolean }

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
