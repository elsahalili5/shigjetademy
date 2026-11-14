import { z } from 'zod'
import { ANNOUNCEMENT_AUDIENCE_KINDS, ANNOUNCEMENT_AUDIENCE_ROLES, ANNOUNCEMENT_PUBLISH_MODES, announcementTextSchema } from '@shigjetademy/shared/announcements'
import type { AnnouncementAudienceOptions, AnnouncementDetail, AnnouncementAudienceKind, AnnouncementPublishMode, CreateAnnouncementInput, UpdateAnnouncementInput } from '@shigjetademy/shared/announcements'
import { isInFuture, toUtcIso, toWallClock } from './schedule-time'

/** The form's fields: the audience's target and the schedule are plain text until they are checked and turned into an input */
export const createAnnouncementFormSchema = (timeZone: string) =>
  announcementTextSchema
    .extend({
      audience_kind: z.enum(ANNOUNCEMENT_AUDIENCE_KINDS, 'Choose who it is for.'),
      audience_role: z.string(),
      course_id: z.string(),
      group_id: z.string(),
      publish_mode: z.enum(ANNOUNCEMENT_PUBLISH_MODES),
      schedule_day: z.string(),
      schedule_time: z.string(),
    })
    .superRefine((values, context) => {
      if (values.audience_kind === 'ROLE' && !values.audience_role) context.addIssue({ code: 'custom', path: ['audience_role'], message: 'Choose a role.' })
      if (values.audience_kind === 'COURSE' && !values.course_id) context.addIssue({ code: 'custom', path: ['course_id'], message: 'Choose a course.' })
      if (values.audience_kind === 'GROUP' && !values.group_id) context.addIssue({ code: 'custom', path: ['group_id'], message: 'Choose a group.' })
      if (values.publish_mode !== 'SCHEDULED') return
      if (!values.schedule_day) context.addIssue({ code: 'custom', path: ['schedule_day'], message: 'Choose a day.' })
      if (!values.schedule_time) context.addIssue({ code: 'custom', path: ['schedule_time'], message: 'Choose a time.' })
      if (values.schedule_day && values.schedule_time && !isInFuture({ day: values.schedule_day, time: values.schedule_time, timeZone })) {
        context.addIssue({ code: 'custom', path: ['schedule_day'], message: 'Choose a time in the future.' })
      }
    })

export type AnnouncementFormValues = z.infer<ReturnType<typeof createAnnouncementFormSchema>>

type ToFormValuesParams = {
  announcement: AnnouncementDetail | null
  options: AnnouncementAudienceOptions
  timeZone: string
}

/** The first audience kind the viewer can pick, for a new announcement */
const getFirstAudienceKind = (options: AnnouncementAudienceOptions): AnnouncementAudienceKind => {
  if (options.can_address_school) return 'SCHOOL'
  if (options.groups.length > 0) return 'GROUP'
  return 'COURSE'
}

const getPublishMode = (announcement: AnnouncementDetail): AnnouncementPublishMode => {
  if (announcement.status === 'SCHEDULED') return 'SCHEDULED'
  return announcement.status === 'DRAFT' ? 'DRAFT' : 'NOW'
}

/** The form's starting values: empty for a new announcement, the saved ones for an edit */
export const toFormValues = ({ announcement, options, timeZone }: ToFormValuesParams): AnnouncementFormValues => {
  if (!announcement) {
    return { title: '', body: '', audience_kind: getFirstAudienceKind(options), audience_role: '', course_id: '', group_id: '', publish_mode: 'NOW', schedule_day: '', schedule_time: '09:00' }
  }
  const isScheduled = announcement.status === 'SCHEDULED' && !!announcement.publish_at
  const wallClock = isScheduled && announcement.publish_at ? toWallClock({ iso: announcement.publish_at, timeZone }) : null
  return {
    title: announcement.title,
    body: announcement.body,
    audience_kind: announcement.audience_kind,
    audience_role: announcement.audience_role ?? '',
    course_id: announcement.course?.id ?? '',
    group_id: announcement.group?.id ?? '',
    publish_mode: getPublishMode(announcement),
    schedule_day: wallClock?.day ?? '',
    schedule_time: wallClock?.time ?? '09:00',
  }
}

const roleOf = (value: string) => ANNOUNCEMENT_AUDIENCE_ROLES.find((role) => role === value) ?? null

type ToInputParams = {
  values: AnnouncementFormValues
  timeZone: string
}

/** The request for a new announcement; the schedule is turned from the school's wall clock into UTC */
export const toCreateInput = ({ values, timeZone }: ToInputParams): CreateAnnouncementInput => ({
  title: values.title,
  body: values.body,
  audience_kind: values.audience_kind,
  audience_role: values.audience_kind === 'ROLE' ? roleOf(values.audience_role) : null,
  course_id: values.audience_kind === 'COURSE' ? values.course_id : null,
  group_id: values.audience_kind === 'GROUP' ? values.group_id : null,
  publish_mode: values.publish_mode,
  publish_at: values.publish_mode === 'SCHEDULED' ? toUtcIso({ day: values.schedule_day, time: values.schedule_time, timeZone }) : null,
})

/** The request for an edit; the publishing choice is left out for an announcement that is already out */
export const toUpdateInput = ({ values, timeZone, canChangePublishing }: ToInputParams & { canChangePublishing: boolean }): UpdateAnnouncementInput => {
  const input = toCreateInput({ values, timeZone })
  return canChangePublishing ? input : { ...input, publish_mode: undefined, publish_at: null }
}
