import type { StudentAssignment } from '@shigjetademy/shared/assignments'

const isDone = (assignment: StudentAssignment) => {
  switch (assignment.status) {
    case 'NOT_HANDED_IN':
      return false
    case 'HANDED_IN':
    case 'LATE':
    case 'MARKED':
      return true
    default: {
      const unknown: never = assignment.status
      throw new Error(`Unknown hand-in status: ${String(unknown)}`)
    }
  }
}

/** To do (not handed in) and Done (handed in or marked), each in the list's order: soonest due first */
export const splitStudentAssignments = (assignments: StudentAssignment[]) => ({
  toDo: assignments.filter((assignment) => !isDone(assignment)),
  done: assignments.filter(isDone),
})
