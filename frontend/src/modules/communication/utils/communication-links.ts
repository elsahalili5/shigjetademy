import { Inbox, Megaphone, MessagesSquare } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type CommunicationLink = {
  to: '/dashboard/inbox' | '/dashboard/announcements' | '/dashboard/discussions'
  label: string
  icon: LucideIcon
}

/** The pages under the sidebar's Communication group, the same for every role; only Inbox is built so far */
export const COMMUNICATION_LINKS: readonly CommunicationLink[] = [
  { to: '/dashboard/inbox', label: 'Inbox', icon: Inbox },
  { to: '/dashboard/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/dashboard/discussions', label: 'Groups & Discussions', icon: MessagesSquare },
]

/** The sidebar's width at which it turns into a row along the top */
export const NARROW_SIDEBAR_QUERY = '(max-width: 860px)'
