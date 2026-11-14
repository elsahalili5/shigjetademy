import { Lock, Pin } from 'lucide-react'

const CHIP_CLASS = 'inline-flex flex-none items-center gap-1 rounded-full bg-mist px-2 py-0.5 text-[0.78rem] font-semibold text-ink-2'

/** A topic a moderator pinned to the top of the list */
export function PinnedChip() {
  return (
    <span className={CHIP_CLASS}>
      <Pin size={12} strokeWidth={2.2} aria-hidden="true" />
      Pinned
    </span>
  )
}

/** A topic that takes no new replies: locked by a moderator, or in an archived group or course */
export function LockedChip({ label }: { label: 'Locked' | 'Archived' }) {
  return (
    <span className={CHIP_CLASS}>
      <Lock size={12} strokeWidth={2.2} aria-hidden="true" />
      {label}
    </span>
  )
}

const getLockLabel = ({ isLocked, isSpaceArchived }: Pick<TopicChipsProps, 'isLocked' | 'isSpaceArchived'>) => {
  if (isSpaceArchived) return 'Archived'
  return isLocked ? 'Locked' : null
}

interface TopicChipsProps {
  isPinned: boolean
  isLocked: boolean
  isSpaceArchived: boolean
}

/** What sets a topic apart: pinned, and locked or in an archived space (which says more than locked) */
export function TopicChips({ isPinned, isLocked, isSpaceArchived }: TopicChipsProps) {
  const lockLabel = getLockLabel({ isLocked, isSpaceArchived })
  return (
    <>
      {isPinned ? <PinnedChip /> : null}
      {lockLabel ? <LockedChip label={lockLabel} /> : null}
    </>
  )
}
