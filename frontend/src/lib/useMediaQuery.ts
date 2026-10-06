import { useSyncExternalStore } from 'react'

/** Subscribes to a CSS media query. Keep breakpoints in sync with index.css (--bp-desktop: 900px). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', notify)
      return () => mql.removeEventListener('change', notify)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export const DESKTOP_QUERY = '(min-width: 900px)'
export const useIsDesktop = () => useMediaQuery(DESKTOP_QUERY)
