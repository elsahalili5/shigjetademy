import type { Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import type { OrganizationIdParam } from '@modules/organization/organization.types.ts'
import { StudentService } from './students.service.ts'
import { listStudentsQuerySchema } from './students.schema.ts'
import type { CreateStudentInput, StudentParam, UpdateStudentInput } from './students.types.ts'

type CreateStudentRequest = AuthRequest & TypedRequest<CreateStudentInput, OrganizationIdParam>

type UpdateStudentRequest = AuthRequest & TypedRequest<UpdateStudentInput, StudentParam>

type StudentRequest = AuthRequest & TypedRequest<unknown, StudentParam>

export const StudentController = {
  listStudents: async (req: TypedRequest<unknown, OrganizationIdParam>, res: Response) => {
    try {
      // The route already answered 400 for a bad query; parsing again types the coerced values
      const page = await StudentService.listStudents({ organizationId: req.params.organizationId, query: listStudentsQuerySchema.parse(req.query) })
      return res.status(200).json({ data: page })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch students' })
    }
  },

  getStudent: async (req: StudentRequest, res: Response) => {
    try {
      const student = await StudentService.getStudent(req.params)
      return res.status(200).json({ data: student })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the student' })
    }
  },

  createStudent: async (req: CreateStudentRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const student = await StudentService.createStudent({ organizationId: req.params.organizationId, actorId, data: req.body })
      return res.status(201).json({ data: student })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to add the student' })
    }
  },

  updateStudent: async (req: UpdateStudentRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const student = await StudentService.updateStudent({ ...req.params, actorId, data: req.body })
      return res.status(200).json({ data: student })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to save the student' })
    }
  },

  archiveStudent: async (req: StudentRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const student = await StudentService.setStudentStatus({ ...req.params, actorId, status: 'ARCHIVED' })
      return res.status(200).json({ data: student })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to archive the student' })
    }
  },

  restoreStudent: async (req: StudentRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const student = await StudentService.setStudentStatus({ ...req.params, actorId, status: 'ACTIVE' })
      return res.status(200).json({ data: student })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to restore the student' })
    }
  },
}
