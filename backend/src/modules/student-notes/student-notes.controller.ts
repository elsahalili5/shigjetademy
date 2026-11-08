import type { Response } from 'express'
import { hasOrganizationPermission } from '@shigjetademy/shared/auth'
import type { CreateStudentNoteInput } from '@shigjetademy/shared/student-notes'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import type { StudentRosterParam } from '@modules/student-roster/student-roster.types.ts'
import { StudentNoteService } from './student-notes.service.ts'

type ListRequest = AuthRequest & TypedRequest<unknown, StudentRosterParam>

type WriteRequest = AuthRequest & TypedRequest<CreateStudentNoteInput, StudentRosterParam>

/** Who is asking, and whether they manage courses in the organization in the path; the route already let them through */
const getViewer = (req: ListRequest | WriteRequest) => {
  const user = req.user
  if (!user) return null
  const membership = user.memberships.find((item) => item.organization.id === req.params.organizationId)
  return { userId: user.id, isManager: !!membership && hasOrganizationPermission({ membership, permission: 'MANAGE_COURSES' }) }
}

export const StudentNoteController = {
  listNotes: async (req: ListRequest, res: Response) => {
    try {
      const viewer = getViewer(req)
      if (!viewer) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const notes = await StudentNoteService.listNotes({ organizationId: req.params.organizationId, viewer, studentId: req.params.studentId })
      return res.status(200).json({ data: notes })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch this student’s notes' })
    }
  },

  writeNote: async (req: WriteRequest, res: Response) => {
    try {
      const viewer = getViewer(req)
      if (!viewer) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const note = await StudentNoteService.writeNote({ organizationId: req.params.organizationId, viewer, studentId: req.params.studentId, groupId: req.body.group_id, body: req.body.body })
      return res.status(201).json({ data: note })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to save the note' })
    }
  },
}
