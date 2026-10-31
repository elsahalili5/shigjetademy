import { Router } from 'express'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { InvitationController } from './invitations.controller.ts'

// Mounted at /api/invitations. Anyone with the link reads it; accepting needs a login.
const router = Router()

router.get('/:token', InvitationController.previewInvitation)

router.post('/:token/accept', authMiddleware, InvitationController.acceptInvitation)

export default router
