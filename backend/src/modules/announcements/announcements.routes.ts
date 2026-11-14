import { Router } from 'express'
import { MEMBER_ROLES } from '@shigjetademy/shared/auth'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requireMembership } from '@shared/middleware/membershipMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { organizationIdParamSchema } from '@modules/organization/organization.schema.ts'
import { AnnouncementController } from './announcements.controller.ts'
import { announcementParamSchema, createAnnouncementSchema, updateAnnouncementSchema } from './announcements.schema.ts'

// Mounted at /api/organizations. Every member reads the announcements addressed to them; the owner, admins and lecturers write them. Who may address
// whom, and which announcements a lecturer manages, is decided by the service.
const router = Router()

const ANNOUNCEMENTS = '/:organizationId/announcements'
const ANNOUNCEMENT = `${ANNOUNCEMENTS}/:announcementId`

const isMember = requireMembership([...MEMBER_ROLES])
const canWrite = requireMembership(['OWNER', 'ADMIN', 'LECTURER'])
const organizationParam = validateRequestMiddleware(organizationIdParamSchema, 'params')
const announcementParam = validateRequestMiddleware(announcementParamSchema, 'params')

router.get(ANNOUNCEMENTS, authMiddleware, organizationParam, isMember, AnnouncementController.list)

router.get(`${ANNOUNCEMENTS}/unread-count`, authMiddleware, organizationParam, isMember, AnnouncementController.getUnreadCount)

router.get(`${ANNOUNCEMENTS}/audiences`, authMiddleware, organizationParam, canWrite, AnnouncementController.getAudienceOptions)

router.post(ANNOUNCEMENTS, authMiddleware, organizationParam, canWrite, validateRequestMiddleware(createAnnouncementSchema), AnnouncementController.create)

router.get(ANNOUNCEMENT, authMiddleware, announcementParam, isMember, AnnouncementController.get)

router.put(ANNOUNCEMENT, authMiddleware, announcementParam, canWrite, validateRequestMiddleware(updateAnnouncementSchema), AnnouncementController.update)

router.post(`${ANNOUNCEMENT}/archive`, authMiddleware, announcementParam, canWrite, AnnouncementController.archive)

export default router
