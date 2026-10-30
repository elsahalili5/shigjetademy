import type { NextFunction, Request, Response } from 'express'
import { z } from 'zod'

type RequestPart = 'body' | 'params' | 'query'

export const validateRequestMiddleware =
  (schema: z.ZodType, source: RequestPart = 'body') =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source])

    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: z.flattenError(result.error),
      })
    }

    // Express 5 exposes params and query as getters, so swap in the parsed values by defining them
    Object.defineProperty(req, source, { value: result.data, writable: true, configurable: true })
    next()
  }
