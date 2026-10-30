import type { Request, Response } from 'express'
import { ORGANIZATION_TYPES } from '@shigjetademy/shared'
import { DemoRequestService } from './demoRequest.service.ts'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_TEXT = 200
const MAX_MESSAGE = 2000

const isOrganizationType = (value: string) => (ORGANIZATION_TYPES as readonly string[]).includes(value)

export const DemoRequestController = {
  createDemoRequest: async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>
    const text = (key: string, max = MAX_TEXT) =>
      typeof body[key] === 'string' ? (body[key] as string).trim().slice(0, max) : ''
    const input = {
      name: text('name'),
      email: text('email'),
      organization: text('organization'),
      orgType: text('orgType'),
      size: text('size'),
      message: text('message', MAX_MESSAGE),
    }

    if (!input.name || !input.organization || !EMAIL_PATTERN.test(input.email)) {
      res.status(400).json({ error: 'Some details are missing or invalid.' })
      return
    }
    if (!isOrganizationType(input.orgType)) {
      res.status(400).json({ error: 'Choose a valid organization type.' })
      return
    }

    try {
      const result = await DemoRequestService.createDemoRequest(input)
      res.status(201).json(result)
    } catch (err) {
      console.error('Could not save demo request', err)
      res.status(500).json({ error: 'The server could not save your request.' })
    }
  },
}
