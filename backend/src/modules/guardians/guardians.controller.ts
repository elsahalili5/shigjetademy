import type { Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import type { StudentParam } from '@modules/students/students.types.ts'
import { GuardianService } from './guardians.service.ts'
import type { GuardianInput, StudentGuardianParam } from './guardians.types.ts'

type StudentGuardiansRequest = AuthRequest & TypedRequest<unknown, StudentParam>

type AddGuardianRequest = AuthRequest & TypedRequest<GuardianInput, StudentParam>

type UpdateGuardianRequest = AuthRequest & TypedRequest<GuardianInput, StudentGuardianParam>

type StudentGuardianRequest = AuthRequest & TypedRequest<unknown, StudentGuardianParam>

export const GuardianController = {
  listStudentGuardians: async (req: StudentGuardiansRequest, res: Response) => {
    try {
      const guardians = await GuardianService.listStudentGuardians(req.params)
      return res.status(200).json({ data: guardians })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the guardians' })
    }
  },

  addStudentGuardian: async (req: AddGuardianRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const guardian = await GuardianService.addStudentGuardian({ ...req.params, actorId, data: req.body })
      return res.status(201).json({ data: guardian })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to add the guardian' })
    }
  },

  updateStudentGuardian: async (req: UpdateGuardianRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const guardian = await GuardianService.updateStudentGuardian({ ...req.params, actorId, data: req.body })
      return res.status(200).json({ data: guardian })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to save the guardian' })
    }
  },

  unlinkStudentGuardian: async (req: StudentGuardianRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      await GuardianService.unlinkStudentGuardian({ ...req.params, actorId })
      return res.status(204).send()
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to unlink the guardian' })
    }
  },
}
