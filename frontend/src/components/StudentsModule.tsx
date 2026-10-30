import { useEffect, useState } from 'react'
import { Mail, MessageSquare, Pencil, Phone, Plus, Search, ShieldAlert, Upload, X } from 'lucide-react'
import type { Module } from '#/lib/modules'
import { initials } from '#/lib/initials'
import { GROUPS, SAMPLE_ORG, STUDENTS } from '#/lib/sampleStudents'
import type { Student, StudentStatus } from '#/lib/sampleStudents'

type StatusFilter = 'all' | StudentStatus

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'pending', label: 'Pending' },
  { value: 'withdrawn', label: 'Withdrawn' },
]

// Avatar tiles cycle through the palette by student number
const AVATAR_TONES = ['bg-green-wash text-green-deep', 'bg-kraft-wash text-kraft-ink', 'bg-coral-wash text-coral-deep']

// Dates are stored as UTC calendar days, so they are formatted in UTC
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const formatDate = (iso: string) => dateFormat.format(new Date(iso))

const avatarTone = (id: string) => AVATAR_TONES[Number(id.replace(/\D/g, '')) % AVATAR_TONES.length]

function statusChip(status: StudentStatus) {
  switch (status) {
    case 'enrolled':
      return { label: 'Enrolled', className: 'chip--green' }
    case 'pending':
      return { label: 'Pending', className: 'chip--kraft' }
    case 'withdrawn':
      return { label: 'Withdrawn', className: 'chip--coral' }
    default: {
      const unknown: never = status
      throw new Error(`Unknown status: ${String(unknown)}`)
    }
  }
}

interface StudentsModuleProps {
  mod: Module
}

