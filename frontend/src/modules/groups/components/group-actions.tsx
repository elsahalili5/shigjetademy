import { useState } from 'react'
import { Archive, ArchiveRestore, Pencil } from 'lucide-react'
import type { Group, GroupStatus } from '@shigjetademy/shared/groups'
import { ConfirmGroup } from '#/components/ConfirmGroup'

export type GroupStatusChange = {
  group: Group
  status: GroupStatus
}

const ACTION_CLASS =
  'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[0.93rem] font-semibold text-ink-2 transition-colors duration-150 hover:bg-mist hover:text-ink disabled:opacity-50'

interface GroupActionsProps {
  group: Group
  onEdit: (group: Group) => void
  onSetStatus: (change: GroupStatusChange) => void
}

/** Edit, and archive or restore, which ask once first */
export function GroupActions({ group, onEdit, onSetStatus }: GroupActionsProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const isArchived = group.status === 'ARCHIVED'
  const nextStatus: GroupStatus = isArchived ? 'ACTIVE' : 'ARCHIVED'
  const verb = isArchived ? 'Restore' : 'Archive'

  const handleConfirm = () => {
    setIsConfirming(false)
    onSetStatus({ group, status: nextStatus })
  }

  if (isConfirming) {
    return (
      <ConfirmGroup
        label={`${verb} ${group.name}`}
        question={isArchived ? 'Back to the active list?' : 'It stays on record.'}
        confirmLabel={verb}
        onConfirm={handleConfirm}
        onCancel={() => setIsConfirming(false)}
      />
    )
  }

  return (
    <span className="inline-flex flex-nowrap items-center justify-end gap-1.5 whitespace-nowrap" role="group" aria-label={`Actions for ${group.name}`}>
      <button type="button" className={ACTION_CLASS} aria-label={`Edit ${group.name}`} onClick={() => onEdit(group)}>
        <Pencil size={15} strokeWidth={2} aria-hidden="true" />
        <span className="max-[640px]:sr-only">Edit</span>
      </button>
      <button type="button" className={ACTION_CLASS} aria-label={`${verb} ${group.name}`} onClick={() => setIsConfirming(true)}>
        {isArchived ? <ArchiveRestore size={15} strokeWidth={2} aria-hidden="true" /> : <Archive size={15} strokeWidth={2} aria-hidden="true" />}
        <span className="max-[640px]:sr-only">{verb}</span>
      </button>
    </span>
  )
}
