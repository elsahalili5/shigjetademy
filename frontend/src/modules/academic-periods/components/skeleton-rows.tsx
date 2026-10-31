const SKELETON_ROWS = 2

export function SkeletonRows() {
  return (
    <ul aria-busy="true" aria-label="Loading">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <li key={index} className="flex items-center gap-4 border-b border-rule px-5 py-4 last:border-b-0" aria-hidden="true">
          <span className="size-10 flex-none animate-pulse rounded-[10px] bg-mist" />
          <span className="grid flex-1 gap-1.5">
            <span className="h-3.5 w-40 animate-pulse rounded bg-mist" />
            <span className="h-3 w-64 max-w-full animate-pulse rounded bg-mist" />
          </span>
        </li>
      ))}
    </ul>
  )
}
