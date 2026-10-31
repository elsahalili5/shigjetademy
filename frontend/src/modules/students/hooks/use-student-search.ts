import { useRef, useState } from 'react'

const SEARCH_DELAY_MS = 300

/** The search box's text right away, and the search to run once typing pauses, so each key press doesn't fetch */
export function useStudentSearch() {
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const change = (value: string) => {
    setText(value)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setSearch(value.trim()), SEARCH_DELAY_MS)
  }

  return { text, search, change }
}
