const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export const formatDateTime = (iso: string) => dateTimeFormat.format(new Date(iso))
