import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Plus, Target, X } from 'lucide-react'
import type { FocusGoal } from '../utils/focus-session'

const GOAL_MAX_LENGTH = 140

interface FocusGoalCardProps {
  goals: readonly FocusGoal[]
  onAdd: (text: string) => void
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}

/** The student's goals for this sitting: add one, tick it off when reached, then add the next */
export function FocusGoalCard({ goals, onAdd, onToggle, onRemove }: FocusGoalCardProps) {
  const inputId = useId()
  const [draft, setDraft] = useState('')
  const doneCount = goals.filter((goal) => goal.isDone).length
  const hasGoals = goals.length > 0
  const isAllDone = hasGoals && doneCount === goals.length

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft.trim()) return
    onAdd(draft)
    setDraft('')
  }

  return (
    <section aria-label="Your goals" className={`rounded-[28px] border p-6 transition-colors duration-300 ease-out ${isAllDone ? 'border-green/40 bg-green-wash/60' : 'border-rule bg-white shadow-card'}`}>
      <div className="flex items-center gap-3">
        <span className="grid size-11 flex-none place-items-center rounded-2xl bg-green-wash text-green-deep" aria-hidden="true">
          <Target size={21} strokeWidth={1.9} />
        </span>
        <div className="grid flex-1 leading-tight">
          <h2 className="text-[1.15rem] font-[650]">Your goals</h2>
          <span className="text-[0.92rem] text-ink-3">Small enough to finish, one at a time</span>
        </div>
        {hasGoals ? (
          <span className="rounded-full bg-mist px-2.5 py-1 font-data text-[0.78rem] text-ink-2 tabular-nums">
            {doneCount} of {goals.length} done
          </span>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="mt-5">
        <label htmlFor={inputId} className="block font-semibold">
          What will you work on?
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id={inputId}
            type="text"
            value={draft}
            maxLength={GOAL_MAX_LENGTH}
            placeholder={hasGoals ? 'Add the next goal' : 'Finish the maths homework, exercises 1 to 10'}
            onChange={(event) => setDraft(event.target.value)}
            className="min-h-12 min-w-0 flex-1 rounded-2xl border border-rule-strong bg-white px-4 text-base transition-shadow duration-200 placeholder:text-ink-3 focus-visible:border-green-deep focus-visible:shadow-[0_0_0_4px_var(--green-wash)] focus-visible:outline-none"
          />
          <button type="submit" className="button button--primary min-h-12 px-4 text-base" disabled={!draft.trim()}>
            <Plus size={17} strokeWidth={2.2} aria-hidden="true" />
            Add goal
          </button>
        </div>
      </form>

      {hasGoals ? (
        <ul className="mt-4 grid gap-2">
          {goals.map((goal) => (
            <FocusGoalItem key={goal.id} goal={goal} onToggle={onToggle} onRemove={onRemove} />
          ))}
        </ul>
      ) : null}

      {isAllDone ? <p className="mt-4 font-semibold text-green-deep">Every goal reached. Add another or take a break.</p> : null}
    </section>
  )
}

interface FocusGoalItemProps {
  goal: FocusGoal
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}

function FocusGoalItem({ goal, onToggle, onRemove }: FocusGoalItemProps) {
  return (
    <li className={`group flex items-center gap-2 rounded-2xl border px-3 py-2 transition-colors duration-200 ${goal.isDone ? 'border-transparent bg-white/70' : 'border-rule bg-white'}`}>
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-green">
        <input type="checkbox" checked={goal.isDone} onChange={() => onToggle(goal.id)} className="sr-only" />
        <span
          className={`grid size-6 flex-none place-items-center rounded-full border-2 transition-colors duration-200 ${goal.isDone ? 'border-green-deep bg-green-deep text-white' : 'border-ink-3 group-hover:border-green-deep'}`}
          aria-hidden="true"
        >
          {goal.isDone ? <Check size={14} strokeWidth={3} /> : null}
        </span>
        <span className={`min-w-0 break-words ${goal.isDone ? 'text-ink-3 line-through decoration-green-deep/60' : 'text-ink'}`}>{goal.text}</span>
      </label>
      <button
        type="button"
        onClick={() => onRemove(goal.id)}
        aria-label={`Remove ${goal.text}`}
        className="grid size-8 flex-none place-items-center rounded-full text-ink-3 transition-colors duration-200 hover:bg-mist hover:text-ink focus-visible:outline-2 focus-visible:outline-green"
      >
        <X size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </li>
  )
}
