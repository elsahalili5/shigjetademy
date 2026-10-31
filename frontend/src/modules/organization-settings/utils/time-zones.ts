/** "America/New_York" reads as "America / New York" */
export const formatTimeZone = (zone: string) => zone.replaceAll('_', ' ').replaceAll('/', ' / ')
