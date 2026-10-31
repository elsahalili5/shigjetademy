import { useId } from 'react'
import type { ReactNode, RefObject } from 'react'
import { X } from 'lucide-react'

interface FormDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  title: string
  subtitle: string
  onClose: () => void
  children: ReactNode
}

/** A native modal dialog with a title, a line under it and a close button; opened with dialogRef.current.showModal() */
export function FormDialog({ dialogRef, title, subtitle, onClose, children }: FormDialogProps) {
  const titleId = useId()
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="m-auto max-h-[min(92svh,820px)] w-[min(100%-32px,600px)] overflow-hidden rounded-panel bg-white p-0 text-ink shadow-card backdrop:bg-navy/50 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex max-h-[inherit] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-rule px-6 pt-6 pb-4">
          <div>
            <h2 id={titleId} className="text-[1.45rem] font-[680] tracking-[-0.02em]">
              {title}
            </h2>
            <p className="mt-1 text-[0.95rem] text-ink-2">{subtitle}</p>
          </div>
          <button type="button" className="grid size-10 flex-none place-items-center rounded-full text-ink-3 hover:bg-mist hover:text-ink" onClick={onClose} aria-label="Close">
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
