import { prisma } from '@lib/prisma.ts'
import { toClock } from '@lib/calendar-day.ts'
import { getOrganizationToday } from '@lib/current-period.ts'
import type { WeeklyScheduleEntry } from '@shigjetademy/shared/schedule'
import { getEffectiveTeacher } from './effective-teacher.ts'
import type { ClashableMeeting } from './schedule-clashes.ts'
import { getClashes } from './schedule-clashes.ts'

const lecturerSelect = { id: true, first_name: true, last_name: true } as const

const groupSelect = {
  id: true,
  name: true,
  room: { select: { id: true, name: true } },
  meetings: { select: { weekday: true, start_time: true, end_time: true } },
  lecturer_assignments: { select: { start_date: true, end_date: true, lecturer: { select: lecturerSelect } } },
  substitutions: { select: { start_date: true, end_date: true, cancelled_at: true, lecturer: { select: lecturerSelect } } },
} as const

type GetScheduleParams = {
  organizationId: string
}

/** Every active group's weekly meetings, with their room and the lecturer who actually teaches on the organization's today, and room and teacher clashes flagged */
export const ScheduleService = {
  getSchedule: async ({ organizationId }: GetScheduleParams): Promise<WeeklyScheduleEntry[]> => {
    const today = await getOrganizationToday({ db: prisma, organizationId })
    const groups = await prisma.group.findMany({ where: { organization_id: organizationId, status: 'ACTIVE' }, select: groupSelect })

    const entries = groups.flatMap((group) => {
      const teacher = getEffectiveTeacher({ assignments: group.lecturer_assignments, substitutions: group.substitutions, today })
      return group.meetings.map((meeting) => ({
        group: { id: group.id, name: group.name },
        weekday: meeting.weekday,
        start_time: toClock(meeting.start_time),
        end_time: toClock(meeting.end_time),
        room: group.room,
        teacher,
      }))
    })

    const clashable: ClashableMeeting[] = entries.map((entry) => ({
      groupId: entry.group.id,
      weekday: entry.weekday,
      start_time: entry.start_time,
      end_time: entry.end_time,
      roomId: entry.room?.id ?? null,
      teacherId: entry.teacher?.id ?? null,
    }))
    const clashes = getClashes(clashable)

    return entries.map((entry, index) => ({ ...entry, clash: clashes[index] }))
  },
}
