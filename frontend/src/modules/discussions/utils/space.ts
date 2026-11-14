import type { DiscussionSpaceKind, DiscussionSpaceRef } from '@shigjetademy/shared/discussions'

type SpaceKey = Pick<DiscussionSpaceRef, 'kind' | 'id'>

/** The filter and the form pick a space by one string: "GROUP:<id>" or "COURSE:<id>" */
export const getSpaceKey = ({ kind, id }: SpaceKey) => `${kind}:${id}`

export const ALL_SPACES = 'all'

/** A space in words: "Course: Mathematics" or "Group: Group A" */
export const getSpaceLabel = ({ kind, name }: Pick<DiscussionSpaceRef, 'kind' | 'name'>) => {
  const prefix: Record<DiscussionSpaceKind, string> = { GROUP: 'Group', COURSE: 'Course' }
  return `${prefix[kind]}: ${name}`
}
