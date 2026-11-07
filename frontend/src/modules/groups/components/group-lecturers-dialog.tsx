import type { RefObject } from 'react'
import type { Group, GroupLecturerOption } from '@shigjetademy/shared/groups'
import { FormDialog } from '#/components/FormDialog'
import { GroupLecturersContent } from './group-lecturers-content'

export type GroupLecturersDialogMode = {
  /** Null until a group's Lecturers action opens the dialog */
  group: Group | null
  openCount: number
}

interface GroupLecturersDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  organizationId: string
  mode: GroupLecturersDialogMode
  /** Who the substitution form offers */
  lecturers: GroupLecturerOption[]
  timeZone: string
}

/** Who teaches a group, who taught it before and who covers it */
export function GroupLecturersDialog({ dialogRef, organizationId, mode, lecturers, timeZone }: GroupLecturersDialogProps) {
  const { group } = mode
  const handleClose = () => dialogRef.current?.close()

  return (
    <FormDialog dialogRef={dialogRef} title={group ? `Lecturers of ${group.name}` : 'Lecturers'} subtitle="Who teaches this group, and who covers it." onClose={handleClose}>
      {/* A new key per opening remounts the content, so an old group's state doesn't come back */}
      {group ? <GroupLecturersContent key={mode.openCount} organizationId={organizationId} group={group} lecturers={lecturers} timeZone={timeZone} /> : null}
    </FormDialog>
  )
}
