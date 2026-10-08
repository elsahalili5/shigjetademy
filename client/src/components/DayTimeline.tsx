import type { CSSProperties } from 'react'
import { BookOpenCheck, CalendarDays, ClipboardCheck, FileText, MessageSquare, Wallet } from 'lucide-react'
import './DayTimeline.css'

const MOMENTS = [
  {
    time: '07:30',
    icon: CalendarDays,
    tag: 'Timetable',
    tone: 'navy',
    title: 'Teachers open today’s classes',
    body: 'Every teacher sees their classes, rooms and times for the day. No printed rota to chase.',
    meta: '6 classes · 4 rooms',
  },
  {
    time: '09:05',
    icon: ClipboardCheck,
    tag: 'Attendance',
    tone: 'green',
    title: 'Register taken in Room 204',
    body: 'Grade 9 Mathematics: attendance is marked in class, straight into the student records.',
    meta: '24 of 26 present',
  },
  {
    time: '09:10',
    icon: MessageSquare,
    tag: 'Messages',
    tone: 'coral',
    title: 'Two families hear about an absence',
    body: 'Parents of the two absent students get a message from the school, from the same register.',
    meta: '2 messages sent',
  },
  {
    time: '12:40',
    icon: Wallet,
    tag: 'Payments',
    tone: 'kraft',
    title: 'A tuition invoice is paid',
    body: 'The office sees INV-0412 marked paid. The class fee overview updates for everyone who needs it.',
    meta: '€60 · Paid',
  },
  {
    time: '15:15',
    icon: BookOpenCheck,
    tag: 'Grades',
    tone: 'green',
    title: 'Unit 3 test scores go in',
    body: 'Scores are entered once, into the class gradebook, where the term report will read them.',
    meta: 'Class average 7.8',
  },
  {
    time: '17:30',
    icon: FileText,
    tag: 'Reports',
    tone: 'navy',
    title: 'Progress notes are ready',
    body: 'Grades and attendance are already in place for the end-of-term progress report.',
    meta: 'Term report · draft',
  },
]

export function DayTimeline() {
  return (
    <section className="section band-navy" aria-labelledby="day-title">
      <div className="container day">
      <div className="day__head" data-reveal>
        <h2 id="day-title">One school day in Shigjetademy.</h2>
        <p>
          From the first bell to the last message home, every step lands in the same system and feeds the next. An
          illustrative day at a school using the platform.
        </p>
      </div>

      <ol className="day__list">
        {MOMENTS.map(({ time, icon: Icon, tag, tone, title, body, meta }, n) => (
          <li key={time} className="moment" data-tone={tone} data-reveal style={{ '--i': 0 } as CSSProperties}>
            <time className="moment__time tabular">{time}</time>
            <span className="moment__dot" aria-hidden="true" data-last={n === MOMENTS.length - 1 || undefined} />
            <div className="moment__card">
              <div className="moment__top">
                <span className="moment__tag">
                  <Icon size={14} strokeWidth={2} aria-hidden="true" />
                  {tag}
                </span>
                <span className="moment__meta tabular">{meta}</span>
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          </li>
        ))}
      </ol>
      </div>
    </section>
  )
}
