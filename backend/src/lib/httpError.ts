import type { Response } from 'express'

/** An error a service throws on purpose, carrying the HTTP status the controller should answer with */
export class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
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
    return res.status(error.status).json({ error: error.message })
  }
  console.error(error)
  return res.status(500).json({ error: fallback })
}
