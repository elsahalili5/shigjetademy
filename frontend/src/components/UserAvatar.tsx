import { initials } from '#/lib/initials'

interface UserAvatarProps {
  name: string
  avatarUrl: string | null
  /** The exact size, shape and color classes the call site already uses for its initials badge */
  className: string
}

/** A user's photo where one is set, or their initials badge otherwise; the name is shown as text beside it, so the image is decorative */
export function UserAvatar({ name, avatarUrl, className }: UserAvatarProps) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt="" className={`${className} object-cover`} />
  }
  return (
    <span className={className} aria-hidden="true">
      {initials(name)}
    </span>
  )
}
