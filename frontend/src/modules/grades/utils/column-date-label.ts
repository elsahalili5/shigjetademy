import type { GradeColumnKind } from '@shigjetademy/shared/grades'

/** The word before a column's date: an assignment is due then, a test is held on it */
export const getColumnDateLabel = (kind: GradeColumnKind) => (kind === 'TEST' ? 'On' : 'Due')
