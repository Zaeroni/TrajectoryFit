export type Screen = 'home' | 'log' | 'trends' | 'train' | 'howitworks' | 'factor' | 'settings' | 'terms' | 'onboarding'
export type FactorKey = 'weight' | 'protein' | 'training'

export interface Nav {
  go: (screen: Screen) => void
  openFactor: (key: FactorKey) => void
  back: () => void
}
