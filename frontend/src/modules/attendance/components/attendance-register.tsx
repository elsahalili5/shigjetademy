import { useState } from 'react'
import { UsersRound } from 'lucide-react'
import { toast } from 'react-hot-toast'
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
import { useSaveAttendance } from '../hooks/use-save-attendance'
import type { PendingMarks } from '../hooks/use-save-attendance'
import { ATTENDANCE_STATUS_LABELS, NOT_MARKED_LABEL } from '../utils/status-labels'

const STATUS_BUTTON_CLASS =
  'inline-flex min-h-9 items-center rounded-full px-3.5 text-[0.93rem] font-semibold text-ink-2 transition-colors duration-150 hover:text-ink aria-disabled:opacity-60 aria-pressed:bg-white aria-pressed:text-ink aria-pressed:shadow-card'

// An unsaved mark is outlined instead of filled, so it reads as staged rather than already saved
const STATUS_BUTTON_PENDING_CLASS =
  'inline-flex min-h-9 items-center rounded-full px-3.5 text-[0.93rem] font-semibold text-ink-2 transition-colors duration-150 hover:text-ink aria-disabled:opacity-60 aria-pressed:border aria-pressed:border-ink aria-pressed:bg-transparent aria-pressed:text-ink'

type GetStatusHintParams = {
  displayedStatus: AttendanceStatus | null
  isUnsavedPending: boolean
}

/** What to say beside a student's marking buttons: that they're unmarked, that their mark isn't saved yet, or nothing */
const getStatusHint = ({ displayedStatus, isUnsavedPending }: GetStatusHintParams) => {
  if (!displayedStatus) return NOT_MARKED_LABEL
  if (isUnsavedPending) return 'Unsaved'
  return null
}

interface AttendanceRegisterProps {
  organizationId: string
  groupId: string
  date: string
  startTime: string
  /** The organization's time zone, where the lesson's times are */
  timeZone: string
}

