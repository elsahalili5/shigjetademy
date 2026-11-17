const BYTES_PER_KILOBYTE = 1024

const BYTES_PER_MEGABYTE = BYTES_PER_KILOBYTE * BYTES_PER_KILOBYTE

const kilobytes = new Intl.NumberFormat(undefined, { style: 'unit', unit: 'kilobyte', maximumFractionDigits: 1 })

const megabytes = new Intl.NumberFormat(undefined, { style: 'unit', unit: 'megabyte', maximumFractionDigits: 1 })

/** "1.2 kB" or "2.4 MB", counted in 1024s like the 20 MB upload limit */
export const formatFileSize = (bytes: number) => (bytes < BYTES_PER_MEGABYTE ? kilobytes.format(bytes / BYTES_PER_KILOBYTE) : megabytes.format(bytes / BYTES_PER_MEGABYTE))
