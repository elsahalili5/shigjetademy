import { Timer } from 'lucide-react'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { useTitle } from '#/lib/use-title'
import { useFocusSession } from '../hooks/use-focus-session'
import { formatCountdown, getCurrentGoal, getFocusTimerStatus } from '../utils/focus-session'
import { FocusGoalCard } from './focus-goal-card'
import { FocusTimerCard } from './focus-timer-card'
import { FocusTipsCard } from './focus-tips-card'

/** A student's focus timer: goals for the sitting, a length to pick, and a countdown that keeps running while they use the rest of the app */
export function FocusPage() {
  const focus = useFocusSession()
  const status = getFocusTimerStatus({ session: focus.session, isFinished: focus.isFinished })
  const countdown = formatCountdown(focus.remainingMs)
  useTitle(status === 'running' ? `${countdown} · Focus` : 'Focus · Shigjetademy')

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={Timer} title="Focus" subtitle="Set a goal, start the timer and work on one thing until it rings." />
      <div className="grid max-w-[1120px] items-start gap-5 px-[clamp(20px,3.4vw,44px)] pb-10 min-[1080px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <FocusTimerCard
          status={status}
          minutes={focus.session.minutes}
          remainingMs={focus.remainingMs}
          goal={getCurrentGoal(focus.session.goals)?.text ?? ''}
          onMinutesChange={focus.setMinutes}
          onStart={focus.start}
          onPause={focus.pause}
          onReset={focus.reset}
        />
        <div className="grid gap-5">
          <FocusGoalCard goals={focus.session.goals} onAdd={focus.addGoal} onToggle={focus.toggleGoal} onRemove={focus.removeGoal} />
          <FocusTipsCard />
        </div>
      </div>
    </div>
  )
}
