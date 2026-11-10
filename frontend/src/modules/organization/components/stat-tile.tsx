const numberFormat = new Intl.NumberFormat()

interface StatTileProps {
  label: string
  value: number
  detail: string
}

/** One headline number on its own card, with a short line of context underneath */
export function StatTile({ label, value, detail }: StatTileProps) {
  return (
    <div className="rounded-card border border-rule p-5">
      <dt className="text-[0.93rem] font-semibold text-ink-2">{label}</dt>
      <dd className="tabular mt-2 font-display text-[2.2rem] leading-none font-[680] tracking-[-0.03em]">{numberFormat.format(value)}</dd>
      <dd className="mt-2 text-[0.88rem] text-ink-3">{detail}</dd>
    </div>
  )
}
