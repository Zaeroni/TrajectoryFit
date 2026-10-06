import { BODY_COMP_HELP, BODY_COMP_OPTIONS } from '../lib/profile'

/** Multi-select of body-composition sources, with a short explainer of each. */
export function BodyCompPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])

  return (
    <div>
      {BODY_COMP_OPTIONS.map((o) => {
        const selected = value.includes(o.value)
        return (
          <button
            key={o.value}
            type="button"
            className={`onb-option${selected ? ' selected' : ''}`}
            aria-pressed={selected}
            onClick={() => toggle(o.value)}
          >
            <span style={{ flex: 1, fontSize: 14, textAlign: 'left' }}>{o.label}</span>
            {selected && <span aria-hidden="true">✓</span>}
          </button>
        )
      })}
      <details style={{ marginTop: 8 }}>
        <summary className="muted" style={{ cursor: 'pointer' }}>What are these options?</summary>
        {BODY_COMP_HELP.map(([name, text]) => (
          <p key={name} style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.5, margin: '6px 0 0' }}>
            <strong>{name}</strong>: {text}
          </p>
        ))}
      </details>
    </div>
  )
}
