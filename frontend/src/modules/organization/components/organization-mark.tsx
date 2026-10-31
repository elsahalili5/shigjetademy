interface OrganizationMarkProps {
  name: string
}

/** The organization's first letter on a kraft tile, beside its name in the sidebar */
export function OrganizationMark({ name }: OrganizationMarkProps) {
  return (
    <span className="grid size-9 flex-none place-items-center rounded-[10px] bg-kraft font-display font-bold text-navy" aria-hidden="true">
      {name.slice(0, 1)}
    </span>
  )
}
