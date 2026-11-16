// Which topics a viewer reads, from the spaces they are in (see groups/space-access). A group or course that is archived stays readable for its people but
// takes no new topics or replies.
import type { Prisma } from '@generated/prisma/client.ts'
import { spaceIdsOfKind } from '@modules/groups/space-access.ts'
import type { ViewerSpaces } from '@modules/groups/space-access.ts'

type TopicsInSpacesParams = {
  organizationId: string
  viewerSpaces: ViewerSpaces
}

/** The topics in the spaces the viewer reads */
export const topicsInSpaces = ({ organizationId, viewerSpaces }: TopicsInSpacesParams): Prisma.DiscussionTopicWhereInput => {
  if (viewerSpaces.isStaff) return { organization_id: organizationId }
  return {
    organization_id: organizationId,
    OR: [
      { space_kind: 'GROUP', group_id: { in: spaceIdsOfKind({ viewerSpaces, kind: 'GROUP' }) } },
      { space_kind: 'COURSE', course_id: { in: spaceIdsOfKind({ viewerSpaces, kind: 'COURSE' }) } },
    ],
  }
}
