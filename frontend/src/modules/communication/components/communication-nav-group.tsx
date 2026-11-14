import { useId, useState } from 'react'
import { ChevronDown, MessageSquare } from 'lucide-react'
import { Link, useMatchRoute } from '@tanstack/react-router'
import type { MemberRole } from '@shigjetademy/shared/auth'
import { useMediaQuery } from '#/hooks/useMediaQuery'
import { useSidebarRail } from '#/lib/sidebar-rail'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { useAnnouncementUnreadCount } from '#/modules/announcements/hooks/use-announcement-unread-count'
import { useDiscussionUnreadCount } from '#/modules/discussions/hooks/use-discussion-unread-count'
import { useInboxUnreadCount } from '#/modules/inbox/hooks/use-inbox-unread-count'
import { NARROW_SIDEBAR_QUERY, getCommunicationLinks } from '../utils/communication-links'

const MAX_BADGE_COUNT = 99

const formatBadge = (count: number) => (count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(count))

interface CommunicationNavGroupProps {
  /** The sidebar's own link style, so the group looks like its neighbours */
  linkClassName: string
}

/** The sidebar's Communication group for every role in an organization */
export function CommunicationNavGroup({ linkClassName }: CommunicationNavGroupProps) {
  const membership = useActiveMembership()
  if (!membership) return null
  return <CommunicationLinks organizationId={membership.organization.id} role={membership.role} linkClassName={linkClassName} />
}

interface CommunicationLinksProps {
  organizationId: string
  role: MemberRole
  linkClassName: string
}

type OpenOverride = {
  isOpen: boolean
  /** Whether the member was on a Communication page when they chose, so going to or leaving those pages hands control back to the route */
  wasOnRoute: boolean
}

/** An expandable group: it opens by itself on a Communication page, and on narrow screens its links sit in the row with the others */
function CommunicationLinks({ organizationId, role, linkClassName }: CommunicationLinksProps) {
  const matchRoute = useMatchRoute()
  const isNarrow = useMediaQuery(NARROW_SIDEBAR_QUERY)
  const unread = useInboxUnreadCount(organizationId)
  const announcementsUnread = useAnnouncementUnreadCount(organizationId)
  const links = getCommunicationLinks(role)
  const hasDiscussions = links.some((link) => link.to === '/dashboard/discussions')
  const discussionsUnread = useDiscussionUnreadCount({ organizationId, isEnabled: hasDiscussions })
  const sidebar = useSidebarRail()
  const [override, setOverride] = useState<OpenOverride | null>(null)
  const listId = useId()
  const isOnRoute = links.some((link) => !!matchRoute({ to: link.to }))
  const isChosenOpen = override && override.wasOnRoute === isOnRoute ? override.isOpen : isOnRoute
  // Its links only show in the full sidebar, so on the rail the group opens the sidebar
  const isOpen = isChosenOpen && !sidebar.isRail
  const unreadCount = unread.data?.unread_count ?? 0
  const unreadAnnouncementCount = announcementsUnread.data?.unread_count ?? 0
  const unreadDiscussionCount = hasDiscussions ? (discussionsUnread.data?.unread_count ?? 0) : 0
  const totalUnreadCount = unreadCount + unreadAnnouncementCount + unreadDiscussionCount

  const handleToggle = () => {
    if (sidebar.isRail) {
      sidebar.expand()
      setOverride({ isOpen: true, wasOnRoute: isOnRoute })
      return
    }
    setOverride({ isOpen: !isOpen, wasOnRoute: isOnRoute })
  }

  return (
    <div role="group" aria-label="Communication" className="flex flex-col gap-0.5 max-[860px]:flex-none max-[860px]:flex-row max-[860px]:gap-1.5">
      {isNarrow ? null : (
        <button
          type="button"
          className={`${linkClassName} relative w-full text-left ${isOnRoute ? 'text-white' : ''}`}
          aria-expanded={isOpen}
          aria-controls={listId}
          title={sidebar.isRail ? 'Communication' : undefined}
          onClick={handleToggle}
        >
          <MessageSquare size={18} strokeWidth={1.9} aria-hidden="true" />
          <span className="rail:sr-only">Communication</span>
          {!isOpen && totalUnreadCount > 0 ? <UnreadBadge count={totalUnreadCount} label={totalUnreadCount === unreadCount ? 'unread messages' : 'unread'} /> : null}
          <ChevronDown
            className={`${totalUnreadCount > 0 && !isOpen ? '' : 'ml-auto'} transition-transform duration-[180ms] rail:hidden ${isOpen ? 'rotate-180' : ''}`}
            size={16}
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>
      )}
      {isNarrow || isOpen ? (
        <div id={listId} className="flex flex-col gap-0.5 max-[860px]:flex-none max-[860px]:flex-row max-[860px]:gap-1.5">
          {links.map((link) => (
            <Link key={link.to} to={link.to} className={`${linkClassName} min-[861px]:pl-10`}>
              <link.icon size={18} strokeWidth={1.9} aria-hidden="true" />
              {link.label}
              {link.to === '/dashboard/inbox' && unreadCount > 0 ? <UnreadBadge count={unreadCount} label="unread messages" /> : null}
              {link.to === '/dashboard/announcements' && unreadAnnouncementCount > 0 ? <UnreadBadge count={unreadAnnouncementCount} label="unread announcements" /> : null}
              {link.to === '/dashboard/discussions' && unreadDiscussionCount > 0 ? <UnreadBadge count={unreadDiscussionCount} label="unread topics" /> : null}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}

interface UnreadBadgeProps {
  count: number
  /** What is unread, read out after the number */
  label: string
}

function UnreadBadge({ count, label }: UnreadBadgeProps) {
  return (
    <span
      className="ml-auto min-w-5 rounded-full rail:absolute rail:top-0.5 rail:right-1 rail:ml-0 rail:min-w-4 rail:px-1 rail:text-[0.65rem] bg-green px-1.5 py-px text-center text-[0.75rem] leading-snug font-bold text-navy"
      aria-label={`${count} ${label}`}
    >
      {formatBadge(count)}
    </span>
  )
}
