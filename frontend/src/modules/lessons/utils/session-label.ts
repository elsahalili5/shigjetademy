import type { LessonPlanSession } from '@shigjetademy/shared/lesson-plans'

/** "Group A · Mathematics · 17:00–18:30" */
export const getLessonPlanSessionLabel = (session: LessonPlanSession) => `${session.name} · ${session.course} · ${session.start_time}–${session.end_time}`

/** One session among the day's: a group has one session per start time */
export const getLessonPlanSessionKey = (session: Pick<LessonPlanSession, 'group_id' | 'start_time'>) => `${session.group_id}/${session.start_time}`
