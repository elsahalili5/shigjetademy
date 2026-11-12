import { Router } from 'express'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requireMembership } from '@shared/middleware/membershipMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { organizationIdParamSchema } from '@modules/organization/organization.schema.ts'
import { ParentNotesController } from './parent-notes.controller.ts'
import { parentNoteSchema, parentNoteStudentParamSchema } from './parent-notes.schema.ts'

// Mounted at /api/organizations. Only the organization's lecturers write notes to the guardians of the students of the groups they currently teach,
// and each reads only the notes they sent themselves.
const router = Router()

const NOTES = '/:organizationId/parent-notes'
const STUDENT = `${NOTES}/students/:studentId`

const isLecturer = requireMembership(['LECTURER'])

router.get(`${NOTES}/groups`, authMiddleware, validateRequestMiddleware(organizationIdParamSchema, 'params'), isLecturer, ParentNotesController.listGroups)

router.get(`${NOTES}/conversations`, authMiddleware, validateRequestMiddleware(organizationIdParamSchema, 'params'), isLecturer, ParentNotesController.listConversations)

router.get(STUDENT, authMiddleware, validateRequestMiddleware(parentNoteStudentParamSchema, 'params'), isLecturer, ParentNotesController.getThread)

router.post(STUDENT, authMiddleware, validateRequestMiddleware(parentNoteStudentParamSchema, 'params'), isLecturer, validateRequestMiddleware(parentNoteSchema), ParentNotesController.sendNote)

export default router
