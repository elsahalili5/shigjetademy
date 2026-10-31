import type { OutgoingEmail } from '@lib/mailer.ts'

let outbox: OutgoingEmail[] = []
let isFailing = false

/** Stands in for SMTP in every test (installed in setup.ts), so tests read what was sent and never send real email */
export const recordEmail = async (email: OutgoingEmail) => {
  if (isFailing) {
    throw new Error('The fake mail server refused the email')
  }
  outbox.push(email)
}

/** Every send fails until the next test, like a mail server that is down */
export const failSends = () => {
  isFailing = true
}

export const clearSentEmails = () => {
  outbox = []
  isFailing = false
}

export const sentEmails = () => outbox

const INVITE_LINK = /\/invite\/([A-Za-z0-9_-]+)/

/** The token in the newest email's invite link */
export const lastInviteToken = () => {
  const token = outbox.at(-1)?.text.match(INVITE_LINK)?.[1]
  if (!token) {
    throw new Error('No invitation email was sent')
  }
  return token
}
