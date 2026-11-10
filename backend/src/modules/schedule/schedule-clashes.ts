import type { Weekday } from '@shigjetademy/shared/groups'

/** One meeting, as the clash check reads it: 'HH:MM' times, on one weekday */
export type ClashableMeeting = {
  groupId: string
  weekday: Weekday
  start_time: string
  end_time: string
  roomId: string | null
  teacherId: string | null
}

/** Same day and sharing some minutes; one ending as the other starts is fine */
const isOverlapping = (a: ClashableMeeting, b: ClashableMeeting) => a.weekday === b.weekday && a.start_time < b.end_time && b.start_time < a.end_time

type HasClashParams = {
  meetings: ClashableMeeting[]
  meeting: ClashableMeeting
  key: 'roomId' | 'teacherId'
}

/** Whether this meeting shares its room or teacher with another group's meeting at an overlapping time on the same day */
const hasClash = ({ meetings, meeting, key }: HasClashParams) => {
  const value = meeting[key]
  if (!value) return false
  return meetings.some((other) => other.groupId !== meeting.groupId && other[key] === value && isOverlapping(meeting, other))
}

/** Every meeting's room and teacher clash flags, worked out against every other group's meetings */
export const getClashes = (meetings: ClashableMeeting[]) =>
  meetings.map((meeting) => ({ room: hasClash({ meetings, meeting, key: 'roomId' }), teacher: hasClash({ meetings, meeting, key: 'teacherId' }) }))
