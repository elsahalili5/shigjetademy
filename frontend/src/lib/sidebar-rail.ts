import { createContext, useContext } from 'react'

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'shigjetademy-sidebar-collapsed'

export const readSidebarCollapsed = (): boolean => {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true'
  } catch {
    // Unreadable storage starts with the full sidebar
    return false
  }
}

export const storeSidebarCollapsed = (isCollapsed: boolean) => {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(isCollapsed))
  } catch {
    // Blocked storage keeps the choice for this visit only
  }
}

type SidebarRail = {
  /** The desktop sidebar is collapsed to its icons */
  isRail: boolean
  /** Opens the full sidebar, for a group whose links only show there */
  expand: () => void
}

export const SidebarRailContext = createContext<SidebarRail>({
  isRail: false,
  expand: () => undefined,
})

/** Whether the sidebar shows icons only, and how a menu inside it opens it again */
export const useSidebarRail = () => useContext(SidebarRailContext)
