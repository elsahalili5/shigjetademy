interface FormDialogFooterProps {
  submitLabel: string
  isPending: boolean
  onCancel: () => void
}

/** A dialog form's Cancel and submit buttons; the submit button waits while saving */
export function FormDialogFooter({ submitLabel, isPending, onCancel }: FormDialogFooterProps) {
  return (
    <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-rule px-6 py-4">
      <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onCancel}>
        Cancel
      </button>
      <button type="submit" className="button button--primary min-h-11 px-5 text-base" disabled={isPending}>
        {isPending ? 'Saving…' : submitLabel}
      </button>
    </footer>
  )
}
