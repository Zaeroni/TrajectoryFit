import { FEET, INCHES } from '../lib/profile'

export function HeightPicker({ ft, inch, onChange }: {
  ft: number; inch: number; onChange: (ft: number, inch: number) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <select style={{ margin: 0 }} value={ft} aria-label="Feet" onChange={(e) => onChange(Number(e.target.value), inch)}>
        {FEET.map((f) => <option key={f} value={f}>{f}</option>)}
      </select>
      <span className="muted">ft</span>
      <select style={{ margin: 0 }} value={inch} aria-label="Inches" onChange={(e) => onChange(ft, Number(e.target.value))}>
        {INCHES.map((i) => <option key={i} value={i}>{i}</option>)}
      </select>
      <span className="muted">in</span>
    </div>
  )
}
