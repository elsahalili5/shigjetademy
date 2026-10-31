import { useRef, useState } from 'react'
import { CalendarRange, Plus } from 'lucide-react'
import type { AcademicYear } from '@shigjetademy/shared/academic-periods'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { NoticeBar } from '#/components/NoticeBar'
import type { Notice } from '#/components/NoticeBar'
import { SectionCard } from '#/components/SectionCard'
import { showErrorToast } from '#/lib/error-toast'
import { useAcademicYears } from '../hooks/use-academic-years'
import { useRemoveAcademicYear } from '../hooks/use-remove-academic-year'
import { useRemoveYearPeriod } from '../hooks/use-remove-year-period'
import { useSaveAcademicYear } from '../hooks/use-save-academic-year'
import type { YearPeriod } from '../utils/year-periods'
import { AcademicYearDialog } from './academic-year-dialog'
import type { AcademicYearDialogMode } from './academic-year-dialog'
import { AcademicYearList } from './academic-year-list'
import type { RemoveAcademicYearInput } from './academic-year-list'
import { YearPeriodDialog } from './year-period-dialog'
import type { YearPeriodDialogMode } from './year-period-dialog'
import type { AddYearPeriodInput, YearPeriodChange } from './year-period-list'

const pluralRules = new Intl.PluralRules()

const formatYearCount = (count: number) => `${count} ${pluralRules.select(count) === 'one' ? 'school year' : 'school years'}`

interface AcademicPeriodsPageProps {
  organizationId: string
  organizationName: string
  /** Everyone else in the organization sees the same page without anything to change */
  isEditable: boolean
}

/** The organization's school years, with their terms and holidays */
export function AcademicPeriodsPage({ organizationId, organizationName, isEditable }: AcademicPeriodsPageProps) {
  const yearDialogRef = useRef<HTMLDialogElement>(null)
  const periodDialogRef = useRef<HTMLDialogElement>(null)
  const years = useAcademicYears(organizationId)
  const saveYear = useSaveAcademicYear(organizationId)
  const removeYear = useRemoveAcademicYear(organizationId)
  const removePeriod = useRemoveYearPeriod(organizationId)
  const [yearDialogMode, setYearDialogMode] = useState<AcademicYearDialogMode>({ kind: 'add', isFirst: false })
  const [periodDialogMode, setPeriodDialogMode] = useState<YearPeriodDialogMode | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  // Bumped on every open, so each dialog session starts from a fresh form without the last values or error
  const [formSession, setFormSession] = useState(0)

  // Adding waits for the list, so a new year can't become current while the real current one hasn't loaded
  const shouldOfferAddYear = isEditable && years.status === 'success'
  const subtitle = isEditable ? `${organizationName} · ${formatYearCount(years.data?.length ?? 0)}` : `${organizationName} · only the owner and permitted admins can change these`

  const handleAddYear = () => {
    setFormSession((session) => session + 1)
    setYearDialogMode({ kind: 'add', isFirst: years.data?.length === 0 })
    yearDialogRef.current?.showModal()
  }

  const handleEditYear = (year: AcademicYear) => {
    setFormSession((session) => session + 1)
    setYearDialogMode({ kind: 'edit', year })
    yearDialogRef.current?.showModal()
  }

  const handleYearSaved = (saved: AcademicYear) => {
    setNotice({ tone: 'success', text: yearDialogMode.kind === 'add' ? `Added ${saved.name}.` : `Saved ${saved.name}.` })
  }

  const handleMakeCurrent = (year: AcademicYear) => {
    const input = { name: year.name, start_date: year.start_date, end_date: year.end_date, is_current: true }
    saveYear.mutate(
      { yearId: year.id, input },
      { onSuccess: () => setNotice({ tone: 'success', text: `${year.name} is now the current year.` }), onError: showErrorToast },
    )
  }

  const handleRemoveYear = ({ year, newCurrentId }: RemoveAcademicYearInput) => {
    const newCurrent = years.data?.find((other) => other.id === newCurrentId)
    removeYear.mutate(
      { organizationId, yearId: year.id, newCurrentId },
      {
        onSuccess: () =>
          setNotice({ tone: 'success', text: newCurrent ? `Deleted ${year.name}. ${newCurrent.name} is now the current year.` : `Deleted ${year.name}.` }),
        onError: showErrorToast,
      },
    )
  }

  const handleAddPeriod = ({ year, periodKind }: AddYearPeriodInput) => {
    setFormSession((session) => session + 1)
    setPeriodDialogMode({ action: 'add', year, periodKind })
    periodDialogRef.current?.showModal()
  }

  const handleEditPeriod = ({ year, periodKind, period }: YearPeriodChange) => {
    setFormSession((session) => session + 1)
    setPeriodDialogMode({ action: 'edit', year, periodKind, period })
    periodDialogRef.current?.showModal()
  }

  const handlePeriodSaved = (saved: YearPeriod) => {
    setNotice({ tone: 'success', text: periodDialogMode?.action === 'edit' ? `Saved ${saved.name}.` : `Added ${saved.name}.` })
  }

  const handleRemovePeriod = ({ year, periodKind, period }: YearPeriodChange) => {
    removePeriod.mutate(
      { organizationId, yearId: year.id, periodKind, periodId: period.id },
      { onSuccess: () => setNotice({ tone: 'success', text: `Deleted ${period.name}.` }), onError: showErrorToast },
    )
  }

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={CalendarRange} title="Academic periods" subtitle={subtitle} />

      <div className="grid max-w-[1040px] gap-6 px-[clamp(20px,3.4vw,44px)] pb-10">
        {notice ? <NoticeBar notice={notice} onDismiss={() => setNotice(null)} /> : null}

        <SectionCard title="School years" action={shouldOfferAddYear ? <AddButton label="Add year" onClick={handleAddYear} /> : null}>
          <AcademicYearList
            status={years.status}
            years={years.data}
            isEditable={isEditable}
            onRetry={() => void years.refetch()}
            onEdit={handleEditYear}
            onMakeCurrent={handleMakeCurrent}
            onRemove={handleRemoveYear}
            onAddPeriod={handleAddPeriod}
            onEditPeriod={handleEditPeriod}
            onRemovePeriod={handleRemovePeriod}
          />
        </SectionCard>
      </div>

      {isEditable ? (
        <>
          <AcademicYearDialog dialogRef={yearDialogRef} organizationId={organizationId} mode={yearDialogMode} formSession={formSession} onSaved={handleYearSaved} />
          <YearPeriodDialog dialogRef={periodDialogRef} organizationId={organizationId} mode={periodDialogMode} formSession={formSession} onSaved={handlePeriodSaved} />
        </>
      ) : null}
    </div>
  )
}

interface AddButtonProps {
  label: string
  onClick: () => void
}

function AddButton({ label, onClick }: AddButtonProps) {
  return (
    <button type="button" className="button button--primary min-h-10 px-3.5 text-[0.95rem]" onClick={onClick}>
      <Plus size={16} strokeWidth={2.2} aria-hidden="true" />
      {label}
    </button>
  )
}
