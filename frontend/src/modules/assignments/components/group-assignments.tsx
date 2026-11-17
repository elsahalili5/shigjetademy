import { useRef, useState } from 'react'
import { Archive, NotebookPen } from 'lucide-react'
import type { AssignmentGroup } from '@shigjetademy/shared/assignments'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SelectField } from '#/components/SelectField'
import { SkeletonRows } from '#/components/SkeletonRows'
import { TableToolbar } from '#/components/TableToolbar'
import { useAssignmentGroups } from '../hooks/use-assignment-groups'
import { useAssignments } from '../hooks/use-assignments'
import { AssignmentFormDialog } from './assignment-form-dialog'
import { AssignmentList } from './assignment-list'

interface GroupAssignmentsProps {
  organizationId: string
  timeZone: string
}

/** For lecturers and staff: the groups they set assignments for, one at a time */
export function GroupAssignments({ organizationId, timeZone }: GroupAssignmentsProps) {
  const groups = useAssignmentGroups(organizationId)

  if (groups.status === 'error') return <LoadError what="groups" onRetry={() => void groups.refetch()} />
  if (!groups.data) return <SkeletonRows />
  if (groups.data.length === 0) return <EmptyMessage icon={NotebookPen} title="You don’t teach a group yet." text="Assignments show for the groups you teach." />
  return <PickedGroupAssignments organizationId={organizationId} timeZone={timeZone} groups={groups.data} />
}

interface PickedGroupAssignmentsProps extends GroupAssignmentsProps {
  groups: AssignmentGroup[]
}

const groupLabel = (group: AssignmentGroup) => `${group.name} · ${group.course_name}${group.is_archived ? ' (archived)' : ''}`

/** The group picker and Set assignment in one row, and the chosen group's assignments under them */
function PickedGroupAssignments({ organizationId, timeZone, groups }: PickedGroupAssignmentsProps) {
  const [pickedId, setPickedId] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const group = groups.find((item) => item.id === pickedId) ?? groups[0]
  const assignments = useAssignments({ organizationId, groupId: group.id })

  return (
    <>
      <div className="px-[clamp(20px,3.4vw,44px)] pb-5">
        <TableToolbar
          addLabel="Set assignment"
          onAdd={group.can_set ? () => dialogRef.current?.showModal() : undefined}
          search={
            <div className="w-[min(100%,320px)]">
              <SelectField id="assignment-group-picker" label="Group" value={group.id} onChange={(event) => setPickedId(event.target.value)}>
                {groups.map((item) => (
                  <option key={item.id} value={item.id}>
                    {groupLabel(item)}
                  </option>
                ))}
              </SelectField>
            </div>
          }
        />
      </div>
      <div className="grid gap-4 px-[clamp(20px,3.4vw,44px)] pt-4 pb-10">
        {group.is_archived ? (
          <p className="flex items-center gap-2 rounded-xl bg-kraft-wash px-4 py-3 font-[550] text-kraft-ink">
            <Archive size={17} strokeWidth={2} aria-hidden="true" />
            This group is archived. Its assignments and hand-ins stay readable, and nothing can be changed.
          </p>
        ) : null}
        <AssignmentList organizationId={organizationId} timeZone={timeZone} status={assignments.status} assignments={assignments.data} onRetry={() => void assignments.refetch()} />
      </div>
      {group.can_set ? <AssignmentFormDialog key={group.id} dialogRef={dialogRef} organizationId={organizationId} group={group} timeZone={timeZone} /> : null}
    </>
  )
}
