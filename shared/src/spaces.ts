// A space is a group or a course whose people share discussions and learning materials. Who is in one is worked out from current enrolments and
// teaching assignments, never stored per member.

export const SPACE_KINDS = ['GROUP', 'COURSE'] as const

export type SpaceKind = (typeof SPACE_KINDS)[number]

/** A group or a course. A group also carries its course's name. */
export type SpaceRef = {
  kind: SpaceKind
  id: string
  name: string
  course_name: string | null
}

/** A space the viewer can read; can_post says whether they can add to it */
export type Space = SpaceRef & {
  is_archived: boolean
  can_post: boolean
}
