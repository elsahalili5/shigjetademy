import type { MyChild } from '@shigjetademy/shared/guardians'

const FALLBACK_GREETING = 'Welcome!'

/** "Welcome, Arta’s parents!", or "Welcome, Arta and Besa’s parents!" for several children; plain "Welcome!" until the children are known */
export const getParentsGreeting = (children: MyChild[] | undefined) => {
  if (!children || children.length === 0) return FALLBACK_GREETING
  const names = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(children.map((child) => child.first_name))
  return `Welcome, ${names}’s parents!`
}
