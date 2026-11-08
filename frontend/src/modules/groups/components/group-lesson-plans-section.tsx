import { useId } from 'react'
import { Presentation } from 'lucide-react'
import type { LessonPlan } from '@shigjetademy/shared/lesson-plans'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SectionCard } from '#/components/SectionCard'
import { SkeletonRows } from '#/components/SkeletonRows'
import { useFormatLessonSlot } from '#/lib/use-format-date'
import { useGroupLessonPlans } from '../hooks/use-group-lesson-plans'

interface GroupLessonPlansSectionProps {
  organizationId: string
  groupId: string
  /** The organization's day, for what counts as upcoming */
  today: string
}

/** The group's planned and covered sessions, upcoming and past, read-only here; they're edited on the Lessons page */
export function GroupLessonPlansSection({ organizationId, groupId, today }: GroupLessonPlansSectionProps) {
  return (
    <SectionCard title="Lessons">
      <LessonPlanLists organizationId={organizationId} groupId={groupId} today={today} />
    </SectionCard>
  )
}

interface LessonPlanListsProps {
  organizationId: string
  groupId: string
  today: string
}

function LessonPlanLists({ organizationId, groupId, today }: LessonPlanListsProps) {
  const plans = useGroupLessonPlans({ organizationId, groupId })

  if (plans.status === 'error') return <LoadError what="lesson plans" onRetry={() => void plans.refetch()} />
  if (!plans.data) return <SkeletonRows />
  if (plans.data.length === 0) return <EmptyMessage icon={Presentation} title="No lesson plans yet" text="Topics and covered notes show here once a session is planned." />

  const upcoming = plans.data.filter((plan) => plan.date >= today)
  // The server sends them earliest first; the past reads newest first
  const past = plans.data.filter((plan) => plan.date < today).toReversed()

  return (
    <div className="grid gap-5 px-5 py-4">
      <LessonPlanList title="Upcoming" plans={upcoming} />
      <LessonPlanList title="Past" plans={past} />
    </div>
  )
}

interface LessonPlanListProps {
  title: string
  plans: LessonPlan[]
}

function LessonPlanList({ title, plans }: LessonPlanListProps) {
  const titleId = useId()
  return (
    <section className="grid gap-2">
      <h3 id={titleId} className="text-[1.05rem] font-[650]">
        {title}
      </h3>
      {plans.length === 0 ? (
        <p className="text-ink-2">None.</p>
      ) : (
        <ul className="grid" aria-labelledby={titleId}>
          {plans.map((plan) => (
            <LessonPlanRow key={`${plan.date}-${plan.start_time}`} plan={plan} />
          ))}
        </ul>
      )}
    </section>
  )
}

interface LessonPlanRowProps {
  plan: LessonPlan
}

function LessonPlanRow({ plan }: LessonPlanRowProps) {
  const formatLessonSlot = useFormatLessonSlot()
  const slot = formatLessonSlot({ day: plan.date, time: plan.start_time })

  return (
    <li className="grid gap-0.5 border-b border-rule py-2.5 last:border-b-0" aria-label={slot}>
      <span className="tabular font-semibold">{slot}</span>
      {plan.rescheduled_from ? <span className="text-[0.93rem] text-ink-2">Rescheduled from {formatLessonSlot({ day: plan.rescheduled_from.date, time: plan.rescheduled_from.start_time })}</span> : null}
      <span>{plan.topic ?? <NotSet text="No topic yet" />}</span>
      <span className="text-ink-2">{plan.covered ?? <NotSet text="Nothing recorded yet" />}</span>
    </li>
  )
}

interface NotSetProps {
  text: string
}

function NotSet({ text }: NotSetProps) {
  return <span className="text-ink-2">{text}</span>
}
