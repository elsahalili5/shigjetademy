const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

/** "31 Oct 2026" in the user's locale */
export const formatDate = (iso: string) => dateFormat.format(new Date(iso))
