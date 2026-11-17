import type { QueryClient } from '@tanstack/react-query'
import type { Assignment, AssignmentDetail } from '@shigjetademy/shared/assignments'
import { assignmentQueryKeys } from './query-keys'

type RecordAssignmentParams = {
  queryClient: QueryClient
  organizationId: string
  assignment: Assignment
}

/** Latest due first, like the server lists them */
const byLatestDue = (first: Assignment, second: Assignment) => second.due_at.localeCompare(first.due_at)

/** Without max points the server drops given points and keeps the feedback; the cached marks follow */
const withoutPointsWhenNoMax = ({ detail, assignment }: { detail: AssignmentDetail; assignment: Assignment }) => {
  if (assignment.max_points !== null) return detail.hand_ins
  return detail.hand_ins.map((row) => (row.hand_in?.mark ? { ...row, hand_in: { ...row.hand_in, mark: { ...row.hand_in.mark, points: null } } } : row))
}

/** Puts an assignment the member just set or changed into its group's list, in due order, and into its open page, so nothing is fetched again */
export const recordAssignment = ({ queryClient, organizationId, assignment }: RecordAssignmentParams) => {
  queryClient.setQueryData<Assignment[]>(assignmentQueryKeys.list({ organizationId, groupId: assignment.group.id }), (assignments = []) =>
    [...assignments.filter((item) => item.id !== assignment.id), assignment].sort(byLatestDue),
  )
  queryClient.setQueryData<AssignmentDetail>(assignmentQueryKeys.detail({ organizationId, assignmentId: assignment.id }), (detail) => (detail ? { ...detail, ...assignment, hand_ins: withoutPointsWhenNoMax({ detail, assignment }) } : detail))
}

/** Takes an assignment the member just removed off its group's list */
export const forgetAssignment = ({ queryClient, organizationId, assignment }: RecordAssignmentParams) => {
  queryClient.setQueryData<Assignment[]>(assignmentQueryKeys.list({ organizationId, groupId: assignment.group.id }), (assignments) => assignments?.filter((item) => item.id !== assignment.id))
  queryClient.removeQueries({ queryKey: assignmentQueryKeys.detail({ organizationId, assignmentId: assignment.id }) })
}
