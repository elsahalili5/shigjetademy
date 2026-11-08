import { Router } from 'express'
import { hasOrganizationPermission } from '@shigjetademy/shared/auth'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requireOrganizationAccess } from '@shared/middleware/membershipMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { studentRosterParamSchema } from '@modules/student-roster/student-roster.schema.ts'
import { createStudentNoteSchema } from './student-notes.schema.ts'
import { StudentNoteController } from './student-notes.controller.ts'

// Mounted at /api/organizations, nested under the student roster's own student path. Same access as the roster's detail endpoint:
// the owner and admins with MANAGE_COURSES reach every student's notes; a lecturer only those of a group they currently teach, which the service checks.
const router = Router()

const NOTES = '/:organizationId/my-students/:studentId/notes'

const canUseStudentNotes = requireOrganizationAccess({ isAllowed: (membership) => membership.role === 'LECTURER' || hasOrganizationPermission({ membership, permission: 'MANAGE_COURSES' }) })

router.get(NOTES, authMiddleware, validateRequestMiddleware(studentRosterParamSchema, 'params'), canUseStudentNotes, StudentNoteController.listNotes)

router.post(NOTES, authMiddleware, validateRequestMiddleware(studentRosterParamSchema, 'params'), canUseStudentNotes, validateRequestMiddleware(createStudentNoteSchema), StudentNoteController.writeNote)

export default router
