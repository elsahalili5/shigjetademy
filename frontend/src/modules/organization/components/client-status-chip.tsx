import type { OrganizationStatus } from '@shigjetademy/shared/organization'
import { ORGANIZATION_STATUS_CHIPS, ORGANIZATION_STATUS_LABELS } from '../utils/labels'

interface ClientStatusChipProps {
  status: OrganizationStatus
}

export function ClientStatusChip({ status }: ClientStatusChipProps) {
  return <span className={`chip ${ORGANIZATION_STATUS_CHIPS[status]}`}>{ORGANIZATION_STATUS_LABELS[status]}</span>
}
