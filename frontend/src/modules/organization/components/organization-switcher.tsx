import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useSwitchOrganization } from '#/modules/auth/hooks/use-switch-organization'
import { ROLE_LABELS } from '#/modules/auth/utils/role-labels'
import type { SessionMembership } from '#/modules/auth/utils/session-user'
import { OrganizationMark } from './organization-mark'

const MENU_ITEM_SELECTOR = '[role^="menuitem"]'

/** Closed, or open with focus on the current organization or on the last item */
type MenuState = 'closed' | 'openOnChecked' | 'openOnLast'

const menuItems = (menu: HTMLElement) => Array.from(menu.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR))

// Module-level so React calls them once when the menu opens, not on every render
const focusCheckedItem = (menu: HTMLUListElement | null) => {
  menu?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
}

const focusLastItem = (menu: HTMLUListElement | null) => {
  if (menu) menuItems(menu).at(-1)?.focus()
}

type MoveFocusParams = {
  menu: HTMLElement
  key: string
}

/** Arrow keys wrap around the list; Home and End jump to its ends */
const moveFocus = ({ menu, key }: MoveFocusParams) => {
  const items = menuItems(menu)
  const current = items.findIndex((item) => item === document.activeElement)
  const lastIndex = items.length - 1
  const nextIndex = {
    ArrowDown: current === lastIndex ? 0 : current + 1,
    ArrowUp: current <= 0 ? lastIndex : current - 1,
    Home: 0,
    End: lastIndex,
  }[key]
  if (nextIndex === undefined) return false
  items[nextIndex]?.focus()
  return true
}

interface OrganizationSwitcherProps {
  memberships: SessionMembership[]
  activeMembership: SessionMembership
}

/** The organization card at the top of the sidebar; it opens a menu of the user's organizations */
export function OrganizationSwitcher({ memberships, activeMembership }: OrganizationSwitcherProps) {
  const switchOrganization = useSwitchOrganization()
  const [menuState, setMenuState] = useState<MenuState>('closed')
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const { organization } = activeMembership
  const roleLabel = ROLE_LABELS[activeMembership.role]
  const isOpen = menuState !== 'closed'

  // A press anywhere outside the switcher closes the menu; blur can't be trusted, as Safari doesn't focus buttons on click
  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && containerRef.current?.contains(event.target)) return
      setMenuState('closed')
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  const handleClose = () => {
    setMenuState('closed')
    buttonRef.current?.focus()
  }

  const handleToggle = () => {
    setMenuState((current) => (current === 'closed' ? 'openOnChecked' : 'closed'))
  }

  const handleButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    setMenuState(event.key === 'ArrowUp' ? 'openOnLast' : 'openOnChecked')
  }

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      handleClose()
      return
    }
    if (event.key === 'Tab') {
      setMenuState('closed')
      return
    }
    // Links only follow Enter on their own; a menu item answers to Space too
    if (event.key === ' ' && event.target instanceof HTMLAnchorElement) {
      event.preventDefault()
      event.target.click()
      return
    }
    if (moveFocus({ menu: event.currentTarget, key: event.key })) {
      event.preventDefault()
    }
  }

  const handleSelect = async (organizationId: string) => {
    handleClose()
    if (organizationId === organization.id) return
    await switchOrganization(organizationId)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="flex w-full items-center gap-3 rounded-xl bg-navy-2 px-3 py-2.5 text-left transition-colors duration-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-green"
        aria-label={`Switch organization. Current: ${organization.name}, ${roleLabel}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={handleToggle}
        onKeyDown={handleButtonKeyDown}
      >
        <OrganizationMark name={organization.name} />
        <span className="grid min-w-0 flex-1 leading-tight">
          <span className="truncate font-semibold text-white">{organization.name}</span>
          <span className="truncate text-[0.87rem] text-on-navy-2">{roleLabel}</span>
        </span>
        <ChevronsUpDown className="flex-none text-on-navy-2" size={16} strokeWidth={1.9} aria-hidden="true" />
      </button>

      {isOpen ? (
        <ul
          ref={menuState === 'openOnLast' ? focusLastItem : focusCheckedItem}
          id={menuId}
          role="menu"
          aria-label="Organizations"
          className="absolute inset-x-0 top-full z-20 mt-1.5 grid max-h-[min(60svh,420px)] gap-0.5 overflow-y-auto rounded-xl bg-white p-1.5 shadow-card"
          onKeyDown={handleMenuKeyDown}
        >
          {memberships.map((membership) => (
            <li key={membership.id} role="none">
              <OrganizationMenuItem
                membership={membership}
                isActive={membership.organization.id === organization.id}
                onSelect={handleSelect}
              />
            </li>
          ))}
          <li role="none" className="mt-1 border-t border-rule pt-1">
            <Link
              to="/organizations/new"
              role="menuitem"
              tabIndex={-1}
              className="flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 font-semibold text-ink no-underline transition-colors duration-150 hover:bg-mist focus-visible:bg-mist focus-visible:outline-none"
            >
              <Plus className="flex-none text-green-deep" size={16} strokeWidth={2.2} aria-hidden="true" />
              Create organization
            </Link>
          </li>
        </ul>
      ) : null}
    </div>
  )
}

interface OrganizationMenuItemProps {
  membership: SessionMembership
  isActive: boolean
  onSelect: (organizationId: string) => Promise<void>
}

function OrganizationMenuItem({ membership, isActive, onSelect }: OrganizationMenuItemProps) {
  const handleClick = async () => {
    await onSelect(membership.organization.id)
  }

  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={isActive}
      tabIndex={-1}
      className="flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left text-ink transition-colors duration-150 hover:bg-mist focus-visible:bg-mist focus-visible:outline-none"
      onClick={handleClick}
    >
      <span className="grid min-w-0 flex-1 leading-tight">
        <span className="truncate font-semibold">{membership.organization.name}</span>
        <span className="truncate text-[0.87rem] text-ink-3">{ROLE_LABELS[membership.role]}</span>
      </span>
      {isActive ? <Check className="flex-none text-green-deep" size={16} strokeWidth={2.2} aria-hidden="true" /> : null}
    </button>
  )
}
