import type { ReportTerm } from '@shigjetademy/shared/grades'

/** A term with its year, since terms of different years often share a name, like Autumn · 2026–27 */
export const getTermLabel = (term: ReportTerm) => `${term.name} · ${term.year_name}`
