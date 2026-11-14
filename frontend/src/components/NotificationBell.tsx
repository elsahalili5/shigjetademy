import { Bell } from 'lucide-react'

/** The notifications bell in the top-right of a page header; for now it only shows the icon, without notifications behind it */
export function NotificationBell() {
  return (
    <button
      type="button"
      aria-label="Notifications"
      className="group grid size-11 flex-none place-items-center rounded-full border border-rule bg-white text-green-deep shadow-[0_1px_2px_rgba(22,34,46,0.05),0_10px_24px_-14px_rgba(22,34,46,0.3)] transition-[background-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-px hover:bg-green-wash hover:shadow-[0_1px_2px_rgba(22,34,46,0.06),0_14px_28px_-14px_rgba(22,34,46,0.4)] active:translate-y-0 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green"
    >
      <Bell className="transition-transform duration-300 ease-out group-hover:-rotate-12" size={20} strokeWidth={1.8} aria-hidden="true" />
    </button>
  )
}
