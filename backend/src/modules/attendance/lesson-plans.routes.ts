import { Router } from 'express'
import { hasOrganizationPermission } from '@shigjetademy/shared/auth'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requireOrganizationAccess } from '@shared/middleware/membershipMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { organizationIdParamSchema } from '@modules/organization/organization.schema.ts'
import { LessonPlanController } from './lesson-plans.controller.ts'
import { lessonPlanCoveredSchema, lessonPlanGroupParamSchema, lessonPlanParamSchema, lessonPlanSessionsQuerySchema, lessonPlanTopicSchema } from './lesson-plans.schema.ts'

// Mounted at /api/organizations. The owner and admins with MANAGE_COURSES reach every group's plans; a lecturer only the sessions they teach,
// which the service checks. A plan is one session, addressed by its date and start time ('HH:MM'), the same identity attendance uses.
const router = Router()

const SESSIONS = '/:organizationId/lesson-plans/sessions'
const GROUP_PLANS = '/:organizationId/groups/:groupId/lesson-plans'
const PLAN = `${GROUP_PLANS}/:date/:startTime`

const canUseLessonPlans = requireOrganizationAccess({ isAllowed: (membership) => membership.role === 'LECTURER' || hasOrganizationPermission({ membership, permission: 'MANAGE_COURSES' }) })

router.get(SESSIONS, authMiddleware, validateRequestMiddleware(organizationIdParamSchema, 'params'), canUseLessonPlans, validateRequestMiddleware(lessonPlanSessionsQuerySchema, 'query'), LessonPlanController.listSessions)

router.get(GROUP_PLANS, authMiddleware, validateRequestMiddleware(lessonPlanGroupParamSchema, 'params'), canUseLessonPlans, LessonPlanController.listGroupPlans)

router.get(PLAN, authMiddleware, validateRequestMiddleware(lessonPlanParamSchema, 'params'), canUseLessonPlans, LessonPlanController.getPlan)

router.put(`${PLAN}/topic`, authMiddleware, validateRequestMiddleware(lessonPlanParamSchema, 'params'), canUseLessonPlans, validateRequestMiddleware(lessonPlanTopicSchema), LessonPlanController.writeTopic)

router.put(`${PLAN}/covered`, authMiddleware, validateRequestMiddleware(lessonPlanParamSchema, 'params'), canUseLessonPlans, validateRequestMiddleware(lessonPlanCoveredSchema), LessonPlanController.writeCovered)

export default router
