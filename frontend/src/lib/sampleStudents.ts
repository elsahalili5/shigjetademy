// Sample data for the Students dashboard while there is no backend. Every name, number and date is made up.

export type StudentStatus = 'enrolled' | 'pending' | 'withdrawn'

export type Contact = {
  name: string
  relation: string
  phone: string
  email?: string
  isEmergency?: boolean
}

export type Student = {
  id: string
  name: string
  email: string
  birthDate: string
  status: StudentStatus
  groups: string[]
  enrolledAt: string
  contacts: Contact[]
}

export const SAMPLE_ORG = { name: 'Rilindja Academy', kind: 'Academy', term: 'Spring term 2026' }

export const SAMPLE_USER = { name: 'Elsa Halili', role: 'Owner' }

export const GROUPS = ['English B1', 'Maths 9A', 'Coding Juniors', 'IELTS Prep', 'Art Studio']

export const STUDENTS: Student[] = [
  {
    id: 'STU-1042',
    name: 'Arta Krasniqi',
    email: 'arta.k@example.org',
    birthDate: '2011-03-14',
    status: 'enrolled',
    groups: ['English B1', 'Maths 9A'],
    enrolledAt: '2025-09-08',
    contacts: [
      { name: 'Drita Krasniqi', relation: 'Mother', phone: '+383 44 123 456', email: 'drita.k@example.org' },
      { name: 'Besnik Krasniqi', relation: 'Father', phone: '+383 45 234 567', isEmergency: true },
    ],
  },
  {
    id: 'STU-1043',
    name: 'Dren Berisha',
    email: 'dren.b@example.org',
    birthDate: '2010-11-02',
    status: 'enrolled',
    groups: ['Coding Juniors'],
    enrolledAt: '2025-09-10',
    contacts: [{ name: 'Valbona Berisha', relation: 'Mother', phone: '+383 44 345 678', isEmergency: true }],
  },
  {
    id: 'STU-1044',
    name: 'Elira Gashi',
    email: 'elira.g@example.org',
    birthDate: '2009-06-21',
    status: 'pending',
    groups: ['IELTS Prep'],
    enrolledAt: '2026-02-17',
    contacts: [{ name: 'Fatmir Gashi', relation: 'Father', phone: '+383 49 456 789', isEmergency: true }],
  },
  {
    id: 'STU-1045',
    name: 'Leon Hoxha',
    email: 'leon.h@example.org',
    birthDate: '2011-01-30',
    status: 'enrolled',
    groups: ['Maths 9A', 'Coding Juniors'],
    enrolledAt: '2025-09-08',
    contacts: [
      { name: 'Teuta Hoxha', relation: 'Mother', phone: '+383 44 567 890', email: 'teuta.h@example.org', isEmergency: true },
    ],
  },
  {
    id: 'STU-1046',
    name: 'Rina Morina',
    email: 'rina.m@example.org',
    birthDate: '2012-08-05',
    status: 'enrolled',
    groups: ['Art Studio'],
    enrolledAt: '2025-10-01',
    contacts: [{ name: 'Agim Morina', relation: 'Grandfather', phone: '+383 45 678 901', isEmergency: true }],
  },
  {
    id: 'STU-1047',
    name: 'Ardit Shala',
    email: 'ardit.s@example.org',
    birthDate: '2010-04-18',
    status: 'withdrawn',
    groups: ['English B1'],
    enrolledAt: '2025-09-08',
    contacts: [{ name: 'Mimoza Shala', relation: 'Mother', phone: '+383 44 789 012', isEmergency: true }],
  },
  {
    id: 'STU-1048',
    name: 'Blerta Rexhepi',
    email: 'blerta.r@example.org',
    birthDate: '2009-12-09',
    status: 'enrolled',
    groups: ['IELTS Prep', 'English B1'],
    enrolledAt: '2025-09-15',
    contacts: [{ name: 'Naim Rexhepi', relation: 'Father', phone: '+383 49 890 123', isEmergency: true }],
  },
  {
    id: 'STU-1049',
    name: 'Jon Kelmendi',
    email: 'jon.k@example.org',
    birthDate: '2011-07-27',
    status: 'pending',
    groups: ['Coding Juniors'],
    enrolledAt: '2026-03-02',
    contacts: [{ name: 'Arbena Kelmendi', relation: 'Mother', phone: '+383 44 901 234', isEmergency: true }],
  },
  {
    id: 'STU-1050',
    name: 'Era Bytyqi',
    email: 'era.b@example.org',
    birthDate: '2012-02-11',
    status: 'enrolled',
    groups: ['Art Studio', 'English B1'],
    enrolledAt: '2025-09-22',
    contacts: [{ name: 'Shpend Bytyqi', relation: 'Father', phone: '+383 45 012 345', isEmergency: true }],
  },
  {
    id: 'STU-1051',
    name: 'Granit Osmani',
    email: 'granit.o@example.org',
    birthDate: '2010-09-03',
    status: 'enrolled',
    groups: ['Maths 9A'],
    enrolledAt: '2025-09-08',
    contacts: [{ name: 'Lumnije Osmani', relation: 'Mother', phone: '+383 44 112 233', isEmergency: true }],
  },
  {
    id: 'STU-1052',
    name: 'Sara Ahmeti',
    email: 'sara.a@example.org',
    birthDate: '2011-05-25',
    status: 'enrolled',
    groups: ['English B1', 'Coding Juniors'],
    enrolledAt: '2025-10-06',
    contacts: [{ name: 'Ilir Ahmeti', relation: 'Father', phone: '+383 49 223 344', isEmergency: true }],
  },
  {
    id: 'STU-1053',
    name: 'Fiona Zeqiri',
    email: 'fiona.z@example.org',
    birthDate: '2009-10-14',
    status: 'pending',
    groups: ['IELTS Prep'],
    enrolledAt: '2026-03-09',
    contacts: [{ name: 'Gëzim Zeqiri', relation: 'Father', phone: '+383 45 334 455', isEmergency: true }],
  },
  {
    id: 'STU-1054',
    name: 'Alban Thaqi',
    email: 'alban.t@example.org',
    birthDate: '2010-02-08',
    status: 'withdrawn',
    groups: ['Maths 9A'],
    enrolledAt: '2025-09-08',
    contacts: [{ name: 'Vjosa Thaqi', relation: 'Mother', phone: '+383 44 445 566', isEmergency: true }],
  },
  {
    id: 'STU-1055',
    name: 'Ilirjana Musliu',
    email: 'ilirjana.m@example.org',
    birthDate: '2012-12-01',
    status: 'enrolled',
    groups: ['Art Studio'],
    enrolledAt: '2025-11-03',
    contacts: [{ name: 'Burim Musliu', relation: 'Father', phone: '+383 49 556 677', isEmergency: true }],
  },
]
