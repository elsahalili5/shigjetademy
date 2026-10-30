import type { Permission } from '@shigjetademy/shared/auth'

type PermissionGroup = {
  title: string
  permissions: { value: Permission; label: string; hint: string }[]
}

// Grouped the way an owner thinks about a school, not in enum order
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: 'People',
    permissions: [
      { value: 'MANAGE_STUDENTS', label: 'Students', hint: 'Enrol, edit and withdraw students' },
      { value: 'MANAGE_LECTURERS', label: 'Lecturers', hint: 'Invite and manage teachers' },
      { value: 'MANAGE_GUARDIANS', label: 'Parents and guardians', hint: 'Link families to students' },
    ],
  },
  {
    title: 'Teaching',
    permissions: [
      { value: 'MANAGE_COURSES', label: 'Courses and groups', hint: 'Create classes and student groups' },
      { value: 'MANAGE_SCHEDULES', label: 'Timetable', hint: 'Plan lessons and rooms' },
      { value: 'MANAGE_ATTENDANCE', label: 'Attendance', hint: 'Take and correct registers' },
      { value: 'MANAGE_MATERIALS', label: 'Learning materials', hint: 'Share files and lessons' },
      { value: 'MANAGE_TESTS', label: 'Tests', hint: 'Create and mark tests' },
      { value: 'MANAGE_GRADES', label: 'Grades', hint: 'Record grades and report cards' },
    ],
  },
  {
    title: 'Reports',
    permissions: [
      { value: 'VIEW_PERFORMANCE', label: 'Performance', hint: 'Follow how students are doing' },
      { value: 'VIEW_REPORTS', label: 'Operational reports', hint: 'Attendance and enrolment reports' },
    ],
  },
]

export const PERMISSION_LABELS = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((group) => group.permissions.map((permission) => [permission.value, permission.label])),
) satisfies Partial<Record<Permission, string>>
