import { useId } from 'react'

export type GroupFilterOption = {
  id: string
  label: string
}

interface GroupFilterSelectProps {
  groups: GroupFilterOption[]
  /** The picked group's id, or '' for all groups */
  value: string
  onChange: (groupId: string) => void
}

/** A rounded "All groups" dropdown that sits in line with a list's search box */
export function GroupFilterSelect({ groups, value, onChange }: GroupFilterSelectProps) {
  const selectId = useId()
  return (
    <div className="flex-none">
      <label htmlFor={selectId} className="visually-hidden">
        Filter by group
      </label>
      <select
        id={selectId}
        className="min-h-10 max-w-[240px] rounded-full border border-rule-strong bg-white px-4 text-[0.95rem] transition-[border-color,box-shadow] duration-150 hover:border-ink-3 focus:border-green-deep focus:shadow-[0_0_0_3px_var(--green-wash)] focus:outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">All groups</option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.label}
          </option>
        ))}
      </select>
    </div>
  )
}
