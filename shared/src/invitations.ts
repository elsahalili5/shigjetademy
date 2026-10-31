// The invite forms, the accept page and the invitation endpoints share these schemas and shapes.
import { z } from 'zod'
import { emailSchema } from './auth.ts'
import type { MemberRole, Permission } from './auth.ts'

/** How long an invitation link works after it is sent or resent */
export const INVITATION_VALID_DAYS = 7

/** How an invitation names the role: "invited you as a student"; the email and the accept page both use it */
export const INVITED_ROLE_PHRASES = {
  OWNER: 'as the owner',
  ADMIN: 'as a school admin',
  LECTURER: 'as a lecturer',
  STUDENT: 'as a student',
  GUARDIAN: 'as a parent or guardian',
} as const satisfies Record<MemberRole, string>

/** Who staff invite to log in as a student; the email lives on the invitation, not on the student record */
export const inviteStudentSchema = z.object({
  email: emailSchema,
})

export type InviteStudentInput = z.infer<typeof inviteStudentSchema>

/** An invitation as the people who sent it see it; never the token or its hash */
export type SentInvitation = {
  id: string
  email: string
  role: MemberRole
  permissions: Permission[]
  created_at: string
  expires_at: string
}

/** The owner's Copy link: a fresh link (the server keeps only a hash, so an old one can't be shown again) */
export type InvitationLink = SentInvitation & {
  link: string
}

/** What anyone holding the link sees before accepting */
export type InvitationPreview = {
  email: string
  role: MemberRole
  organization: { id: string; name: string }
  invited_by: { first_name: string; last_name: string }
  expires_at: string
}

export type AcceptedInvitation = {
  organization_id: string
}
