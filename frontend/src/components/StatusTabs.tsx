const countFormatter = new Intl.NumberFormat()

interface StatusTabsProps<TStatus extends string> {
  label: string
  statuses: readonly TStatus[]
  labels: Record<TStatus, string>
  /** Left out until the list has loaded */
  counts?: Record<TStatus, number>
  current: TStatus
  onChange: (status: TStatus) => void
}

/** A list's status tabs, each with how many records it holds */
export function StatusTabs<TStatus extends string>({ label, statuses, labels, counts, current, onChange }: StatusTabsProps<TStatus>) {
  return (
    <div role="tablist" aria-label={label} className="flex w-fit gap-1.5 rounded-full bg-mist p-1">
      {statuses.map((status) => (
        <button
          key={status}
          type="button"
          role="tab"
          aria-selected={status === current}
          className="inline-flex min-h-10 items-center gap-2 rounded-full px-4 font-semibold text-ink-2 transition-colors duration-150 hover:text-ink aria-selected:bg-white aria-selected:text-ink aria-selected:shadow-card"
          onClick={() => onChange(status)}
        >
          {labels[status]} <span className="tabular text-[0.9rem] text-ink-3">{counts ? countFormatter.format(counts[status]) : null}</span>
        </button>
      ))}
    </div>
  )
}
