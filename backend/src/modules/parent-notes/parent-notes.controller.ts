import type { Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import type { OrganizationIdParam } from '@modules/organization/organization.types.ts'
import { ParentNotesService } from './parent-notes.service.ts'
import type { ParentNoteInput, ParentNoteStudentParam } from './parent-notes.types.ts'

type OrganizationRequest = AuthRequest & TypedRequest<unknown, OrganizationIdParam>

type StudentRequest = AuthRequest & TypedRequest<unknown, ParentNoteStudentParam>

type SendRequest = AuthRequest & TypedRequest<ParentNoteInput, ParentNoteStudentParam>

export const ParentNotesController = {
  listGroups: async (req: OrganizationRequest, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const groups = await ParentNotesService.listGroups({ organizationId: req.params.organizationId, userId })
      return res.status(200).json({ data: groups })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch your groups' })
    }
  },

  listConversations: async (req: OrganizationRequest, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const conversations = await ParentNotesService.listConversations({ organizationId: req.params.organizationId, userId })
      return res.status(200).json({ data: conversations })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch your conversations' })
    }
  },

  getThread: async (req: StudentRequest, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const thread = await ParentNotesService.getThread({ ...req.params, userId })
      return res.status(200).json({ data: thread })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch this conversation' })
    }
  },

  sendNote: async (req: SendRequest, res: Response) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const note = await ParentNotesService.sendNote({ ...req.params, userId, input: req.body })
      return res.status(201).json({ data: note })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to send the note' })
    }
  },
}
