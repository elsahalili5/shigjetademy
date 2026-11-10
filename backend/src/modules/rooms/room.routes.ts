import { Router } from 'express'
import { authMiddleware } from '@shared/middleware/authMiddleware.ts'
import { requireMembership } from '@shared/middleware/membershipMiddleware.ts'
import { validateRequestMiddleware } from '@shared/middleware/validateRequest.middleware.ts'
import { organizationIdParamSchema } from '@modules/organization/organization.schema.ts'
import { RoomController } from './room.controller.ts'
import { locationRoomsParamSchema, roomParamSchema, roomSchema } from './room.schema.ts'

// Mounted at /api/organizations. School admins read rooms; only the owner changes them.
const router = Router()

router.get(
  '/:organizationId/rooms',
  authMiddleware,
  validateRequestMiddleware(organizationIdParamSchema, 'params'),
  requireMembership(['OWNER', 'ADMIN']),
  RoomController.listOrganizationRooms,
)

router.get(
  '/:organizationId/locations/:locationId/rooms',
  authMiddleware,
  validateRequestMiddleware(locationRoomsParamSchema, 'params'),
  requireMembership(['OWNER', 'ADMIN']),
  RoomController.listRooms,
)

router.post(
  '/:organizationId/locations/:locationId/rooms',
  authMiddleware,
  validateRequestMiddleware(locationRoomsParamSchema, 'params'),
  requireMembership(['OWNER']),
  validateRequestMiddleware(roomSchema),
  RoomController.createRoom,
)

router.put(
  '/:organizationId/locations/:locationId/rooms/:roomId',
  authMiddleware,
  validateRequestMiddleware(roomParamSchema, 'params'),
  requireMembership(['OWNER']),
  validateRequestMiddleware(roomSchema),
  RoomController.updateRoom,
)

router.delete(
  '/:organizationId/locations/:locationId/rooms/:roomId',
  authMiddleware,
  validateRequestMiddleware(roomParamSchema, 'params'),
  requireMembership(['OWNER']),
  RoomController.removeRoom,
)

export default router
