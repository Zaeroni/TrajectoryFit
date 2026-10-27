import { useEffect, useState } from 'react'

export type ThemeOverride = 'light' | 'dark' | null

const STORAGE_KEY = 'tf-theme'

/** Current resolved value of a CSS variable, e.g. getThemeColor('--green'). For props that can't take var(). */
export function getThemeColor(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/** Apply the saved light/dark override (if any) to <html>. Call before first render. */
export function applyStoredTheme(): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') document.documentElement.setAttribute('data-theme', saved)
  } catch { /* storage unavailable: follow the device */ }
}

/** Set or clear (null = follow device) the override and persist it. Used by Settings. */
export function setThemeOverride(theme: ThemeOverride): void {
  const root = document.documentElement
  if (theme) root.setAttribute('data-theme', theme)
  else root.removeAttribute('data-theme')
  try {
    if (theme) localStorage.setItem(STORAGE_KEY, theme)
    else localStorage.removeItem(STORAGE_KEY)
  } catch { /* ignore */ }
}

/** Resolved values for the given variables; re-read whenever the theme changes. */
export function useThemeColors<K extends string>(names: readonly K[]): Record<K, string> {
  const read = () => Object.fromEntries(names.map((n) => [n, getThemeColor(n)])) as Record<K, string>
  const [colors, setColors] = useState(read)
  useEffect(() => {
    const update = () => setColors(read())
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', update)
    const obs = new MutationObserver(update)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    update()
    return () => { mq.removeEventListener('change', update); obs.disconnect() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names.join(',')])
  return colors
}
