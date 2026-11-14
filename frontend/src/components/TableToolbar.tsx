import { Plus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface TableToolbarProps {
  /** The table's search box, in its top-left corner */
  search?: ReactNode
  addLabel: string
  /** Left out when the user can't add, so only the search shows */
  onAdd?: () => void
  addIcon?: LucideIcon
}

/** The row right above a table: its search box in the left corner and its add button in the right corner. It pulls the table up closer than the page's usual gap. */
export function TableToolbar({ search, addLabel, onAdd, addIcon: Icon = Plus }: TableToolbarProps) {
  return (
    <div className="-mb-2 flex flex-wrap items-center justify-between gap-3">
      {search}
      {onAdd ? (
        <button type="button" className="button button--primary ml-auto min-h-10 px-3.5 text-[0.95rem]" onClick={onAdd}>
          <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
          {addLabel}
        </button>
      ) : null}
    </div>
  )
}

interface TableAddButtonProps {
  label: string
  onClick: () => void
  icon?: LucideIcon
}

/** The add button alone above a table that has no search box, in its top-right corner */
export function TableAddButton({ label, onClick, icon }: TableAddButtonProps) {
  return <TableToolbar addLabel={label} onAdd={onClick} addIcon={icon} />
}
