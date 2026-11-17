import type { Response } from 'express'
import { z } from 'zod'
import { HttpError, sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import type { SpaceViewer } from '@modules/groups/space-access.ts'
import type { OrganizationIdParam } from '@modules/organization/organization.types.ts'
import { sendStoredFile, toStoredUpload } from '@lib/private-files.ts'
import { materialFiles, runMaterialUpload } from './material-files.ts'
import { materialFileFieldsSchema } from './materials.schema.ts'
import { MaterialService } from './materials.service.ts'
import type { CreateMaterialInput, MaterialParam, MaterialSpaceInput, UpdateMaterialInput } from './materials.types.ts'

type OrganizationRequest = AuthRequest & TypedRequest<unknown, OrganizationIdParam>

type ListRequest = AuthRequest & TypedRequest<unknown, OrganizationIdParam, MaterialSpaceInput>

type CreateRequest = AuthRequest & TypedRequest<CreateMaterialInput, OrganizationIdParam>

type MaterialRequest = AuthRequest & TypedRequest<unknown, MaterialParam>

type UpdateRequest = AuthRequest & TypedRequest<UpdateMaterialInput, MaterialParam>

type UploadedFile = NonNullable<AuthRequest['file']>

/** The fields beside the file, checked like the validation middleware checks a JSON body */
const parseFileFields = (body: unknown) => {
  const result = materialFileFieldsSchema.safeParse(body)
  if (!result.success) throw new HttpError(400, 'Validation failed', { fieldErrors: z.flattenError(result.error).fieldErrors })
  return result.data
}

type ShareUploadParams = {
  req: OrganizationRequest
  viewer: SpaceViewer
  file: UploadedFile | undefined
}

/** Records the stored file as a material; a refused upload takes its file away again */
const shareUpload = async ({ req, viewer, file }: ShareUploadParams) => {
  try {
    if (!file) throw new HttpError(400, 'Choose a file to upload.')
    return await MaterialService.upload({ organizationId: req.params.organizationId, viewer, data: parseFileFields(req.body), file: toStoredUpload(file) })
  } catch (error) {
    if (file) await materialFiles.removeRefused(file.filename)
    throw error
  }
}

/** The caller's seat in the organization of the path; the route already checked they may use materials there */
const findViewer = (req: AuthRequest): SpaceViewer | null => {
  const membership = req.user?.memberships.find((item) => item.organization.id === req.params.organizationId)
  if (!req.user || !membership) return null
  return { membershipId: membership.id, userId: req.user.id, role: membership.role }
}

export const MaterialController = {
  listSpaces: async (req: OrganizationRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const spaces = await MaterialService.listSpaces({ organizationId: req.params.organizationId, viewer })
      return res.status(200).json({ data: spaces })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch your groups and courses' })
    }
  },

  list: async (req: ListRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const materials = await MaterialService.list({ organizationId: req.params.organizationId, viewer, space: req.query })
      return res.status(200).json({ data: materials })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the materials' })
    }
  },

  create: async (req: CreateRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const material = await MaterialService.create({ organizationId: req.params.organizationId, viewer, data: req.body })
      return res.status(201).json({ data: material })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to share the material' })
    }
  },

  upload: async (req: OrganizationRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      // Students only read, so their upload is refused before anything is written to disk
      MaterialService.requireSharer(viewer)
      await runMaterialUpload(req, res)
      const material = await shareUpload({ req, viewer, file: req.file })
      return res.status(201).json({ data: material })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to upload the file' })
    }
  },

  download: async (req: MaterialRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const file = await MaterialService.getFile({ ...req.params, viewer })
      return sendStoredFile({ res, file, fallback: 'Failed to download the file' })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to download the file' })
    }
  },

  update: async (req: UpdateRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const material = await MaterialService.update({ ...req.params, viewer, data: req.body })
      return res.status(200).json({ data: material })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to save the material' })
    }
  },

  remove: async (req: MaterialRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const removed = await MaterialService.remove({ ...req.params, viewer })
      return res.status(200).json({ data: removed })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to remove the material' })
    }
  },
}
