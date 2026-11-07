interface ConfirmGroupProps {
  label: string
  question: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/** A row action's one confirmation: the question, a confirm button and Cancel, named for screen readers */
export function ConfirmGroup({ label, question, confirmLabel, onConfirm, onCancel }: ConfirmGroupProps) {
  return (
    <span className="inline-flex flex-nowrap items-center justify-end gap-2 whitespace-nowrap" role="group" aria-label={label}>
      <span className="text-[0.93rem] text-ink-2">{question}</span>
      <button type="button" className="button button--primary min-h-9 px-3.5 text-[0.95rem]" onClick={onConfirm}>
        {confirmLabel}
      </button>
      <button type="button" className="button button--ghost min-h-9 px-3.5 text-[0.95rem]" onClick={onCancel}>
        Cancel
      </button>
    </span>
  )
}
