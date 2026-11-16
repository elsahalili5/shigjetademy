// Files, links and notes shared with a group or a course. Who reads a space is the same rule as discussions (see groups/space-access); the owner, admins with
// MANAGE_MATERIALS (checked by the route) and the lecturers of a space share in it, and students only read.
import type { Material, MaterialSpace } from '@shigjetademy/shared/materials'
import type { Prisma } from '@generated/prisma/client.ts'
import { HttpError } from '@lib/httpError.ts'
import { prisma } from '@lib/prisma.ts'
import { findViewerSpace, loadViewerSpaces, spaceSelect, toSpaceRef } from '@modules/groups/space-access.ts'
import type { SpaceViewer } from '@modules/groups/space-access.ts'
import { deleteMaterialFile, getMaterialFilePath } from './material-files.ts'
import type { CreateMaterialInput, MaterialFileFieldsInput, MaterialSpaceInput, UpdateMaterialInput } from './materials.types.ts'

/** A space lists this many materials at most, newest first; older ones stay stored */
const LIST_LIMIT = 500

const materialSelect = {
  id: true,
  ...spaceSelect,
  kind: true,
  title: true,
  description: true,
  section: true,
  url: true,
  body: true,
  file_name: true,
  file_type: true,
  file_size: true,
  created_at: true,
  updated_at: true,
  author_membership_id: true,
  author: { select: { user: { select: { first_name: true, last_name: true } } } },
} as const satisfies Prisma.MaterialSelect

type StoredMaterial = Prisma.MaterialGetPayload<{ select: typeof materialSelect }>

type ViewerScope = {
  organizationId: string
  viewer: SpaceViewer
}

type MaterialScope = ViewerScope & {
  materialId: string
}

/** A file multer already stored, under its generated key */
export type StoredUpload = {
  key: string
  name: string
  type: string
  size: number
}

const NOT_FOUND = 'Material not found'

/** An archived group or course is read-only: its materials stay readable, and nothing is added, changed or removed */
const isSpaceArchived = (material: StoredMaterial) => (material.space_kind === 'GROUP' ? material.group?.status === 'ARCHIVED' : material.course?.status === 'ARCHIVED')

const archivedMessage = (kind: MaterialSpaceInput['space_kind']) => (kind === 'GROUP' ? 'This group is archived, so it takes no new materials.' : 'This course is archived, so it takes no new materials.')

type ManagerCheck = {
  material: StoredMaterial
  viewer: SpaceViewer
  isStaff: boolean
}

/** The author and staff change and remove a material, unless its space is archived; other lecturers don't touch theirs */
const isManager = ({ material, viewer, isStaff }: ManagerCheck) => (isStaff || material.author_membership_id === viewer.membershipId) && !isSpaceArchived(material)

const toMaterial = ({ material, viewer, isStaff }: ManagerCheck): Material => ({
  id: material.id,
  space: toSpaceRef(material),
  kind: material.kind,
  title: material.title,
  description: material.description,
  section: material.section,
  url: material.url,
  body: material.body,
  file: material.kind === 'FILE' && material.file_name && material.file_type && material.file_size !== null ? { name: material.file_name, type: material.file_type, size: material.file_size } : null,
  author: { membership_id: material.author_membership_id, first_name: material.author.user.first_name, last_name: material.author.user.last_name },
  created_at: material.created_at.toISOString(),
  updated_at: material.updated_at.toISOString(),
  can_edit: isManager({ material, viewer, isStaff }),
  can_remove: isManager({ material, viewer, isStaff }),
})

const NOT_SHARER = 'You can only share materials with the groups and courses you teach.'

/** Lecturers and staff (the owner, and admins the route let in with MANAGE_MATERIALS) share; students only read */
const isSharer = (viewer: SpaceViewer) => viewer.role === 'OWNER' || viewer.role === 'ADMIN' || viewer.role === 'LECTURER'

/** The viewer's spaces, posting only where they share and the space is not archived */
const loadMaterialSpaces = async ({ organizationId, viewer }: ViewerScope) => {
  const viewerSpaces = await loadViewerSpaces({ organizationId, viewer })
  const canShare = isSharer(viewer)
  return { ...viewerSpaces, spaces: viewerSpaces.spaces.map((space) => ({ ...space, can_post: space.can_post && canShare })) }
}

const notFoundMessage = (kind: MaterialSpaceInput['space_kind']) => (kind === 'GROUP' ? 'Group not found' : 'Course not found')

/** An empty description or section is stored as none */
const orNull = (text: string) => text || null

type SpaceScope = ViewerScope & {
  space: MaterialSpaceInput
}

/** The space exists in the organization (404 otherwise) and the viewer shares there (403 otherwise) */
const requireShareableSpace = async ({ organizationId, viewer, space }: SpaceScope) => {
  const exists =
    space.space_kind === 'GROUP'
      ? await prisma.group.count({ where: { id: space.space_id, organization_id: organizationId } })
      : await prisma.course.count({ where: { id: space.space_id, organization_id: organizationId } })
  if (exists === 0) throw new HttpError(404, notFoundMessage(space.space_kind))
  const viewerSpaces = await loadMaterialSpaces({ organizationId, viewer })
  const found = findViewerSpace({ viewerSpaces, kind: space.space_kind, id: space.space_id })
  if (!found || !isSharer(viewer)) throw new HttpError(403, NOT_SHARER)
  if (found.is_archived) throw new HttpError(403, archivedMessage(space.space_kind))
  return { space: found, isStaff: viewerSpaces.isStaff }
}

