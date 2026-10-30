/** Up to two initials from a full name, for avatar tiles. */
export function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
}
