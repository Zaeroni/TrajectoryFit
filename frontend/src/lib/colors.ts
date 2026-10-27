import type { Band, Level } from '../api/types'

/** CSS custom-property name for a band's accent color. */
export function bandColorVar(band: Band | null): string {
  switch (band) {
    case 'Low': return '--green'
    case 'Moderate': return '--yellow'
    case 'High': return '--red'
    default: return '--ink3'
  }
}

/** Variable to use when the accent is drawn as text or a thin icon: true yellow is unreadable on white. */
export function textVar(name: string): string {
  return name === '--yellow' ? '--yellow-text' : name
}

/** CSS color (a var() reference) for a band, for backgrounds and fills. Follows the theme automatically. */
export function bandColor(band: Band | null): string {
  return `var(${bandColorVar(band)})`
}

export function levelColor(level: Level | null): string {
  switch (level) {
    case 'low': return 'var(--red)'
    case 'good': return 'var(--green)'
    case 'high': return 'var(--yellow)'
    default: return 'var(--line)'
  }
}

/** Badge class from a factor status string, matching the prototype's color logic. */
export function statusBadgeClass(status: string): string {
  const green = ['On track', 'Lean mass holding']
  const yellow = ['Slightly fast', 'Inconsistent', 'Slight lean mass dip']
  const red = ['Losing too fast', 'Below target', 'Losing lean mass']
  if (green.includes(status)) return 'badge-green'
  if (yellow.includes(status)) return 'badge-yellow'
  if (red.includes(status)) return 'badge-red'
  // "Nx this week" — green for >=2, yellow for 1, red for 0
  const m = status.match(/^(\d+)x this week$/)
  if (m) {
    const n = Number(m[1])
    return n >= 2 ? 'badge-green' : n === 1 ? 'badge-yellow' : 'badge-red'
  }
  return 'badge-neutral'
}
