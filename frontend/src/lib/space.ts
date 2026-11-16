import type { SpaceKind, SpaceRef } from '@shigjetademy/shared/spaces'

type SpaceKey = Pick<SpaceRef, 'kind' | 'id'>

/** Pickers choose a group or course by one string: "GROUP:<id>" or "COURSE:<id>" */
export const getSpaceKey = ({ kind, id }: SpaceKey) => `${kind}:${id}`

/** A space in words: "Course: Mathematics" or "Group: Group A" */
export const getSpaceLabel = ({ kind, name }: Pick<SpaceRef, 'kind' | 'name'>) => {
  const prefix: Record<SpaceKind, string> = { GROUP: 'Group', COURSE: 'Course' }
  return `${prefix[kind]}: ${name}`
}
