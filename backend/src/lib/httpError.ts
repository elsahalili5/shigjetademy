import type { Response } from 'express'

/** Messages per field, in the shape the validation middleware answers with, so forms show them under their inputs */
export type FieldErrors = Record<string, string[]>

/** An error a service throws on purpose, carrying the HTTP status the controller should answer with */
export class HttpError extends Error {
  readonly status: number
  readonly fieldErrors?: FieldErrors

  constructor(status: number, message: string, options: { fieldErrors?: FieldErrors } = {}) {
    super(message)
    this.status = status
    this.fieldErrors = options.fieldErrors
  }
}

type SendErrorParams = {
  res: Response
  error: unknown
  fallback: string
}

/** Answers with the HttpError's status, or logs the unknown error and answers 500 with the fallback message */
export const sendError = ({ res, error, fallback }: SendErrorParams) => {
  if (error instanceof HttpError) {
    const details = error.fieldErrors ? { details: { formErrors: [], fieldErrors: error.fieldErrors } } : {}
    return res.status(error.status).json({ error: error.message, ...details })
  }
  console.error(error)
  return res.status(500).json({ error: fallback })
}
