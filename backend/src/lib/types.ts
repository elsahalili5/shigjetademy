import type { Request } from 'express'
import type { Prisma } from '@generated/prisma/client.ts'
import type { safeUserSelect } from './constants.ts'

export type SafeUser = Prisma.UserGetPayload<{ select: typeof safeUserSelect }>

export interface AuthRequest extends Request {
  user?: SafeUser
}

export type TypedRequest<Body = unknown, Params = Record<string, string>, Query = unknown> = Request<Params, unknown, Body, Query>
