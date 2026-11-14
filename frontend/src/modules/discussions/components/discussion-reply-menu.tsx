import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

interface DiscussionReplyMenuProps {
  /** Only offered when the member may edit this reply */
  canEdit: boolean
  /** Only offered when the member may remove this reply */
  canRemove: boolean
  /** The menu opens on the side facing the page's middle: left of the member's own bubbles, right of the others' */
  isMine: boolean
  onEdit: () => void
  onRemove: () => void
}

const MENU_ITEM_CLASS = 'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[0.93rem] font-semibold text-ink transition-colors duration-150 hover:bg-mist focus-visible:bg-mist focus-visible:outline-none'

/** The three dots beside a reply, shown on hover or focus, which open a small menu with Edit and Remove, like a social app's comment menu */
export function DiscussionReplyMenu({ canEdit, canRemove, isMine, onEdit, onRemove }: DiscussionReplyMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleClose = () => setIsOpen(false)

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') handleClose()
  }

  const handleEdit = () => {
    handleClose()
    onEdit()
  }

  const handleRemove = () => {
    handleClose()
    onRemove()
  }

  return (
    <div className="relative flex-none" onKeyDown={handleKeyDown}>
      <button
        type="button"
        aria-label="Reply actions"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`grid size-8 place-items-center rounded-full text-ink-3 transition-[opacity,background-color,color] duration-150 hover:bg-white hover:text-ink focus-visible:opacity-100 group-hover/row:opacity-100 group-focus-within/row:opacity-100 [@media(hover:none)]:opacity-100 ${isOpen ? 'bg-white text-ink opacity-100' : 'opacity-0'}`}
        onClick={() => setIsOpen((current) => !current)}
      >
        <MoreHorizontal size={18} strokeWidth={2} aria-hidden="true" />
      </button>
      {isOpen ? (
        <>
          {/* A click anywhere else closes the menu */}
          <button type="button" tabIndex={-1} aria-hidden="true" className="fixed inset-0 z-10 cursor-default" onClick={handleClose} />
          <div role="menu" aria-label="Reply actions" className={`absolute top-full z-20 mt-1 grid min-w-[9.5rem] gap-0.5 rounded-xl border border-rule bg-white p-1 shadow-[0_12px_32px_-12px_rgba(22,34,46,0.35)] ${isMine ? 'right-0' : 'left-0'}`}>
            {canEdit ? (
              <button type="button" role="menuitem" className={MENU_ITEM_CLASS} autoFocus onClick={handleEdit}>
                <Pencil size={15} strokeWidth={2} aria-hidden="true" />
                Edit reply
              </button>
            ) : null}
            {canRemove ? (
              <button type="button" role="menuitem" className={`${MENU_ITEM_CLASS} text-red`} autoFocus={!canEdit} onClick={handleRemove}>
                <Trash2 size={15} strokeWidth={2} aria-hidden="true" />
                Remove reply
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  )
}
