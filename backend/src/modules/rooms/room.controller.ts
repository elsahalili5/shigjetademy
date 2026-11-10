import type { Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import type { OrganizationIdParam } from '@modules/organization/organization.types.ts'
import { RoomService } from './room.service.ts'
import type { LocationRoomsParam, RoomInput, RoomParam } from './room.types.ts'

type CreateRoomRequest = AuthRequest & TypedRequest<RoomInput, LocationRoomsParam>

type UpdateRoomRequest = AuthRequest & TypedRequest<RoomInput, RoomParam>

type RemoveRoomRequest = AuthRequest & TypedRequest<unknown, RoomParam>

export const RoomController = {
  listRooms: async (req: TypedRequest<unknown, LocationRoomsParam>, res: Response) => {
    try {
      const rooms = await RoomService.listRooms(req.params)
      return res.status(200).json({ data: rooms })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the rooms' })
    }
  },

  listOrganizationRooms: async (req: TypedRequest<unknown, OrganizationIdParam>, res: Response) => {
    try {
      const rooms = await RoomService.listOrganizationRooms(req.params.organizationId)
      return res.status(200).json({ data: rooms })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the rooms' })
    }
  },

  createRoom: async (req: CreateRoomRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const room = await RoomService.createRoom({ ...req.params, actorId, data: req.body })
      return res.status(201).json({ data: room })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to add the room' })
    }
  },

  updateRoom: async (req: UpdateRoomRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const room = await RoomService.updateRoom({ ...req.params, actorId, data: req.body })
      return res.status(200).json({ data: room })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to save the room' })
    }
  },

  removeRoom: async (req: RemoveRoomRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      await RoomService.removeRoom({ ...req.params, actorId })
      return res.status(200).json({ message: 'Room removed' })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to remove the room' })
    }
  },
}
