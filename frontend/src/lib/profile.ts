import type { Tier } from '../api/types'

export const MEDICATION_OPTIONS = [
  { value: 'semaglutide', label: 'Yes, semaglutide (Wegovy, Ozempic)' },
  { value: 'tirzepatide', label: 'Yes, tirzepatide (Zepbound, Mounjaro)' },
  { value: 'other', label: 'Yes, another GLP-1' },
  { value: 'none', label: 'Not yet, considering it' },
] as const

export const BODY_COMP_OPTIONS = [
  { value: 'gym_scan', label: 'Gym with a body scan machine' },
  { value: 'smart_scale', label: 'A smart scale at home' },
  { value: 'paid_scan', label: 'Occasional paid scan' },
] as const

export const BODY_COMP_HELP = [
  ['Gym scan', 'a machine like InBody at many commercial gyms; gives body fat percent and lean mass in minutes'],
  ['Smart scale', 'a home scale that estimates body fat through bioimpedance; less precise but easy to use often'],
  ['Paid scan', 'DEXA or BodPod at a standalone clinic; the most accurate option but not free'],
] as const

export const LOGGING_OPTIONS: { value: Tier; label: string; hint: string }[] = [
  { value: 'quick', label: 'Quick', hint: 'three taps a day' },
  { value: 'estimate', label: 'Estimate', hint: 'rough portions per meal' },
  { value: 'precise', label: 'Precise', hint: 'exact grams per meal' },
]

export const FEET = [3, 4, 5, 6, 7]
export const INCHES = Array.from({ length: 12 }, (_, i) => i)

export function splitHeight(totalIn: number | null | undefined): { ft: number; inch: number } {
  if (totalIn == null) return { ft: 5, inch: 8 }
  const rounded = Math.round(totalIn)
  return { ft: Math.floor(rounded / 12), inch: rounded % 12 }
}

export const joinHeight = (ft: number, inch: number) => ft * 12 + inch

/** Parses an optional numeric field; returns undefined when blank, NaN when not a number. */
export function optionalNumber(raw: string): number | undefined {
  return raw.trim() === '' ? undefined : Number(raw)
}

export const GOAL_RANGE = [60, 700] as const
