import { AlertCircle, Check, X } from 'lucide-react'

export type Notice = { tone: 'success' | 'info'; text: string }

interface NoticeBarProps {
  notice: Notice
  onDismiss: () => void
}

/** What just happened on the page, until the user dismisses it */
export function NoticeBar({ notice, onDismiss }: NoticeBarProps) {
  const isSuccess = notice.tone === 'success'
  return (
    <p className={`flex items-center gap-2 rounded-xl px-4 py-3 font-[550] ${isSuccess ? 'bg-green-wash text-green-deep' : 'bg-kraft-wash text-kraft-ink'}`} role="status">
      {isSuccess ? <Check size={17} strokeWidth={2.2} aria-hidden="true" /> : <AlertCircle size={17} strokeWidth={2} aria-hidden="true" />}
      <span className="min-w-0 flex-1">{notice.text}</span>
      <button type="button" className="grid size-8 place-items-center rounded-full hover:bg-white/70" onClick={onDismiss} aria-label="Dismiss">
        <X size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </p>
  )
}
