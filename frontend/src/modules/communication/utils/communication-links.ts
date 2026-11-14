import { Inbox, Megaphone, MessagesSquare } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MemberRole } from '@shigjetademy/shared/auth'

type CommunicationLink = {
  to: '/dashboard/inbox' | '/dashboard/announcements' | '/dashboard/discussions'
  label: string
  icon: LucideIcon
  /** Roles that don't get the link */
  excludedRoles?: readonly MemberRole[]
}

/** The pages under the sidebar's Communication group; guardians take no part in Groups & Discussions */
export const COMMUNICATION_LINKS: readonly CommunicationLink[] = [
  { to: '/dashboard/inbox', label: 'Inbox', icon: Inbox },
  { to: '/dashboard/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/dashboard/discussions', label: 'Groups & Discussions', icon: MessagesSquare, excludedRoles: ['GUARDIAN'] },
]

/** The sidebar's width at which it turns into a row along the top */
export const NARROW_SIDEBAR_QUERY = '(max-width: 860px)'

/** The Communication links a role sees */
export const getCommunicationLinks = (role: MemberRole) => COMMUNICATION_LINKS.filter((link) => !link.excludedRoles?.includes(role))
