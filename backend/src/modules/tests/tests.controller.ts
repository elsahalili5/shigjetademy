import type { Response } from 'express'
import { sendError } from '@lib/httpError.ts'
import type { AuthRequest, TypedRequest } from '@lib/types.ts'
import type { SpaceViewer } from '@modules/groups/space-access.ts'
import type { OrganizationIdParam } from '@modules/organization/organization.types.ts'
import { TestService } from './tests.service.ts'
import type { CreateTestInput, RecordTestResultsInput, TestGroupQuery, TestParam, UpdateTestInput } from './tests.types.ts'

type OrganizationRequest = AuthRequest & TypedRequest<unknown, OrganizationIdParam>

type ListRequest = AuthRequest & TypedRequest<unknown, OrganizationIdParam, TestGroupQuery>

type CreateRequest = AuthRequest & TypedRequest<CreateTestInput, OrganizationIdParam>

type TestRequest = AuthRequest & TypedRequest<unknown, TestParam>

type UpdateRequest = AuthRequest & TypedRequest<UpdateTestInput, TestParam>

type RecordRequest = AuthRequest & TypedRequest<RecordTestResultsInput, TestParam>

/** The caller's seat in the organization of the path; the route already checked they may use tests there */
const findViewer = (req: AuthRequest): SpaceViewer | null => {
  const membership = req.user?.memberships.find((item) => item.organization.id === req.params.organizationId)
  if (!req.user || !membership) return null
  return { membershipId: membership.id, userId: req.user.id, role: membership.role }
}

export const TestController = {
  listGroups: async (req: OrganizationRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const groups = await TestService.listGroups({ organizationId: req.params.organizationId, viewer })
      return res.status(200).json({ data: groups })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch your groups' })
    }
  },

  list: async (req: ListRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const tests = await TestService.list({ organizationId: req.params.organizationId, viewer, groupId: req.query.group_id })
      return res.status(200).json({ data: tests })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the tests' })
    }
  },

  create: async (req: CreateRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const test = await TestService.create({ organizationId: req.params.organizationId, viewer, data: req.body })
      return res.status(201).json({ data: test })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to set the test' })
    }
  },

  update: async (req: UpdateRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const test = await TestService.update({ ...req.params, viewer, data: req.body })
      return res.status(200).json({ data: test })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to save the test' })
    }
  },

  remove: async (req: TestRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const removed = await TestService.remove({ ...req.params, viewer })
      return res.status(200).json({ data: removed })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to remove the test' })
    }
  },

  getSheet: async (req: TestRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const sheet = await TestService.getSheet({ ...req.params, viewer })
      return res.status(200).json({ data: sheet })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch the test' })
    }
  },

  recordResults: async (req: RecordRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const sheet = await TestService.recordResults({ ...req.params, viewer, data: req.body })
      return res.status(200).json({ data: sheet })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to save the results' })
    }
  },

  listMine: async (req: OrganizationRequest, res: Response) => {
    try {
      const viewer = findViewer(req)
      if (!viewer) return res.status(401).json({ error: 'Unauthorized' })
      const tests = await TestService.listMine({ organizationId: req.params.organizationId, viewer })
      return res.status(200).json({ data: tests })
    } catch (error) {
      return sendError({ res, error, fallback: 'Failed to fetch your tests' })
    }
  },
}
