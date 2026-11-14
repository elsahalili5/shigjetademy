import type { ReactNode } from 'react'
import { fullName } from '#/lib/full-name'
import { initials } from '#/lib/initials'

interface DiscussionAuthor {
  first_name: string
  last_name: string
}

interface DiscussionBubbleProps {
  author: DiscussionAuthor
  /** True for the signed-in member's own posts, shown on the right */
  isMine: boolean
  /** The first of a run of posts from one person, which gets more space above it and the author's name */
  isFirstInRun: boolean
  /** The last of a run, which gets the point of the bubble and the author's avatar */
  isLastInRun: boolean
  /** The post's words, or the edit box while it is being changed */
  children: ReactNode
  /** The time of day, like "09:15", and a note like "(edited)" */
  meta: ReactNode
  /** The three-dots menu beside the bubble, shown on hover */
  menu?: ReactNode
  /** Notes under the bubble, like a remove confirmation or an error */
  actions?: ReactNode
  /** A wide bubble, for the edit box */
  isWide?: boolean
}

/** One chat bubble of a discussion: the member's own in green on the right, everyone else's in white on the left with their name and avatar */
export function DiscussionBubble({ author, isMine, isFirstInRun, isLastInRun, children, meta, menu, actions, isWide = false }: DiscussionBubbleProps) {
  const name = fullName(author)
  const bubbleShape = isMine ? `rounded-2xl ${isLastInRun ? 'rounded-br-sm' : ''}` : `rounded-2xl ${isLastInRun ? 'rounded-bl-sm' : ''}`
  // The edit box sits on white, so a bubble being edited is not green
  const isGreen = isMine && !isWide
  const bubbleColors = isGreen ? 'bg-green-deep text-white' : 'border border-rule bg-white text-ink'

  return (
    <div className={`flex items-end gap-2 ${isFirstInRun ? 'mt-3 group-first/row:mt-0' : 'mt-0.5'} ${isMine ? 'justify-end' : 'justify-start'}`}>
      {isMine ? null : (
        <span className="grid size-8 flex-none place-items-center" aria-hidden="true">
          {isLastInRun ? <span className="grid size-8 place-items-center rounded-full bg-green-wash text-[0.78rem] font-bold text-green-deep">{initials(name)}</span> : null}
        </span>
      )}
      <div className={`grid min-w-0 gap-1 ${isWide ? 'w-full max-w-[34rem]' : 'max-w-[min(34rem,80%)]'} ${isMine ? 'justify-items-end' : 'justify-items-start'}`}>
        <div className={`flex min-w-0 items-center gap-1 ${isWide ? 'w-full' : ''} ${isMine ? 'flex-row-reverse' : ''}`}>
          <div className={`grid min-w-0 gap-0.5 px-3.5 pt-2 pb-1.5 shadow-[0_1px_1px_rgba(22,34,46,0.05)] ${isWide ? 'w-full' : ''} ${bubbleShape} ${bubbleColors}`}>
          {isMine || !isFirstInRun ? null : <span className="text-[0.82rem] font-semibold text-green-deep">{name}</span>}
          {isMine && isFirstInRun ? <span className="sr-only">{name}</span> : null}
          {children}
          <span className={`flex items-center justify-end gap-1.5 text-[0.75rem] ${isGreen ? 'text-white/75' : 'text-ink-3'}`}>{meta}</span>
        </div>
          {menu}
        </div>
        {actions}
      </div>
    </div>
  )
}
