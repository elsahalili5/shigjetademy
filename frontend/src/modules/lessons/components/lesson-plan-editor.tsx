import { useId, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { LessonPlan } from '@shigjetademy/shared/lesson-plans'
import { FormAlert } from '#/components/FormAlert'
import { LoadError } from '#/components/LoadError'
import { SectionCard } from '#/components/SectionCard'
import { SkeletonRows } from '#/components/SkeletonRows'
import { getErrorMessage } from '#/lib/error-message'
import { useFormatDay, useFormatLessonSlot } from '#/lib/use-format-date'
import { AuthField } from '#/modules/auth/components/auth-field'
import type { PlanParams } from '../api/lesson-plans-api'
import { useLessonPlan } from '../hooks/use-lesson-plan'
import { useSaveLessonPlanCovered } from '../hooks/use-save-lesson-plan-covered'
import { useSaveLessonPlanTopic } from '../hooks/use-save-lesson-plan-topic'

interface LessonPlanEditorProps {
  params: PlanParams
  groupName: string
  course: string
}

/** One session's plan: its topic, settable at any time, and what was covered, settable from its start time on */
export function LessonPlanEditor({ params, groupName, course }: LessonPlanEditorProps) {
  const plan = useLessonPlan(params)

  if (plan.status === 'error') return <LoadError what="lesson plan" onRetry={() => void plan.refetch()} />
  if (!plan.data) return <SkeletonRows />
  // Keyed by the session, so its fields start fresh instead of carrying over a previous session's edits
  return <LessonPlanContent key={`${params.groupId}-${params.date}-${params.startTime}`} params={params} groupName={groupName} course={course} plan={plan.data} />
}

interface LessonPlanContentProps {
  params: PlanParams
  groupName: string
  course: string
  plan: LessonPlan
}

function LessonPlanContent({ params, groupName, course, plan }: LessonPlanContentProps) {
  const formatDay = useFormatDay()
  const formatLessonSlot = useFormatLessonSlot()
  return (
    <SectionCard title={groupName}>
      <div className="grid gap-4 px-5 py-4">
        <p className="tabular text-ink-2">
          {course} · {formatDay(plan.date)} · {plan.start_time}–{plan.end_time}
        </p>
        {plan.rescheduled_from ? <p className="tabular text-ink-2">Rescheduled from {formatLessonSlot({ day: plan.rescheduled_from.date, time: plan.rescheduled_from.start_time })}</p> : null}
        <TopicField params={params} topic={plan.topic} />
        <CoveredField params={params} covered={plan.covered} canEdit={plan.can_edit_covered} startTime={plan.start_time} />
      </div>
    </SectionCard>
  )
}

interface TopicFieldProps {
  params: PlanParams
  topic: string | null
}

/** Planned ahead of the session; settable at any time */
function TopicField({ params, topic }: TopicFieldProps) {
  const fieldId = useId()
  const saveTopic = useSaveLessonPlanTopic(params)
  const [value, setValue] = useState(topic ?? '')

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => setValue(event.target.value)
  const handleSave = () => saveTopic.mutate(value)
  const isUnchanged = value === (topic ?? '')

  return (
    <div className="grid gap-2">
      <AuthField id={fieldId} label="Topic" placeholder="What this session plans to cover" value={value} onChange={handleChange} disabled={saveTopic.isPending} />
      <div className="flex items-center gap-3">
        <button type="button" className="button button--ghost min-h-9 self-start px-4 text-base" disabled={isUnchanged || saveTopic.isPending} onClick={handleSave}>
          Save topic
        </button>
        {saveTopic.isSuccess && isUnchanged ? <span className="text-[0.93rem] text-ink-2">Saved</span> : null}
      </div>
      {saveTopic.isError ? <FormAlert>{getErrorMessage(saveTopic.error)}</FormAlert> : null}
    </div>
  )
}

interface CoveredFieldProps {
  params: PlanParams
  covered: string | null
  canEdit: boolean
  startTime: string
}

/** What was covered; settable only from the session's start time on, with no upper bound */
function CoveredField({ params, covered, canEdit, startTime }: CoveredFieldProps) {
  const fieldId = useId()
  const saveCovered = useSaveLessonPlanCovered(params)
  const [value, setValue] = useState(covered ?? '')

  if (!canEdit) {
    return (
      <div className="grid gap-1.5">
        <span className="text-[0.987rem] font-[650]">Covered</span>
        <p className="text-ink-2">Opens at {startTime}.</p>
        {covered ? <p>{covered}</p> : null}
      </div>
    )
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => setValue(event.target.value)
  const handleSave = () => saveCovered.mutate(value)
  const isUnchanged = value === (covered ?? '')

  return (
    <div className="grid gap-2">
      <AuthField id={fieldId} label="Covered" placeholder="What this session actually covered" value={value} onChange={handleChange} disabled={saveCovered.isPending} />
      <div className="flex items-center gap-3">
        <button type="button" className="button button--ghost min-h-9 self-start px-4 text-base" disabled={isUnchanged || saveCovered.isPending} onClick={handleSave}>
          Save covered
        </button>
        {saveCovered.isSuccess && isUnchanged ? <span className="text-[0.93rem] text-ink-2">Saved</span> : null}
      </div>
      {saveCovered.isError ? <FormAlert>{getErrorMessage(saveCovered.error)}</FormAlert> : null}
    </div>
  )
}
