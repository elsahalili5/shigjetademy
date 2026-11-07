import type { Lecturer } from '@shigjetademy/shared/lecturers'
import { useFormatDate } from '#/lib/use-format-date'

const CHIP_CLASS = 'inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[0.87rem] font-semibold'

interface LecturerLoginStatusProps {
  lecturer: Lecturer
}

/** No login, Invited (to which email, until when) or Has login */
export function LecturerLoginStatus({ lecturer }: LecturerLoginStatusProps) {
  const formatDate = useFormatDate()
  switch (lecturer.login_status) {
    case 'NONE':
      return <span className="text-ink-3">No login</span>
    case 'INVITED':
      return (
        <span className="grid gap-0.5 leading-tight">
          <span className={`${CHIP_CLASS} bg-kraft-wash text-kraft-ink`}>Invited</span>
          {lecturer.invitation ? (
            <span className="text-[0.88rem] break-all text-ink-3">
              {lecturer.invitation.email} · until {formatDate(lecturer.invitation.expires_at)}
            </span>
          ) : null}
        </span>
      )
    case 'LINKED':
      return <span className={`${CHIP_CLASS} bg-green-wash text-green-deep`}>Has login</span>
    default: {
      const unknown: never = lecturer.login_status
      throw new Error(`Unknown login status: ${String(unknown)}`)
    }
  }
}
