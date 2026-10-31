const SKELETON_ROWS = 4

/** Placeholder rows shaped like the student table while it loads */
export function SkeletonRows() {
  return (
    <ul aria-busy="true" aria-label="Loading">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <li key={index} className="flex items-center gap-4 border-b border-rule px-5 py-4 last:border-b-0" aria-hidden="true">
          <span className="grid flex-1 gap-1.5">
            <span className="h-3.5 w-44 animate-pulse rounded bg-mist" />
            <span className="h-3 w-24 animate-pulse rounded bg-mist" />
          </span>
          <span className="h-3.5 w-16 animate-pulse rounded bg-mist max-[640px]:hidden" />
          <span className="h-3.5 w-24 animate-pulse rounded bg-mist max-[640px]:hidden" />
        </li>
      ))}
    </ul>
  )
}
