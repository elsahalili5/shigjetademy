import type { AnnouncementAudienceRole, AnnouncementSummary } from '@shigjetademy/shared/announcements'

export const AUDIENCE_ROLE_LABELS = {
  STUDENT: 'All students',
  GUARDIAN: 'All parents',
  LECTURER: 'All lecturers',
} as const satisfies Record<AnnouncementAudienceRole, string>

type AudienceFields = Pick<AnnouncementSummary, 'audience_kind' | 'audience_role' | 'course' | 'group'>

/** Who an announcement is for, in words: "Whole school", "All parents", "Course: Mathematics" or "Group: Group A" */
export const getAudienceLabel = ({ audience_kind: kind, audience_role: role, course, group }: AudienceFields) => {
  switch (kind) {
    case 'SCHOOL':
      return 'Whole school'
    case 'ROLE':
      return role ? AUDIENCE_ROLE_LABELS[role] : 'A role'
    case 'COURSE':
      return `Course: ${course?.name ?? 'removed'}`
    case 'GROUP':
      return `Group: ${group?.name ?? 'removed'}`
    default: {
      const unhandled: never = kind
      throw new Error(`Unhandled audience kind: ${String(unhandled)}`)
    }
  }
}
