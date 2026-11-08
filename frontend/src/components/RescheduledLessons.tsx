import type { RescheduledLesson } from '@shigjetademy/shared/groups'
import { useFormatLessonSlot } from '#/lib/use-format-date'

/** A moved lesson; My teaching also says whether the lecturer takes it on its new date */
type ShownLesson = RescheduledLesson & {
  is_teaching?: boolean
}

interface RescheduledLessonsProps {
  lessons: ShownLesson[]
}

/** Upcoming lessons moved to another date and time, with both slots, for My school and My teaching; read-only */
export function RescheduledLessons({ lessons }: RescheduledLessonsProps) {
  if (lessons.length === 0) return <p className="px-5 py-4 text-ink-2">No lessons moved.</p>
  return (
    <ul className="grid">
      {lessons.map((lesson) => (
        <RescheduledLessonRow key={lesson.id} lesson={lesson} />
      ))}
    </ul>
  )
}

interface RescheduledLessonRowProps {
  lesson: ShownLesson
}

function RescheduledLessonRow({ lesson }: RescheduledLessonRowProps) {
  const formatLessonSlot = useFormatLessonSlot()
  const original = formatLessonSlot({ day: lesson.original_date, time: lesson.original_start_time })
  const moved = formatLessonSlot({ day: lesson.new_date, time: lesson.new_start_time })

  return (
    <li className="grid gap-0.5 border-b border-rule px-5 py-3 last:border-b-0">
      <span className="font-semibold">
        {lesson.group.name} · {lesson.group.course}
      </span>
      {lesson.is_teaching === false ? (
        <>
          <span className="tabular text-[0.93rem] text-ink-2">
            {original} · Moved to {moved}
          </span>
          <span className="text-[0.93rem] text-ink-2">Another lecturer takes it on the new date.</span>
        </>
      ) : (
        <>
          <span className="tabular text-[0.93rem] text-ink-2">
            Moved from {original} to {moved}–{lesson.new_end_time}
          </span>
          {lesson.is_teaching ? <span className="text-[0.93rem] text-ink-2">You take this lesson.</span> : null}
        </>
      )}
    </li>
  )
}
