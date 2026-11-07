import type { Group } from '@shigjetademy/shared/groups'

/** No seat left; a group without a capacity never fills */
export const isGroupFull = (group: Pick<Group, 'capacity' | 'enrolled_count'>) => group.capacity !== null && group.enrolled_count >= group.capacity

/** "18/20", "20/20 · Full", or "3 students" for a group without a capacity */
export const getEnrolmentCountLabel = (group: Pick<Group, 'capacity' | 'enrolled_count'>) => {
  if (group.capacity === null) return group.enrolled_count === 1 ? '1 student' : `${group.enrolled_count} students`
  const count = `${group.enrolled_count}/${group.capacity}`
  return isGroupFull(group) ? `${count} · Full` : count
}