/** One session's register: its students and their marks, staged by a tap and saved once Save is clicked */
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
  const saveAttendance = useSaveAttendance(params)
  const [pendingMarks, setPendingMarks] = useState<PendingMarks>({})
  const [isEditingSaved, setIsEditingSaved] = useState(false)
  const [saveErrors, setSaveErrors] = useState<Record<string, unknown>>({})
  const canMarkAllPresent = register.students.some((student) => !student.status && !(student.id in pendingMarks))
  const pendingEntries = Object.entries(pendingMarks)
  const isOverwritingSaved = pendingEntries.some(([studentId]) => register.students.find((student) => student.id === studentId)?.status != null)
  const saveLabel = isOverwritingSaved ? 'Save Changes' : 'Save Attendance'
  const isSaving = saveAttendance.isPending

  const handleToggleEditing = () => setIsEditingSaved((current) => !current)

  const handleMarkAllPresent = () => {
    setPendingMarks((current) => {
      const next = { ...current }
      for (const student of register.students) {
        if (!student.status && !(student.id in next)) next[student.id] = 'PRESENT'
      }
      return next
    })
  }

  const handleStage = ({ studentId, status }: { studentId: string; status: AttendanceStatus }) => {
    setPendingMarks((current) => ({ ...current, [studentId]: status }))
    setSaveErrors((current) => {
      if (!(studentId in current)) return current
      const { [studentId]: _removed, ...rest } = current
      return rest
    })
  }

  const handleSave = () => {
    saveAttendance.mutate(pendingMarks, {
      onSuccess: (outcomes) => {
        setPendingMarks((current) => {
          const next = { ...current }
          for (const outcome of outcomes) if (outcome.outcome === 'saved') delete next[outcome.studentId]
          return next
        })
        const failed = outcomes.filter((outcome) => outcome.outcome === 'failed')
        setSaveErrors(Object.fromEntries(failed.map((outcome) => [outcome.studentId, outcome.error])))
        if (failed.length === 0) toast.success('Attendance saved.')
      },
    })
  }

  return (
    <SectionCard
      title={register.group.name}
      action={
        register.can_edit ? (
          <span className="flex flex-wrap items-center gap-2">
            <button type="button" className="button button--ghost min-h-10 px-4 text-base" aria-pressed={isEditingSaved} disabled={isSaving} onClick={handleToggleEditing}>
              Edit Attendance
            </button>
            <button type="button" className="button button--ghost min-h-10 px-4 text-base" disabled={!canMarkAllPresent || isSaving} onClick={handleMarkAllPresent}>
              Mark all present
            </button>
            {pendingEntries.length > 0 ? (
              <button type="button" className="button min-h-10 px-4 text-base" disabled={isSaving} onClick={handleSave}>
                {saveLabel}
              </button>
            ) : null}
          </span>
        ) : null
      }
    >
      <div className="grid gap-4 px-5 py-4">
        <p className="tabular text-ink-2">
          {register.group.course} · {formatDay(register.date)} · {register.start_time}–{register.end_time}
        </p>
        {register.rescheduled_from ? <p className="tabular text-ink-2">Rescheduled from {formatLessonSlot({ day: register.rescheduled_from.date, time: register.rescheduled_from.start_time })}</p> : null}
        <RegisterNotice register={register} />
        <RegisterStudents register={register} pendingMarks={pendingMarks} saveErrors={saveErrors} isEditingSaved={isEditingSaved} isSaving={isSaving} onStage={handleStage} />
      </div>
    </SectionCard>
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

interface RegisterStudentsProps {
  register: Register
  pendingMarks: PendingMarks
  saveErrors: Record<string, unknown>
  isEditingSaved: boolean
  isSaving: boolean
  onStage: (params: { studentId: string; status: AttendanceStatus }) => void
}

function RegisterStudents({ register, pendingMarks, saveErrors, isEditingSaved, isSaving, onStage }: RegisterStudentsProps) {
  if (register.students.length === 0) return <EmptyMessage icon={UsersRound} title="No students on this day" text="Students enrolled in the group on this date show here." />
  return (
    <ul className="grid" aria-label="Students">
      {register.students.map((student) => (
        <RegisterRow
          key={student.id}
          student={student}
          canEditRegister={register.can_edit}
          isEditingSaved={isEditingSaved}
          isSaving={isSaving}
          pendingStatus={pendingMarks[student.id]}
          saveError={saveErrors[student.id]}
          onStage={onStage}
        />
      ))}
    </ul>
  )
}

interface RegisterRowProps {
  student: AttendanceStudent
  canEditRegister: boolean
  isEditingSaved: boolean
  isSaving: boolean
  pendingStatus: AttendanceStatus | undefined
  saveError: unknown
  onStage: (params: { studentId: string; status: AttendanceStatus }) => void
}

function RegisterRow({ student, canEditRegister, isEditingSaved, isSaving, pendingStatus, saveError, onStage }: RegisterRowProps) {
  const name = getStudentName(student)
  const isUnsavedPending = pendingStatus !== undefined
  const displayedStatus = pendingStatus ?? student.status
  // Re-marking an already-saved student needs Edit Attendance on; a never-marked one is always tappable
  const isRowEditable = canEditRegister && (student.status === null || isEditingSaved || isUnsavedPending)
  // A stable single slot for the leading hint, so the status group below it keeps the same position across renders
  const statusHint = getStatusHint({ displayedStatus, isUnsavedPending })

  const handleMark = (status: AttendanceStatus) => {
    if (!isRowEditable || isSaving || status === displayedStatus) return
    onStage({ studentId: student.id, status })
  }

  return (
    <li className="grid gap-2 border-b border-rule py-2.5 last:border-b-0" aria-label={name}>
      <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <span className="font-semibold">
          {name}
          {student.is_archived ? ' (archived)' : null}
        </span>
        {isRowEditable ? (
          <span className="flex flex-wrap items-center gap-3">
            <span className="text-[0.93rem] font-semibold text-ink-3">{statusHint}</span>
            <span role="group" aria-label={`Attendance for ${name}`} className="flex w-fit gap-1 rounded-full bg-mist p-1">
              {ATTENDANCE_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={isUnsavedPending ? STATUS_BUTTON_PENDING_CLASS : STATUS_BUTTON_CLASS}
                  aria-pressed={displayedStatus === status}
                  aria-disabled={isSaving}
                  onClick={() => handleMark(status)}
                >
                  {ATTENDANCE_STATUS_LABELS[status]}
                </button>
              ))}
            </span>
          </span>
        ) : (
          <span className="text-[0.93rem] text-ink-2">{displayedStatus ? ATTENDANCE_STATUS_LABELS[displayedStatus] : NOT_MARKED_LABEL}</span>
        )}
      </span>
      {saveError ? <FormAlert>{getErrorMessage(saveError)}</FormAlert> : null}
    </li>
  )
}
