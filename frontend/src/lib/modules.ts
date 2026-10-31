import {
  Award,
  BookOpen,
  Building2,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  FileQuestion,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  MapPin,
  MessageSquare,
  NotebookPen,
  Presentation,
  TrendingUp,
  Users,
  UsersRound,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// The dashboard's modules, in sidebar order. Each one gets its own page at /platform/<slug>.

type ModuleDefinition = {
  slug: string
  icon: LucideIcon
  name: string
  tagline: string
  intro: string
  /** What the module lets you do, as short lines */
  does: readonly string[]
  /** Who uses it, and for what */
  who: readonly { role: string; text: string }[]
  /** Other modules it feeds or draws from */
  related: readonly string[]
}

const MODULE_LIST = [
  {
    slug: 'organization-profile',
    icon: Building2,
    name: 'Organization profile',
    tagline: 'Your school’s name, details and branding in one place.',
    intro:
      'Keep the details families and staff see up to date: your organization’s name, contact details, country and currency.',
    does: [
      'Name, type and contact details',
      'Country and currency for invoices',
      'Logo and colours on documents',
    ],
    who: [
      { role: 'Owners', text: 'Keep the organization’s details correct.' },
    ],
    related: ['locations', 'payments'],
  },
  {
    slug: 'locations',
    icon: MapPin,
    name: 'Locations and departments',
    tagline: 'Every building, room and department your school runs.',
    intro:
      'Add the places you teach in and the departments you are organised by, so timetables and groups know where they belong.',
    does: [
      'Locations with their rooms and capacity',
      'Departments with their own lecturers and courses',
      'Rooms ready for the timetable',
    ],
    who: [
      { role: 'Owners & admins', text: 'Set up where teaching happens.' },
    ],
    related: ['schedule', 'courses'],
  },
  {
    slug: 'academic-periods',
    icon: CalendarRange,
    name: 'Academic periods',
    tagline: 'Years, terms and holidays that every module follows.',
    intro:
      'Define the school year, its terms and its breaks once. Groups, timetables, grades and invoices all follow the same calendar.',
    does: [
      'School years and terms',
      'Holidays and breaks',
      'The current term set for everyone',
    ],
    who: [
      { role: 'Owners & admins', text: 'Plan the year before it starts.' },
    ],
    related: ['schedule', 'grades'],
  },
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
    slug: 'lecturers',
    icon: GraduationCap,
    name: 'Lecturers',
    tagline: 'Your teaching staff, with what and where they teach.',
    intro:
      'Every lecturer has a profile with the courses and groups they teach, so timetables and registers know who is in the room.',
    does: [
      'Lecturer profiles and contact details',
      'Courses and groups each lecturer teaches',
      'Their personal timetable',
    ],
    who: [
      { role: 'Owners & admins', text: 'Add lecturers and assign their groups.' },
      { role: 'Lecturers', text: 'See what they teach this term.' },
    ],
    related: ['courses', 'schedule'],
  },
  {
    slug: 'courses',
    icon: Layers,
    name: 'Courses',
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
    slug: 'groups',
    icon: UsersRound,
    name: 'Groups',
    tagline: 'The classes you actually run, with their students and lecturer.',
    intro:
      'Open groups for each course with a lecturer, a room and a seat limit. Students, registers and grades all hang off the group.',
    does: [
      'Groups per course with lecturer and room',
      'Seat limits and live class lists',
      'Move students between groups',
    ],
    who: [
      { role: 'Admins', text: 'Open groups and fill them.' },
      { role: 'Lecturers', text: 'See who is in each of their groups.' },
    ],
    related: ['courses', 'students'],
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
    slug: 'lessons',
    icon: Presentation,
    name: 'Lessons',
    tagline: 'What each session covers, planned ahead and recorded after.',
    intro:
      'Plan the topic of each session and note what was covered, so anyone stepping in knows where the group is.',
    does: [
      'Lesson plans per session',
      'What was covered, recorded after class',
      'Lesson history per group',
    ],
    who: [
      { role: 'Lecturers', text: 'Plan lessons and keep track of the syllabus.' },
      { role: 'Admins', text: 'See where every group is up to.' },
    ],
    related: ['schedule', 'materials'],
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
    slug: 'assignments',
    icon: NotebookPen,
    name: 'Assignments',
    tagline: 'Homework and coursework set, handed in and marked.',
    intro:
      'Set assignments for a group with a due date, collect what students hand in, and mark it in one place.',
    does: [
      'Assignments per group with due dates',
      'Hand-ins collected in one place',
      'Marks sent to the gradebook',
    ],
    who: [
      { role: 'Lecturers', text: 'Set and mark assignments.' },
      { role: 'Students', text: 'See what is due and hand it in.' },
    ],
    related: ['grades', 'materials'],
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
    slug: 'financial-records',
    icon: FileSpreadsheet,
    name: 'Financial records',
    tagline: 'Every payment and expense, kept in order.',
    intro:
      'A record of the money coming in and going out, built from the payments you already take.',
    does: [
      'Income from every payment',
      'Expenses and refunds',
      'Records ready for your accountant',
    ],
    who: [
      { role: 'Owners', text: 'Know where the money stands.' },
    ],
    related: ['payments', 'performance'],
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
] as const satisfies readonly ModuleDefinition[]

export type ModuleSlug = (typeof MODULE_LIST)[number]['slug']

export type Module = ModuleDefinition & { slug: ModuleSlug }

export const MODULES: readonly Module[] = MODULE_LIST

export const moduleBySlug = (slug: string) => MODULES.find((m) => m.slug === slug)
