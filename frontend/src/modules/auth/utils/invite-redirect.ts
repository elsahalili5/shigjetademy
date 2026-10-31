// Login sends the user back to the invite link they came from; only that internal path is allowed, so the parameter can't redirect elsewhere
const INVITE_PATH = /^\/invite\/([A-Za-z0-9_-]+)$/

export const toInvitePath = (token: string) => `/invite/${token}`

/** The invite token in a redirect search parameter, or undefined for anything that isn't an invite path */
export const readInviteToken = (redirect: unknown) => (typeof redirect === 'string' ? INVITE_PATH.exec(redirect)?.[1] : undefined)
