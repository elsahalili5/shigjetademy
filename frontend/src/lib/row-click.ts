// A table row that opens a page on click still leaves its own controls alone

/** The classes of a clickable table row: the hover background and the pointer */
export const CLICKABLE_ROW_CLASS = 'cursor-pointer transition-colors duration-150 hover:bg-haze'

/** The focus ring of the link that names a clickable row, so keyboard users see where they are */
export const ROW_LINK_CLASS = 'rounded-sm font-semibold text-ink no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-deep'

/** Marks the cell holding a row's actions, whose clicks never open the row */
export const ROW_ACTIONS_ATTRIBUTE = { 'data-row-actions': true } as const

/** Whether a click on a row landed on a link, a form control or the actions cell, which handle it themselves */
export const isRowControlClick = (target: EventTarget | null) => target instanceof Element && !!target.closest('a, button, input, select, textarea, label, [data-row-actions]')

type RowClick = Pick<MouseEvent, 'target' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>

/** Whether a row click should leave the page as it is: a control's own click, a modifier click the browser handles (a new tab or window), or the end of a text selection */
export const isRowClickIgnored = (event: RowClick) =>
  isRowControlClick(event.target) || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !!window.getSelection()?.toString()
