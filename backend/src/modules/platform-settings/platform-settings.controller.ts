import type { Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import { PlatformSettingsService } from './platform-settings.service.ts'
import type { UpdatePlatformSettingsInput } from './platform-settings.types.ts'

type UpdateSettingsRequest = AuthRequest & TypedRequest<UpdatePlatformSettingsInput>

export const PlatformSettingsController = {
  getSettings: async (_req: TypedRequest, res: Response) => {
    try {
      const settings = await PlatformSettingsService.getSettings()
      return res.status(200).json({ data: settings })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the platform settings' })
    }
  },

  updateSettings: async (req: UpdateSettingsRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const settings = await PlatformSettingsService.updateSettings({ actorId, data: req.body })
      return res.status(200).json({ data: settings })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to save the platform settings' })
    }
  },
}
