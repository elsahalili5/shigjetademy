import { useId } from 'react'
import { UsersRound } from 'lucide-react'
import type { UseQueryResult } from '@tanstack/react-query'
import type { ParentNoteGroup } from '@shigjetademy/shared/parent-notes'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SectionCard } from '#/components/SectionCard'
import { SelectField } from '#/components/SelectField'
import { SkeletonRows } from '#/components/SkeletonRows'
import { fullName } from '#/lib/full-name'
import { ParentNoteThread } from './parent-note-thread'

interface ParentNoteWorkspaceProps {
  organizationId: string
  groups: UseQueryResult<ParentNoteGroup[]>
  groupId: string
  studentId: string | null
  onSelectGroup: (groupId: string) => void
  onSelectStudent: (studentId: string | null) => void
  onBack: () => void
}

/** The lecturer's groups and students to pick from, and under them the picked student's conversation with the note to write */
export function ParentNoteWorkspace({ organizationId, groups, groupId, studentId, onSelectGroup, onSelectStudent, onBack }: ParentNoteWorkspaceProps) {
  // An opened conversation shows only that student's history; Back returns to the pickers
  if (studentId) return <ParentNoteThread key={studentId} organizationId={organizationId} studentId={studentId} onBack={onBack} />
  return (
    <div className="grid min-w-0 gap-5">
      <SectionCard title="Write a note">
        <WorkspacePickers groups={groups} groupId={groupId} studentId={studentId} onSelectGroup={onSelectGroup} onSelectStudent={onSelectStudent} />
      </SectionCard>
    </div>
  )
}

type WorkspacePickersProps = Omit<ParentNoteWorkspaceProps, 'organizationId' | 'onBack'>

function WorkspacePickers({ groups, groupId, studentId, onSelectGroup, onSelectStudent }: WorkspacePickersProps) {
  const ids = { group: useId(), student: useId() }
  if (groups.status === 'error') return <LoadError what="groups" onRetry={() => void groups.refetch()} />
  if (!groups.data) return <SkeletonRows />
  if (groups.data.length === 0) return <EmptyMessage icon={UsersRound} title="No groups yet" text="Once you’re teaching a group, you can write to its students’ parents here." />

  const group = groups.data.find((item) => item.id === groupId)

  return (
    <div className="grid gap-4 p-5">
      <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
        <SelectField id={ids.group} label="Group" value={groupId} onChange={(event) => onSelectGroup(event.target.value)}>
          <option value="">Choose a group</option>
          {groups.data.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          id={ids.student}
          label="Student"
          disabled={!group}
          value={group?.students.some((student) => student.id === studentId) ? (studentId ?? '') : ''}
          onChange={(event) => onSelectStudent(event.target.value || null)}
        >
          <option value="">{group ? 'Choose a student' : 'Choose a group first'}</option>
          {group?.students.map((student) => (
            <option key={student.id} value={student.id}>
              {fullName(student)}
            </option>
          ))}
        </SelectField>
      </div>
      {group && group.students.length === 0 ? <p className="text-ink-2">{group.name} has no active students yet.</p> : null}
      <p className="text-ink-2">Pick a group and a student, or open a conversation on the left.</p>
    </div>
  )
}
