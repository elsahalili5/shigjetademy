import { UsersRound } from 'lucide-react'
import { ATTENDANCE_STATUSES } from '@shigjetademy/shared/attendance'
import type { AttendanceRegister as Register, AttendanceStatus, AttendanceStudent } from '@shigjetademy/shared/attendance'
import { getLecturerName } from '@shigjetademy/shared/lecturers'
import { getStudentName } from '@shigjetademy/shared/students'
import { EmptyMessage } from '#/components/EmptyMessage'
import { FormAlert } from '#/components/FormAlert'
import { LoadError } from '#/components/LoadError'
import { SectionCard } from '#/components/SectionCard'
import { SkeletonRows } from '#/components/SkeletonRows'
import { getErrorMessage } from '#/lib/error-message'
import { useFormatDay, useFormatLessonSlot } from '#/lib/use-format-date'
import type { RegisterParams } from '../api/attendance-api'
import { useAttendanceRegister } from '../hooks/use-attendance-register'
import { useMarkAllPresent } from '../hooks/use-mark-all-present'
import { useMarkStudent } from '../hooks/use-mark-student'
import { ATTENDANCE_STATUS_LABELS, NOT_MARKED_LABEL } from '../utils/status-labels'

const STATUS_BUTTON_CLASS =
  'inline-flex min-h-9 items-center rounded-full px-3.5 text-[0.93rem] font-semibold text-ink-2 transition-colors duration-150 hover:text-ink aria-disabled:opacity-60 aria-pressed:bg-white aria-pressed:text-ink aria-pressed:shadow-card'

interface AttendanceRegisterProps {
  organizationId: string
  groupId: string
  date: string
  startTime: string
  /** The organization's time zone, where the lesson's times are */
  timeZone: string
}

/** One session's register: its students and their marks, saved on each tap while this user may mark it */
export function AttendanceRegister({ organizationId, groupId, date, startTime, timeZone }: AttendanceRegisterProps) {
  const params = { organizationId, groupId, date, startTime }
  const register = useAttendanceRegister({ ...params, timeZone })

  if (register.status === 'error') return <LoadError what="register" onRetry={() => void register.refetch()} />
  if (!register.data) return <SkeletonRows />
  return <RegisterSection params={params} register={register.data} />
}

interface RegisterSectionProps {
  params: RegisterParams
  register: Register
}

function RegisterSection({ params, register }: RegisterSectionProps) {
  const formatDay = useFormatDay()
  const formatLessonSlot = useFormatLessonSlot()
  const markAllPresent = useMarkAllPresent(params)
  const hasUnmarked = register.students.some((student) => !student.status)

  return (
    <SectionCard
      title={register.group.name}
      action={
        register.can_edit ? (
          <button type="button" className="button button--ghost min-h-10 px-4 text-base" disabled={!hasUnmarked || markAllPresent.isPending} onClick={() => markAllPresent.mutate()}>
            Mark all present
          </button>
        ) : null
      }
    >
      <div className="grid gap-4 px-5 py-4">
        <p className="tabular text-ink-2">
          {register.group.course} · {formatDay(register.date)} · {register.start_time}–{register.end_time}
        </p>
        {register.rescheduled_from ? <p className="tabular text-ink-2">Rescheduled from {formatLessonSlot({ day: register.rescheduled_from.date, time: register.rescheduled_from.start_time })}</p> : null}
        <RegisterNotice register={register} />
        {markAllPresent.isError ? <FormAlert>{getErrorMessage(markAllPresent.error)}</FormAlert> : null}
        <RegisterStudents params={params} register={register} isMarkingAll={markAllPresent.isPending} />
      </div>
    </SectionCard>
  )
}

interface RegisterStudentsProps {
  params: RegisterParams
  register: Register
  /** "Mark all present" is saving, so single marks wait */
  isMarkingAll: boolean
}

function RegisterStudents({ params, register, isMarkingAll }: RegisterStudentsProps) {
  if (register.students.length === 0) return <EmptyMessage icon={UsersRound} title="No students on this day" text="Students enrolled in the group on this date show here." />
  return (
    <ul className="grid" aria-label="Students">
      {register.students.map((student) => (
        <RegisterRow key={student.id} params={params} student={student} isEditable={register.can_edit} isMarkingAll={isMarkingAll} />
      ))}
    </ul>
  )
}

interface RegisterNoticeProps {
  register: Register
}

/** Why the register can't be marked right now, or that changes after the lock are corrections */
function RegisterNotice({ register }: RegisterNoticeProps) {
  if (register.group.status === 'ARCHIVED') return <p className="text-ink-2">This group is archived, so its register is read-only.</p>
  switch (register.window) {
    case 'UPCOMING':
      return <p className="font-semibold text-ink-2">Opens at {register.start_time}</p>
    case 'OPEN':
      return !register.can_edit && register.substitute ? <p className="text-ink-2">{getLecturerName(register.substitute)} is covering this lesson, so it’s read-only for you.</p> : null
    case 'LOCKED':
      return register.can_edit ? (
        <p className="text-ink-2">Locked at {register.end_time}. Changes now are logged as corrections.</p>
      ) : (
        <p className="text-ink-2">Locked at {register.end_time}. A school admin can still correct it.</p>
      )
    default: {
      const unknown: never = register.window
      throw new Error(`Unknown register window: ${String(unknown)}`)
    }
  }
}

interface RegisterRowProps {
  params: RegisterParams
  student: AttendanceStudent
  isEditable: boolean
  isMarkingAll: boolean
}

function RegisterRow({ params, student, isEditable, isMarkingAll }: RegisterRowProps) {
  const markStudent = useMarkStudent({ ...params, studentId: student.id })
  const name = getStudentName(student)
  // aria-disabled instead of disabled, so focus stays on the button that was pressed while it saves
  const isBusy = markStudent.isPending || isMarkingAll

  const handleMark = (status: AttendanceStatus) => {
    if (isBusy || status === student.status) return
    markStudent.mutate(status)
  }

  return (
    <li className="grid gap-2 border-b border-rule py-2.5 last:border-b-0" aria-label={name}>
      <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <span className="font-semibold">
          {name}
          {student.is_archived ? ' (archived)' : null}
        </span>
        {isEditable ? (
          <span className="flex flex-wrap items-center gap-3">
            {student.status ? null : <span className="text-[0.93rem] text-ink-3">{NOT_MARKED_LABEL}</span>}
            <span role="group" aria-label={`Attendance for ${name}`} className="flex w-fit gap-1 rounded-full bg-mist p-1">
              {ATTENDANCE_STATUSES.map((status) => (
                <button key={status} type="button" className={STATUS_BUTTON_CLASS} aria-pressed={student.status === status} aria-disabled={isBusy} onClick={() => handleMark(status)}>
                  {ATTENDANCE_STATUS_LABELS[status]}
                </button>
              ))}
            </span>
          </span>
        ) : (
          <span className="text-[0.93rem] text-ink-2">{student.status ? ATTENDANCE_STATUS_LABELS[student.status] : NOT_MARKED_LABEL}</span>
        )}
      </span>
      {markStudent.isError ? <FormAlert>{getErrorMessage(markStudent.error)}</FormAlert> : null}
    </li>
  )
}
