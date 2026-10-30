import {
  Award,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileQuestion,
  Layers,
  MessageSquare,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// The dashboard's modules, in sidebar order. Each one gets its own page at /platform/<slug>.

export type Module = {
  slug: string
  icon: LucideIcon
  name: string
  tagline: string
  intro: string
  /** What the module lets you do, as short lines */
  does: string[]
  /** Who uses it, and for what */
  who: { role: string; text: string }[]
  /** Other modules it feeds or draws from */
  related: string[]
}

export const MODULES: Module[] = [
  {
    slug: 'students',
    icon: Users,
    name: 'Students & enrolment',
    tagline: 'One record per student, from the first enquiry onward.',
    intro:
      'Every student has a single profile with their family contacts, their classes and their history. Enrol them once and every other module knows who they are.',
    does: [
      'Student profiles with family and emergency contacts',
      'Enrolment into courses, classes and groups',
      'Seat limits and live class lists',
      'Pending, enrolled and withdrawn status',
    ],
    who: [
      { role: 'Admins', text: 'Enrol new students and keep records up to date.' },
      { role: 'Teachers', text: 'See who is in each class before the first lesson.' },
      { role: 'Parents', text: 'Check their child’s classes and contact details.' },
    ],
    related: ['courses', 'payments', 'attendance'],
  },
  {
    slug: 'courses',
    icon: Layers,
    name: 'Courses & groups',
    tagline: 'Set up what you teach, then split it into the groups you run.',
    intro:
      'Create courses with their levels and terms, open groups for each one, and assign teachers and rooms. Everything else in the dashboard hangs off these groups.',
    does: [
      'Courses with levels, terms and descriptions',
      'Groups with their own teacher, room and capacity',
      'Open, full and closed states',
      'Move students between groups',
    ],
    who: [
      { role: 'Owners', text: 'Open new groups and see how full each one is.' },
      { role: 'Teachers', text: 'See the groups and courses they teach.' },
    ],
    related: ['students', 'schedule', 'materials'],
  },
  {
    slug: 'schedule',
    icon: CalendarDays,
    name: 'Timetable',
    tagline: 'Build the week once, with rooms and teachers.',
    intro:
      'Place each group into the weekly timetable. Clashes between rooms and teachers show up as you plan, and every session gets its own register.',
    does: [
      'Timetables by group, teacher and room',
      'Room and teacher clash warnings',
      'Recurring and one-off sessions',
      'A personal timetable for every teacher and student',
    ],
    who: [
      { role: 'Admins', text: 'Plan the term’s timetable and fix clashes.' },
      { role: 'Teachers', text: 'See where and when they teach today.' },
      { role: 'Students', text: 'Know their next class without asking.' },
    ],
    related: ['courses', 'attendance'],
  },
  {
    slug: 'attendance',
    icon: ClipboardCheck,
    name: 'Attendance',
    tagline: 'A register for every session that takes seconds to fill in.',
    intro:
      'Teachers mark present, absent or late straight from their timetable. Attendance builds up per student and per group, with nothing typed up later.',
    does: [
      'Session registers: present, absent, late',
      'Attendance history per student and group',
      'Attendance rates across classes',
      'Absences visible to parents',
    ],
    who: [
      { role: 'Teachers', text: 'Take the register in class, in seconds.' },
      { role: 'Owners', text: 'Spot falling attendance across every group.' },
      { role: 'Parents', text: 'See when their child missed a class.' },
    ],
    related: ['schedule', 'performance'],
  },
  {
    slug: 'materials',
    icon: BookOpen,
    name: 'Learning materials',
    tagline: 'Share notes, files and links with the right group.',
    intro:
      'Teachers upload materials to a course or group, and students find them in one place instead of across chats and emails.',
    does: [
      'Files, notes and links per course or group',
      'Organised by unit or week',
      'Students see only their own groups’ materials',
    ],
    who: [
      { role: 'Teachers', text: 'Share materials once with the whole group.' },
      { role: 'Students', text: 'Find every handout in one place.' },
    ],
    related: ['courses', 'tests'],
  },
  {
    slug: 'tests',
    icon: FileQuestion,
    name: 'Tests',
    tagline: 'Set tests for a group and record the results.',
    intro:
      'Create tests and assignments for a group, set their dates, and record results that flow straight into the gradebook.',
    does: [
      'Tests and assignments per group',
      'Due dates on the student’s timetable',
      'Results recorded straight into grades',
    ],
    who: [
      { role: 'Teachers', text: 'Set a test and record the marks in one place.' },
      { role: 'Students', text: 'See what is coming up and how they did.' },
    ],
    related: ['grades', 'materials'],
  },
  {
    slug: 'grades',
    icon: Award,
    name: 'Grades',
    tagline: 'A gradebook that fills itself in as the term goes.',
    intro:
      'Grades are recorded as assessments happen. Each student’s gradebook stays current, so end-of-term reports come from data you already have.',
    does: [
      'Gradebooks per group and per student',
      'Assessments, tests and coursework',
      'Teacher comments alongside each grade',
    ],
    who: [
      { role: 'Teachers', text: 'Record grades as they mark.' },
      { role: 'Students & parents', text: 'Follow progress through the term.' },
    ],
    related: ['tests', 'performance'],
  },
  {
    slug: 'payments',
    icon: Wallet,
    name: 'Payments & invoicing',
    tagline: 'Always know who has paid, who is due and who is late.',
    intro:
      'Set tuition once per course or group and invoice every enrolled student from the same record. Payment status sits next to each student.',
    does: [
      'Tuition plans per course or group',
      'Invoices per student, month or term',
      'Paid, due and late status at a glance',
      'Payment reminders to families',
    ],
    who: [
      { role: 'Owners & admins', text: 'See this month’s income and chase late fees.' },
      { role: 'Parents', text: 'Check what they owe and what they have paid.' },
    ],
    related: ['students', 'messages'],
  },
  {
    slug: 'performance',
    icon: TrendingUp,
    name: 'Performance & reports',
    tagline: 'Progress reports built from grades already recorded.',
    intro:
      'Grades and attendance come together into progress reports per student, and into an overview of how every group is doing.',
    does: [
      'Progress reports per student and term',
      'Group and course overviews',
      'Attendance and grades side by side',
      'Reports sent to families from the dashboard',
    ],
    who: [
      { role: 'Owners', text: 'See how every class is doing at a glance.' },
      { role: 'Teachers', text: 'Write reports without starting from scratch.' },
      { role: 'Parents', text: 'Receive a clear picture of progress.' },
    ],
    related: ['grades', 'attendance'],
  },
  {
    slug: 'messages',
    icon: MessageSquare,
    name: 'Messages',
    tagline: 'Reach students, parents and staff from the same place.',
    intro:
      'Send messages to one family, a whole group or every teacher, from the same dashboard that holds their classes, grades and invoices.',
    does: [
      'Messages to students, parents and staff',
      'Send to a single person, a group or everyone',
      'Announcements and reminders',
    ],
    who: [
      { role: 'Admins', text: 'Send announcements to the whole school.' },
      { role: 'Teachers', text: 'Message their groups and families.' },
    ],
    related: ['payments', 'performance'],
  },
]

export const moduleBySlug = (slug: string) => MODULES.find((m) => m.slug === slug)
