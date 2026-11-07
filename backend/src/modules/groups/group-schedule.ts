import type { Prisma } from '@generated/prisma/client.ts'
import { sortSchedule } from '@shigjetademy/shared/groups'
import type { GroupScheduleEntry } from '@shigjetademy/shared/groups'
import type { WeekStart } from '@shigjetademy/shared/organization-settings'
import { toClock, toTime } from '@lib/calendar-day.ts'
import type { OrganizationScope } from '@lib/organization-lock.ts'

/** What a group's meetings answer with; the groups and both home pages read them */
export const meetingsSelect = { select: { weekday: true, start_time: true, end_time: true } } as const satisfies Prisma.Group$meetingsArgs

type StoredMeeting = Prisma.GroupMeetingGetPayload<typeof meetingsSelect>

type ToScheduleJsonParams = {
  meetings: StoredMeeting[]
  weekStart: WeekStart
}

/** The meetings as 'HH:MM' times, in the organization's week */
export const toScheduleJson = ({ meetings, weekStart }: ToScheduleJsonParams) =>
  sortSchedule({ schedule: meetings.map((meeting) => ({ weekday: meeting.weekday, start_time: toClock(meeting.start_time), end_time: toClock(meeting.end_time) })), weekStart })

type ReplaceScheduleParams = Pick<OrganizationScope, 'tx'> & {
  groupId: string
  schedule: GroupScheduleEntry[]
}

/** Swaps the group's meetings for these; they have no history, so nothing else points at them */
export const replaceSchedule = async ({ tx, groupId, schedule }: ReplaceScheduleParams) => {
  await tx.groupMeeting.deleteMany({ where: { group_id: groupId } })
  await tx.groupMeeting.createMany({ data: schedule.map((entry) => ({ group_id: groupId, weekday: entry.weekday, start_time: toTime(entry.start_time), end_time: toTime(entry.end_time) })) })
}
