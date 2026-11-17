import type { HandInStatus } from '@shigjetademy/shared/assignments'
import { HAND_IN_STATUS_LABELS } from '../utils/hand-in-status'

interface HandInStatusChipProps {
  status: HandInStatus
}

/** Where a student's hand-in stands */
export function HandInStatusChip({ status }: HandInStatusChipProps) {
  return <span className="flex-none rounded-full bg-mist px-2 py-0.5 text-[0.78rem] font-semibold text-ink-2">{HAND_IN_STATUS_LABELS[status]}</span>
}
