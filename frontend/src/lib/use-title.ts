import { useEffect } from 'react'

/** Keeps the tab title in step with the page. */
export function useTitle(title: string) {
  useEffect(() => {
    document.title = title
  }, [title])
}
