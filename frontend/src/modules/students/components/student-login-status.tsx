import type { Student } from '@shigjetademy/shared/students'
import { useFormatDate } from '#/lib/use-format-date'

const CHIP_CLASS = 'inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[0.87rem] font-semibold'

interface StudentLoginStatusProps {
  student: Student
}

/** No login, Invited (to which email, until when) or Has login */
export function StudentLoginStatus({ student }: StudentLoginStatusProps) {
  const formatDate = useFormatDate()
  switch (student.login_status) {
    case 'NONE':
      return <span className="text-ink-3">No login</span>
    case 'INVITED':
      return (
        <span className="grid gap-0.5 leading-tight">
          <span className={`${CHIP_CLASS} bg-kraft-wash text-kraft-ink`}>Invited</span>
          {student.invitation ? (
            <span className="text-[0.88rem] break-all text-ink-3">
              {student.invitation.email} · until {formatDate(student.invitation.expires_at)}
            </span>
          ) : null}
        </span>
      )
    case 'LINKED':
      return <span className={`${CHIP_CLASS} bg-green-wash text-green-deep`}>Has login</span>
    default: {
      const unknown: never = student.login_status
      throw new Error(`Unknown login status: ${String(unknown)}`)
    }
  }
}
