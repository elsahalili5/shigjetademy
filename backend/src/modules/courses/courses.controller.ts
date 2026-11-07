import type { Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import type { OrganizationIdParam } from '@modules/organization/organization.types.ts'
import { CourseService } from './courses.service.ts'
import { listCoursesQuerySchema } from './courses.schema.ts'
import type { CourseInput, CourseParam } from './courses.types.ts'

type CreateCourseRequest = AuthRequest & TypedRequest<CourseInput, OrganizationIdParam>

type UpdateCourseRequest = AuthRequest & TypedRequest<CourseInput, CourseParam>

type CourseRequest = AuthRequest & TypedRequest<unknown, CourseParam>

export const CourseController = {
  listCourses: async (req: TypedRequest<unknown, OrganizationIdParam>, res: Response) => {
    try {
      // The route already answered 400 for a bad query; parsing again types the coerced values
      const page = await CourseService.listCourses({ organizationId: req.params.organizationId, query: listCoursesQuerySchema.parse(req.query) })
      return res.status(200).json({ data: page })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch courses' })
    }
  },

  listCourseOptions: async (req: TypedRequest<unknown, OrganizationIdParam>, res: Response) => {
    try {
      const options = await CourseService.listCourseOptions(req.params.organizationId)
      return res.status(200).json({ data: options })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch courses' })
    }
  },

  getCourse: async (req: CourseRequest, res: Response) => {
    try {
      const course = await CourseService.getCourse(req.params)
      return res.status(200).json({ data: course })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the course' })
    }
  },

  createCourse: async (req: CreateCourseRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const course = await CourseService.createCourse({ organizationId: req.params.organizationId, actorId, data: req.body })
      return res.status(201).json({ data: course })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to add the course' })
    }
  },

  updateCourse: async (req: UpdateCourseRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const course = await CourseService.updateCourse({ ...req.params, actorId, data: req.body })
      return res.status(200).json({ data: course })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to save the course' })
    }
  },

  archiveCourse: async (req: CourseRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const course = await CourseService.setCourseStatus({ ...req.params, actorId, status: 'ARCHIVED' })
      return res.status(200).json({ data: course })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to archive the course' })
    }
  },

  restoreCourse: async (req: CourseRequest, res: Response) => {
    try {
      const actorId = req.user?.id
      if (!actorId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const course = await CourseService.setCourseStatus({ ...req.params, actorId, status: 'ACTIVE' })
      return res.status(200).json({ data: course })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to restore the course' })
    }
  },
}