/** The columns that place a new material in its space, with its author */
const spaceColumns = ({ organizationId, viewer, space }: SpaceScope) => ({
  organization_id: organizationId,
  author_membership_id: viewer.membershipId,
  space_kind: space.space_kind,
  group_id: space.space_kind === 'GROUP' ? space.space_id : null,
  course_id: space.space_kind === 'COURSE' ? space.space_id : null,
})

/** The material for someone who reads its space; 404 for everyone else */
const findReachableMaterial = async ({ organizationId, viewer, materialId }: MaterialScope) => {
  const material = await prisma.material.findFirst({ where: { id: materialId, organization_id: organizationId }, select: { ...materialSelect, file_key: true } })
  if (!material) throw new HttpError(404, NOT_FOUND)
  const viewerSpaces = await loadMaterialSpaces({ organizationId, viewer })
  const space = toSpaceRef(material)
  if (!findViewerSpace({ viewerSpaces, kind: space.kind, id: space.id })) throw new HttpError(404, NOT_FOUND)
  return { material, isStaff: viewerSpaces.isStaff }
}

/** The material for its author or staff to change; 403 for the rest of its space, and for everyone once the space is archived */
const findManagedMaterial = async (scope: MaterialScope) => {
  const reachable = await findReachableMaterial(scope)
  if (isSpaceArchived(reachable.material)) throw new HttpError(403, `This ${reachable.material.space_kind === 'GROUP' ? 'group' : 'course'} is archived, so its materials can’t be changed.`)
  if (!isManager({ ...reachable, viewer: scope.viewer })) throw new HttpError(403, 'You can only change the materials you shared.')
  return reachable
}

export const MaterialService = {
  // Known from the role alone, so an upload is refused before its file is read
  requireSharer: (viewer: SpaceViewer) => {
    if (!isSharer(viewer)) throw new HttpError(403, NOT_SHARER)
  },

  listSpaces: async (scope: ViewerScope): Promise<MaterialSpace[]> => (await loadMaterialSpaces(scope)).spaces,

  // A space the viewer doesn't read answers 404, as one that doesn't exist
  list: async ({ organizationId, viewer, space }: ViewerScope & { space: MaterialSpaceInput }): Promise<Material[]> => {
    const viewerSpaces = await loadMaterialSpaces({ organizationId, viewer })
    if (!findViewerSpace({ viewerSpaces, kind: space.space_kind, id: space.space_id })) throw new HttpError(404, notFoundMessage(space.space_kind))
    const materials = await prisma.material.findMany({
      where: { organization_id: organizationId, space_kind: space.space_kind, ...(space.space_kind === 'GROUP' ? { group_id: space.space_id } : { course_id: space.space_id }) },
      orderBy: { created_at: 'desc' },
      take: LIST_LIMIT,
      select: materialSelect,
    })
    return materials.map((material) => toMaterial({ material, viewer, isStaff: viewerSpaces.isStaff }))
  },

  create: async ({ organizationId, viewer, data }: ViewerScope & { data: CreateMaterialInput }): Promise<Material> => {
    const { isStaff } = await requireShareableSpace({ organizationId, viewer, space: data })
    const material = await prisma.material.create({
      data: {
        ...spaceColumns({ organizationId, viewer, space: data }),
        kind: data.kind,
        title: data.title,
        description: orNull(data.description),
        section: orNull(data.section),
        url: data.kind === 'LINK' ? data.url : null,
        body: data.kind === 'NOTE' ? data.body : null,
      },
      select: materialSelect,
    })
    return toMaterial({ material, viewer, isStaff })
  },

  upload: async ({ organizationId, viewer, data, file }: ViewerScope & { data: MaterialFileFieldsInput; file: StoredUpload }): Promise<Material> => {
    const { isStaff } = await requireShareableSpace({ organizationId, viewer, space: data })
    const material = await prisma.material.create({
      data: {
        ...spaceColumns({ organizationId, viewer, space: data }),
        kind: 'FILE',
        title: data.title,
        description: orNull(data.description),
        section: orNull(data.section),
        file_key: file.key,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
      },
      select: materialSelect,
    })
    return toMaterial({ material, viewer, isStaff })
  },

  // Only for someone who reads the material's space; 404 for everyone else, as for one that doesn't exist
  getFile: async (scope: MaterialScope) => {
    const { material } = await findReachableMaterial(scope)
    if (material.kind !== 'FILE' || !material.file_key || !material.file_name || !material.file_type) throw new HttpError(404, 'This material has no file.')
    return { path: getMaterialFilePath(material.file_key), name: material.file_name, type: material.file_type }
  },

  update: async ({ data, ...scope }: MaterialScope & { data: UpdateMaterialInput }): Promise<Material> => {
    const { material, isStaff } = await findManagedMaterial(scope)
    const stored = await prisma.material.update({ where: { id: material.id }, data: { title: data.title, description: orNull(data.description), section: orNull(data.section) }, select: materialSelect })
    return toMaterial({ material: stored, viewer: scope.viewer, isStaff })
  },

  // The row goes, then its file; the material is removed for everyone even when its file can't be deleted, which is logged
  remove: async (scope: MaterialScope): Promise<{ id: string }> => {
    const { material } = await findManagedMaterial(scope)
    await prisma.material.delete({ where: { id: material.id } })
    if (material.file_key) {
      try {
        await deleteMaterialFile(material.file_key)
      } catch (error) {
        console.error(`Failed to delete the file of removed material ${material.id}`, error)
      }
    }
    return { id: material.id }
  },
}
