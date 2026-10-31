export const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

export const regionNames = new Intl.DisplayNames(undefined, { type: 'region' })

export const formatDate = (iso: string) => dateFormat.format(new Date(iso))

export const currencyNames = new Intl.DisplayNames(undefined, { type: 'currency' })
