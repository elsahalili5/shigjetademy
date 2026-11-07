import { useState } from 'react'
import { Archive, ArchiveRestore, Pencil } from 'lucide-react'
import type { Course, CourseStatus } from '@shigjetademy/shared/courses'
import { ConfirmGroup } from '#/components/ConfirmGroup'

export type CourseStatusChange = {
  course: Course
  status: CourseStatus
}

const ACTION_CLASS =
  'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[0.93rem] font-semibold text-ink-2 transition-colors duration-150 hover:bg-mist hover:text-ink disabled:opacity-50'

interface CourseActionsProps {
  course: Course
  onEdit: (course: Course) => void
  onSetStatus: (change: CourseStatusChange) => void
}

/** Edit, and archive or restore, which ask once first */
export function CourseActions({ course, onEdit, onSetStatus }: CourseActionsProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const isArchived = course.status === 'ARCHIVED'
  const nextStatus: CourseStatus = isArchived ? 'ACTIVE' : 'ARCHIVED'
  const verb = isArchived ? 'Restore' : 'Archive'

  const handleConfirm = () => {
    setIsConfirming(false)
    onSetStatus({ course, status: nextStatus })
  }

  if (isConfirming) {
    return (
      <ConfirmGroup
        label={`${verb} ${course.name}`}
        question={isArchived ? 'Its groups stay archived.' : 'Its active groups are archived too.'}
        confirmLabel={verb}
        onConfirm={handleConfirm}
        onCancel={() => setIsConfirming(false)}
      />
    )
  }

  return (
    <span className="inline-flex flex-nowrap items-center justify-end gap-1.5 whitespace-nowrap" role="group" aria-label={`Actions for ${course.name}`}>
      <button type="button" className={ACTION_CLASS} aria-label={`Edit ${course.name}`} onClick={() => onEdit(course)}>
        <Pencil size={15} strokeWidth={2} aria-hidden="true" />
        <span className="max-[640px]:sr-only">Edit</span>
      </button>
      <button type="button" className={ACTION_CLASS} aria-label={`${verb} ${course.name}`} onClick={() => setIsConfirming(true)}>
        {isArchived ? <ArchiveRestore size={15} strokeWidth={2} aria-hidden="true" /> : <Archive size={15} strokeWidth={2} aria-hidden="true" />}
        <span className="max-[640px]:sr-only">{verb}</span>
      </button>
    </span>
  )
}
