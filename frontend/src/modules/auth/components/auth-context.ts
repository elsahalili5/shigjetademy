import { createContext } from 'react'
import type { AuthUser, LoginUserResponse } from '@shigjetademy/shared/auth'

type AuthActions = {
  setSession: (session: LoginUserResponse) => void
  logout: () => Promise<void>
}

export type AuthContextValue = AuthActions & ({ status: 'anonymous'; user: null } | { status: 'authenticated'; user: AuthUser })

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
