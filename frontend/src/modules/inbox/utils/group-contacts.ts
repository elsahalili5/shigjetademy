import type { MemberRole } from '@shigjetademy/shared/auth'
import type { InboxContact } from '@shigjetademy/shared/inbox'

type ContactGroupDefinition = {
  title: string
  roles: readonly MemberRole[]
}

const CONTACT_GROUPS: readonly ContactGroupDefinition[] = [
  { title: 'School staff', roles: ['OWNER', 'ADMIN'] },
  { title: 'Lecturers', roles: ['LECTURER'] },
  { title: 'Students', roles: ['STUDENT'] },
  { title: 'Parents and guardians', roles: ['GUARDIAN'] },
]

export type ContactGroup = {
  title: string
  contacts: InboxContact[]
}

/** The contacts under their role's heading, in a fixed order, leaving out headings nobody falls under */
export const groupContacts = (contacts: readonly InboxContact[]): ContactGroup[] =>
  CONTACT_GROUPS.map(({ title, roles }) => ({ title, contacts: contacts.filter((contact) => roles.includes(contact.role)) })).filter((group) => group.contacts.length > 0)
