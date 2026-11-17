import { Router } from 'express'
import { hasOrganizationPermission } from '@shigjetademy/shared/auth'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requireOrganizationAccess } from '@shared/middleware/membershipMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { organizationIdParamSchema } from '@modules/organization/organization.schema.ts'
import { AssignmentController } from './assignments.controller.ts'
import { assignmentGroupQuerySchema, assignmentParamSchema, markHandInSchema, submissionParamSchema } from './assignments.schema.ts'

// Mounted at /api/organizations. The owner, admins with MANAGE_GRADES, lecturers and students use assignments; guardians and other admins don't.
// Which groups a person reaches, and what they may do there, is decided by the service.
const router = Router()

const ASSIGNMENTS = '/:organizationId/assignments'
const ASSIGNMENT = `${ASSIGNMENTS}/:assignmentId`

const usesAssignments = requireOrganizationAccess({
  isAllowed: (membership) => membership.role === 'LECTURER' || membership.role === 'STUDENT' || hasOrganizationPermission({ membership, permission: 'MANAGE_GRADES' }),
})
const organizationParam = validateRequestMiddleware(organizationIdParamSchema, 'params')
const assignmentParam = validateRequestMiddleware(assignmentParamSchema, 'params')

router.get(`${ASSIGNMENTS}/groups`, authMiddleware, organizationParam, usesAssignments, AssignmentController.listGroups)

// A student's assignments across all their groups, with their own hand-ins
router.get(`${ASSIGNMENTS}/mine`, authMiddleware, organizationParam, usesAssignments, AssignmentController.listMine)

router.get(ASSIGNMENTS, authMiddleware, organizationParam, usesAssignments, validateRequestMiddleware(assignmentGroupQuerySchema, 'query'), AssignmentController.list)

// Multipart: the fields and an optional file, checked once the file is read
router.post(ASSIGNMENTS, authMiddleware, organizationParam, usesAssignments, AssignmentController.create)

// For the group's setters: the assignment with every student's hand-in
router.get(ASSIGNMENT, authMiddleware, assignmentParam, usesAssignments, AssignmentController.getDetail)

router.put(ASSIGNMENT, authMiddleware, assignmentParam, usesAssignments, AssignmentController.update)

// Deletes the row, its hand-ins and their stored files
router.delete(ASSIGNMENT, authMiddleware, assignmentParam, usesAssignments, AssignmentController.remove)

router.get(`${ASSIGNMENT}/download`, authMiddleware, assignmentParam, usesAssignments, AssignmentController.download)

// Multipart: the student's text and an optional file, replacing their hand-in until it is marked
router.put(`${ASSIGNMENT}/submission`, authMiddleware, assignmentParam, usesAssignments, AssignmentController.handIn)

const submissionParam = validateRequestMiddleware(submissionParamSchema, 'params')

// For the group's setters and the student who handed it in
router.get(`${ASSIGNMENT}/submissions/:submissionId/download`, authMiddleware, submissionParam, usesAssignments, AssignmentController.downloadHandIn)

// Points and feedback, shown to the student as soon as they are saved
router.put(`${ASSIGNMENT}/submissions/:submissionId/mark`, authMiddleware, submissionParam, usesAssignments, validateRequestMiddleware(markHandInSchema), AssignmentController.mark)

export default router
