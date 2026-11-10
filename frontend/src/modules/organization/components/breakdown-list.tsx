const numberFormat = new Intl.NumberFormat()

interface BreakdownListProps {
  rows: { key: string; label: string; count: number }[]
}

/** A ranked list of counts, each as a label and a filled bar sized against the highest one */
export function BreakdownList({ rows }: BreakdownListProps) {
  const highest = Math.max(1, ...rows.map((row) => row.count))
  return (
    <ul className="mt-4 grid gap-3">
      {rows.map((row) => (
        <li key={row.key} className="grid gap-1.5">
          <span className="flex justify-between text-[0.95rem]">
            <span className="text-ink-2 first-letter:uppercase">{row.label}</span>
            <span className="tabular font-semibold">{numberFormat.format(row.count)}</span>
          </span>
          <span className="h-2 overflow-hidden rounded-full bg-mist" aria-hidden="true">
            <span className="block h-full rounded-full bg-green-deep" style={{ width: `${(row.count / highest) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  )
}
