import type { Response } from 'express'
import { z } from 'zod'
import { HttpError, sendError } from '@lib/httpError.ts'
import type { FieldErrors } from '@lib/httpError.ts'
import { sendStoredFile, toStoredUpload } from '@lib/private-files.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import type { SpaceViewer } from '@modules/groups/space-access.ts'
import type { OrganizationIdParam } from '@modules/organization/organization.types.ts'
import { assignmentFiles, runAssignmentUpload } from './assignment-files.ts'
import { createAssignmentSchema, handInSchema, updateAssignmentSchema } from './assignments.schema.ts'
import { AssignmentService } from './assignments.service.ts'
import type { AssignmentGroupQuery, AssignmentParam, MarkHandInInput, SubmissionParam } from './assignments.types.ts'

type OrganizationRequest = AuthRequest & TypedRequest<unknown, OrganizationIdParam>

type ListRequest = AuthRequest & TypedRequest<unknown, OrganizationIdParam, AssignmentGroupQuery>

type AssignmentRequest = AuthRequest & TypedRequest<unknown, AssignmentParam>

type SubmissionRequest = AuthRequest & TypedRequest<unknown, SubmissionParam>

type MarkRequest = AuthRequest & TypedRequest<MarkHandInInput, SubmissionParam>

type ParseFieldsParams<TSchema extends z.ZodType> = {
  schema: TSchema
  body: unknown
}

/** The fields beside the file, checked like the validation middleware checks a JSON body */
const parseFields = <TSchema extends z.ZodType>({ schema, body }: ParseFieldsParams<TSchema>): z.output<TSchema> => {
  const result = schema.safeParse(body)
  if (result.success) return result.data
  const fieldErrors: FieldErrors = {}
  for (const [field, messages] of Object.entries(z.flattenError(result.error).fieldErrors)) {
    if (Array.isArray(messages)) fieldErrors[field] = messages
  }
  throw new HttpError(400, 'Validation failed', { fieldErrors })
}

/** The caller's seat in the organization of the path; the route already checked they may use assignments there */
const findViewer = (req: AuthRequest): SpaceViewer | null => {
  const membership = req.user?.memberships.find((item) => item.organization.id === req.params.organizationId)
  if (!req.user || !membership) return null
  return { membershipId: membership.id, userId: req.user.id, role: membership.role }
}

type SaveUpload<TResult> = (file: ReturnType<typeof toStoredUpload> | null) => Promise<TResult>

/** Reads the multipart form, then saves it; a refused save takes its stored file away again */
const withUpload = async <TResult>({ req, res, save }: { req: AuthRequest; res: Response; save: SaveUpload<TResult> }) => {
  await runAssignmentUpload(req, res)
  const file = req.file
  try {
    return await save(file ? toStoredUpload(file) : null)
  } catch (error) {
    if (file) await assignmentFiles.removeRefused(file.filename)
    throw error
  }
}

export const AssignmentController = {
  listGroups: async (req: OrganizationRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const groups = await AssignmentService.listGroups({ organizationId: req.params.organizationId, viewer })
      return res.status(200).json({ data: groups })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch your groups' })
    }
  },

  list: async (req: ListRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const assignments = await AssignmentService.list({ organizationId: req.params.organizationId, viewer, groupId: req.query.group_id })
      return res.status(200).json({ data: assignments })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the assignments' })
    }
  },

  create: async (req: OrganizationRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      // Students hand in instead, so their form is refused before anything is written to disk
      AssignmentService.requireSetter(viewer)
      const assignment = await withUpload({
        req,
        res,
        save: (file) => AssignmentService.create({ organizationId: req.params.organizationId, viewer, data: parseFields({ schema: createAssignmentSchema, body: req.body }), file }),
      })
      return res.status(201).json({ data: assignment })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to set the assignment' })
    }
  },

  update: async (req: AssignmentRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      AssignmentService.requireSetter(viewer)
      const assignment = await withUpload({ req, res, save: (file) => AssignmentService.update({ ...req.params, viewer, data: parseFields({ schema: updateAssignmentSchema, body: req.body }), file }) })
      return res.status(200).json({ data: assignment })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to save the assignment' })
    }
  },

  remove: async (req: AssignmentRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const removed = await AssignmentService.remove({ ...req.params, viewer })
      return res.status(200).json({ data: removed })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to remove the assignment' })
    }
  },

  getDetail: async (req: AssignmentRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const assignment = await AssignmentService.getDetail({ ...req.params, viewer })
      return res.status(200).json({ data: assignment })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the assignment' })
    }
  },

  downloadHandIn: async (req: SubmissionRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const file = await AssignmentService.getHandInFile({ ...req.params, viewer })
      return sendStoredFile({ res, file, fallback: 'Failed to download the file' })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to download the file' })
    }
  },

  mark: async (req: MarkRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const row = await AssignmentService.mark({ ...req.params, viewer, data: req.body })
      return res.status(200).json({ data: row })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to save the mark' })
    }
  },

  listMine: async (req: OrganizationRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const assignments = await AssignmentService.listMine({ organizationId: req.params.organizationId, viewer })
      return res.status(200).json({ data: assignments })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch your assignments' })
    }
  },

  handIn: async (req: AssignmentRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      // Lecturers and staff set instead, so their form is refused before anything is written to disk
      AssignmentService.requireStudent(viewer)
      const assignment = await withUpload({ req, res, save: (file) => AssignmentService.handIn({ ...req.params, viewer, data: parseFields({ schema: handInSchema, body: req.body }), file }) })
      return res.status(200).json({ data: assignment })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to hand in' })
    }
  },

  download: async (req: AssignmentRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const file = await AssignmentService.getFile({ ...req.params, viewer })
      return sendStoredFile({ res, file, fallback: 'Failed to download the file' })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to download the file' })
    }
  },
}