/** Students & enrolment: the class list for the whole organization, with one student's profile beside it. */
export function StudentsModule({ mod }: StudentsModuleProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const Icon = mod.icon
  const needle = query.trim().toLowerCase()
  const visible = STUDENTS.filter(
    (s) =>
      (statusFilter === 'all' || s.status === statusFilter) &&
      (!group || s.groups.includes(group)) &&
      (!needle || s.name.toLowerCase().includes(needle) || s.id.toLowerCase().includes(needle)),
  )
  const countFor = (value: StatusFilter) =>
    value === 'all' ? STUDENTS.length : STUDENTS.filter((s) => s.status === value).length
  const selected = STUDENTS.find((s) => s.id === selectedId) ?? null
  const isFiltered = statusFilter !== 'all' || !!group || !!needle

  const handleClearFilters = () => {
    setStatusFilter('all')
    setGroup('')
    setQuery('')
  }

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="bg-linear-to-b from-green-wash to-white px-[clamp(20px,3.4vw,44px)] pt-[clamp(24px,3.4vw,40px)] pb-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <span
                className="grid size-14 flex-none place-items-center rounded-2xl bg-white text-green-deep shadow-[0_1px_2px_rgba(22,34,46,0.06),0_10px_24px_-12px_rgba(22,34,46,0.3)]"
                aria-hidden="true"
              >
                <Icon size={26} strokeWidth={1.7} />
              </span>
              <div>
                <h1 className="font-display text-[clamp(1.7rem,2.6vw,2.3rem)] leading-[1.05] font-[680] tracking-[-0.03em]">{mod.name}</h1>
                <p className="mt-1.5 text-ink-2">
                  {STUDENTS.length} students in {GROUPS.length} groups · {SAMPLE_ORG.term}
                  <span className="chip chip--navy ml-2.5 align-[2px]">Sample data</span>
                </p>
              </div>
            </div>
            <div className="flex gap-2.5">
              <button type="button" className="button button--ghost min-h-11 px-4 text-base">
                <Upload size={16} strokeWidth={2} aria-hidden="true" />
                Import
              </button>
              <button type="button" className="button button--primary min-h-11 px-4 text-base">
                <Plus size={17} strokeWidth={2.2} aria-hidden="true" />
                Add student
              </button>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <div className="flex max-w-full overflow-x-auto rounded-full bg-mist p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filter by status">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={statusFilter === f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className="inline-flex min-h-9 flex-none items-center gap-2 rounded-full px-3.5 text-[0.95rem] font-semibold text-ink-2 transition-[background-color,color,box-shadow] duration-200 hover:text-ink aria-pressed:bg-white aria-pressed:text-ink aria-pressed:shadow-[0_1px_2px_rgba(22,34,46,0.08),0_4px_10px_-6px_rgba(22,34,46,0.3)]"
                >
                  {f.label}
                  <span className="tabular text-[0.85rem] text-ink-3">{countFor(f.value)}</span>
                </button>
              ))}
            </div>

            <label className="relative ml-auto flex min-w-[220px] flex-1 items-center max-[700px]:ml-0 min-[1100px]:max-w-[320px]">
              <span className="sr-only">Search students</span>
              <Search className="pointer-events-none absolute left-3.5 text-ink-3" size={17} strokeWidth={2} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or ID"
                className="min-h-11 w-full rounded-full border border-rule-strong bg-white pr-4 pl-10 text-[0.98rem] transition-[border-color,box-shadow] duration-200 placeholder:text-ink-3 hover:border-ink-3 focus:border-green-deep focus:shadow-[0_0_0_3px_var(--green-wash)] focus:outline-none"
              />
            </label>

            <label className="flex items-center">
              <span className="sr-only">Filter by group</span>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="min-h-11 cursor-pointer rounded-full border border-rule-strong bg-white px-4 text-[0.98rem] font-medium transition-[border-color,box-shadow] duration-200 hover:border-ink-3 focus:border-green-deep focus:shadow-[0_0_0_3px_var(--green-wash)] focus:outline-none"
              >
                <option value="">All groups</option>
                {GROUPS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </label>
          </div>
        </header>

        <div className="px-[clamp(20px,3.4vw,44px)] pb-8">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="text-[0.87rem] text-ink-3 [&>th]:border-b [&>th]:border-rule [&>th]:py-3 [&>th]:pr-4 [&>th]:font-semibold">
                <th scope="col">Student</th>
                <th scope="col">Groups</th>
                <th scope="col" className={`max-[1100px]:hidden ${selected ? 'hidden' : ''}`}>
                  Family contact
                </th>
                <th scope="col">Status</th>
                <th scope="col" className="max-[700px]:hidden">
                  Enrolled
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => {
                const chip = statusChip(s.status)
                const isSelected = s.id === selectedId
                return (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    aria-selected={isSelected}
                    className="cursor-pointer transition-colors duration-150 hover:bg-mist aria-selected:bg-green-wash/60 [&>td]:border-b [&>td]:border-rule [&>td]:py-3 [&>td]:pr-4"
                  >
                    <td>
                      <button
                        type="button"
                        className="flex items-center gap-3 text-left"
                        aria-expanded={isSelected}
                        aria-controls="student-profile"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedId(s.id)
                        }}
                      >
                        <span className={`grid size-10 flex-none place-items-center rounded-full text-[0.9rem] font-bold ${avatarTone(s.id)}`} aria-hidden="true">
                          {initials(s.name)}
                        </span>
                        <span className="grid leading-tight">
                          <span className="font-semibold text-ink">{s.name}</span>
                          <span className="font-data text-[0.78rem] text-ink-3">{s.id}</span>
                        </span>
                      </button>
                    </td>
                    <td className="text-[0.95rem] text-ink-2">{s.groups.join(', ')}</td>
                    <td className={`text-[0.95rem] text-ink-2 max-[1100px]:hidden ${selected ? 'hidden' : ''}`}>
                      {s.contacts[0].name} <span className="text-ink-3">· {s.contacts[0].relation}</span>
                    </td>
                    <td>
                      <span className={`chip ${chip.className}`}>{chip.label}</span>
                    </td>
                    <td className="tabular text-[0.95rem] whitespace-nowrap text-ink-2 max-[700px]:hidden">{formatDate(s.enrolledAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {visible.length === 0 ? (
            <div className="grid justify-items-center gap-3 py-16 text-center">
              <p className="font-display text-[1.3rem] font-semibold">No students match these filters.</p>
              <p className="text-ink-2">Try another name, group or status.</p>
              <button type="button" className="button button--ghost min-h-11 text-base" onClick={handleClearFilters}>
                Clear filters
              </button>
            </div>
          ) : (
            <p className="mt-4 text-[0.9rem] text-ink-3">
              Showing {visible.length} of {STUDENTS.length} students
              {isFiltered ? (
                <>
                  {' · '}
                  <button type="button" className="font-semibold text-green-deep hover:underline" onClick={handleClearFilters}>
                    Clear filters
                  </button>
                </>
              ) : null}
            </p>
          )}
        </div>
      </div>

      {selected ? <StudentProfile key={selected.id} student={selected} onClose={() => setSelectedId(null)} /> : null}
    </div>
  )
}

interface StudentProfileProps {
  student: Student
  onClose: () => void
}

/** One student's record beside the list; overlays the list on narrower screens. */
function StudentProfile({ student, onClose }: StudentProfileProps) {
  const chip = statusChip(student.status)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <aside
      id="student-profile"
      aria-label={`${student.name} profile`}
      className="flex w-[380px] flex-none flex-col border-l border-rule bg-white motion-safe:animate-preview-in max-[1100px]:absolute max-[1100px]:inset-y-0 max-[1100px]:right-0 max-[1100px]:z-20 max-[1100px]:shadow-[-24px_0_48px_-24px_rgba(20,42,61,0.35)] max-[700px]:w-full"
    >
      <div className="flex items-center justify-between px-6 pt-5">
        <span className="font-data text-[0.8rem] text-ink-3">{student.id}</span>
        <button
          type="button"
          onClick={onClose}
          className="grid size-9 place-items-center rounded-full text-ink-2 transition-colors duration-200 hover:bg-mist hover:text-ink"
          aria-label="Close profile"
        >
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="mt-2 flex items-center gap-4">
          <span className={`grid size-16 flex-none place-items-center rounded-full font-display text-[1.35rem] font-bold ${avatarTone(student.id)}`} aria-hidden="true">
            {initials(student.name)}
          </span>
          <div className="grid gap-1.5">
            <h2 className="font-display text-[1.5rem] leading-tight font-[680] tracking-[-0.02em]">{student.name}</h2>
            <span className={`chip ${chip.className} w-fit`}>{chip.label}</span>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 rounded-card bg-mist p-4 text-[0.95rem]">
          <div>
            <dt className="text-[0.85rem] text-ink-3">Date of birth</dt>
            <dd className="tabular mt-0.5 font-semibold">{formatDate(student.birthDate)}</dd>
          </div>
          <div>
            <dt className="text-[0.85rem] text-ink-3">Enrolled</dt>
            <dd className="tabular mt-0.5 font-semibold">{formatDate(student.enrolledAt)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[0.85rem] text-ink-3">Email</dt>
            <dd className="mt-0.5 truncate font-semibold">{student.email}</dd>
          </div>
        </dl>

        <h3 className="mt-7 text-[0.95rem] font-semibold text-ink-2">Groups</h3>
        <ul className="mt-2.5 flex flex-wrap gap-2">
          {student.groups.map((g) => (
            <li key={g} className="rounded-full border border-rule-strong px-3 py-1 text-[0.92rem] font-medium">
              {g}
            </li>
          ))}
        </ul>

        <h3 className="mt-7 text-[0.95rem] font-semibold text-ink-2">Family and emergency contacts</h3>
        <ul className="mt-2.5 grid gap-2.5">
          {student.contacts.map((c) => (
            <li key={c.name} className="rounded-card border border-rule p-4">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{c.name}</span>
                <span className="text-[0.92rem] text-ink-3">{c.relation}</span>
                {c.isEmergency ? (
                  <span className="chip chip--coral ml-auto">
                    <ShieldAlert size={13} strokeWidth={2.2} aria-hidden="true" />
                    Emergency
                  </span>
                ) : null}
              </p>
              <div className="mt-2 grid gap-1 text-[0.95rem]">
                <a className="inline-flex w-fit items-center gap-2 text-ink-2 no-underline hover:text-green-deep" href={`tel:${c.phone.replace(/\s/g, '')}`}>
                  <Phone size={15} strokeWidth={2} aria-hidden="true" />
                  {c.phone}
                </a>
                {c.email ? (
                  <a className="inline-flex w-fit items-center gap-2 text-ink-2 no-underline hover:text-green-deep" href={`mailto:${c.email}`}>
                    <Mail size={15} strokeWidth={2} aria-hidden="true" />
                    {c.email}
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2.5 border-t border-rule px-6 py-4">
        <button type="button" className="button button--primary min-h-11 text-base">
          <MessageSquare size={16} strokeWidth={2} aria-hidden="true" />
          Message family
        </button>
        <button type="button" className="button button--ghost min-h-11 px-4 text-base">
          <Pencil size={15} strokeWidth={2} aria-hidden="true" />
          Edit
        </button>
      </div>
    </aside>
  )
}
