import type { Prisma } from '@generated/prisma/client.ts'
import type { MyTeaching, MyTeachingCover, MyTeachingCoverGroup, MyTeachingGroup } from '@shigjetademy/shared/lecturers'
import { todayIn } from '@shigjetademy/shared/calendar-day'
import { resolveOrganizationSettings } from '@shigjetademy/shared/organization-settings'
import { toDate, toDay } from '@lib/calendar-day.ts'
import { periodSelect, toPeriodJson } from '@lib/current-period.ts'
import { prisma } from '@lib/prisma.ts'
import type { WeekStart } from '@shigjetademy/shared/organization-settings'
import { activeEnrolments } from '@modules/groups/group-selects.ts'
import { meetingsSelect, toScheduleJson } from '@modules/groups/group-schedule.ts'

const coverGroupSelect = {
  id: true,
  name: true,
  course: { select: { name: true } },
  academic_year: { select: { name: true } },
  location: { select: { name: true } },
  meetings: meetingsSelect,
} as const satisfies Prisma.GroupSelect

// Adds the students in the group now, with only their names: never notes, dates of birth or anyone outside the group
const teachingGroupSelect = {
  ...coverGroupSelect,
  enrolments: {
    where: activeEnrolments,
    orderBy: [{ student: { first_name: 'asc' } }, { student: { last_name: 'asc' } }, { student_id: 'asc' }],
    select: { student: { select: { id: true, first_name: true, last_name: true } } },
  },
} as const satisfies Prisma.GroupSelect

type ToCoverGroupParams = {
  group: Prisma.GroupGetPayload<{ select: typeof coverGroupSelect }>
  weekStart: WeekStart
}

const toCoverGroup = ({ group, weekStart }: ToCoverGroupParams): MyTeachingCoverGroup => ({
  id: group.id,
  name: group.name,
  course: group.course.name,
  academic_year: group.academic_year.name,
  location: group.location?.name ?? null,
  schedule: toScheduleJson({ meetings: group.meetings, weekStart }),
})

type ToTeachingGroupParams = {
  group: Prisma.GroupGetPayload<{ select: typeof teachingGroupSelect }>
  weekStart: WeekStart
}

const toTeachingGroup = ({ group, weekStart }: ToTeachingGroupParams): MyTeachingGroup => ({
  ...toCoverGroup({ group, weekStart }),
  students: group.enrolments.map((enrolment) => enrolment.student),
})

type ReadTeachingParams = {
  lecturerId: string
  today: Date
  weekStart: WeekStart
}

/** The active groups the lecturer permanently teaches today, in a school year that includes today, and what they cover from today on */
const readTeaching = async ({ lecturerId, today, weekStart }: ReadTeachingParams): Promise<Pick<MyTeaching, 'groups' | 'cover'>> => {
  const [assignments, substitutions] = await Promise.all([
    prisma.groupLecturerAssignment.findMany({
      where: { lecturer_id: lecturerId, start_date: { lte: today }, OR: [{ end_date: null }, { end_date: { gte: today } }], group: { status: 'ACTIVE', academic_year: { start_date: { lte: today }, end_date: { gte: today } } } },
      orderBy: { group: { name: 'asc' } },
      select: { group: { select: teachingGroupSelect } },
    }),
    prisma.groupSubstitution.findMany({
      where: { lecturer_id: lecturerId, cancelled_at: null, end_date: { gte: today }, group: { status: 'ACTIVE' } },
      orderBy: { start_date: 'asc' },
      select: { id: true, start_date: true, end_date: true, group: { select: coverGroupSelect } },
    }),
  ])
  const toCover = ({ id, start_date, end_date, group }: (typeof substitutions)[number]): MyTeachingCover => ({
    id,
    status: start_date <= today ? 'CURRENT' : 'UPCOMING',
    start_date: toDay(start_date),
    end_date: toDay(end_date),
    group: toCoverGroup({ group, weekStart }),
  })
  return { groups: assignments.map(({ group }) => toTeachingGroup({ group, weekStart })), cover: substitutions.map(toCover) }
}

type GetMyTeachingParams = {
  organizationId: string
  userId: string
}

export const LecturerHomeService = {
  // The lecturer only ever sees their own record, without the staff-only phone, email and notes; today is the organization's calendar day
  getMyTeaching: async ({ organizationId, userId }: GetMyTeachingParams): Promise<MyTeaching> => {
    const organization = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { id: true, name: true, country: true, settings: { select: { time_zone: true, week_start: true, date_format: true } } },
    })
    const settings = resolveOrganizationSettings({ stored: organization.settings, country: organization.country })
    const today = toDate(todayIn(settings.time_zone))
    const [lecturer, year] = await Promise.all([
      prisma.lecturer.findFirst({
        where: { organization_id: organizationId, user_id: userId },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          subjects: true,
          employment_type: true,
          department: { select: { name: true } },
          locations: { select: { location: { select: { name: true } } }, orderBy: { location: { name: 'asc' } } },
        },
      }),
      prisma.academicYear.findFirst({
        where: { organization_id: organizationId, is_current: true },
        select: {
          id: true,
          ...periodSelect,
          terms: { where: { start_date: { lte: today }, end_date: { gte: today } }, select: periodSelect, take: 1 },
          holidays: { where: { start_date: { lte: today }, end_date: { gte: today } }, select: { name: true }, orderBy: { start_date: 'asc' }, take: 1 },
        },
      }),
    ])
    const term = year?.terms[0]
    // The next term of the current year, so the page can say when teaching starts again
    const nextTerm = year
      ? await prisma.academicTerm.findFirst({ where: { academic_year_id: year.id, start_date: { gt: today } }, orderBy: { start_date: 'asc' }, select: periodSelect })
      : null
    const teaching = lecturer ? await readTeaching({ lecturerId: lecturer.id, today, weekStart: settings.week_start }) : { groups: [], cover: [] }
    return {
      organization: { id: organization.id, name: organization.name },
      lecturer: lecturer && {
        first_name: lecturer.first_name,
        last_name: lecturer.last_name,
        subjects: lecturer.subjects,
        employment_type: lecturer.employment_type,
        department: lecturer.department?.name ?? null,
        locations: lecturer.locations.map((item) => item.location.name),
      },
      academic_year: year ? toPeriodJson(year) : null,
      term: term ? toPeriodJson(term) : null,
      holiday: year?.holidays[0] ?? null,
      next_term: nextTerm ? toPeriodJson(nextTerm) : null,
      ...teaching,
    }
  },
}
