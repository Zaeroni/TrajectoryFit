import { useState } from 'react'
import { api } from '../api/client'
import type { Tier } from '../api/types'
import { BodyCompPicker } from '../components/BodyCompPicker'
import { HeightPicker } from '../components/HeightPicker'
import { GOAL_RANGE, LOGGING_OPTIONS, MEDICATION_OPTIONS, joinHeight, optionalNumber } from '../lib/profile'
import { todayISO } from '../lib/dates'
import { useApp } from '../state/AppContext'
import type { Nav } from '../nav'

const TOTAL = 5

/** Five-step profile setup. Finishing creates a new user and switches to them. */
export function Onboarding({ nav, canCancel }: { nav: Nav; canCancel: boolean }) {
  const { setCurrentUserId, reloadUsers, toast } = useApp()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [weight, setWeight] = useState('')
  const [ft, setFt] = useState(5)
  const [inch, setInch] = useState(8)
  const [medication, setMedication] = useState<string>(MEDICATION_OPTIONS[0].value)
  const [goal, setGoal] = useState('')
  const [bodyComp, setBodyComp] = useState<string[]>([])
  const [logging, setLogging] = useState<Tier>('quick')
  const [acknowledged, setAcknowledged] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function validate(): string | null {
    if (step === 1) {
      if (!name.trim()) return 'Enter your name'
      const w = optionalNumber(weight)
      if (w !== undefined && (isNaN(w) || w < 60 || w > 700)) return 'Enter a weight between 60 and 700 lb'
    }
    if (step === 2) {
      const g = optionalNumber(goal)
      if (g !== undefined && (isNaN(g) || g < GOAL_RANGE[0] || g > GOAL_RANGE[1])) {
        return `Enter a goal weight between ${GOAL_RANGE[0]} and ${GOAL_RANGE[1]} lb`
      }
    }
    if (step === TOTAL && !acknowledged) return 'Check the box to continue'
    return null
  }

  async function next() {
    const problem = validate()
    setError(problem)
    if (problem) return
    if (step < TOTAL) return setStep(step + 1)

    setSaving(true)
    try {
      const user = await api.createUser({
        name: name.trim(),
        heightIn: joinHeight(ft, inch),
        goalWeightLb: optionalNumber(goal),
        medication,
        loggingPreference: logging,
        bodyCompAccess: bodyComp,
      })
      const w = optionalNumber(weight)
      if (w !== undefined) await api.postWeighIn(user.id, todayISO(), w)
      setCurrentUserId(user.id)
      await reloadUsers(true)
      toast(`Welcome, ${user.name.split(' ')[0]}`)
      nav.go('home')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create your profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="progress-track">
        {Array.from({ length: TOTAL }, (_, i) => <div key={i} className={`progress-seg${i < step ? ' done' : ''}`} />)}
      </div>
      <p className="muted" style={{ margin: '0 2px 4px', fontSize: 12 }}>Step {step} of {TOTAL}</p>

      {step === 1 && (
        <div>
          <h1 className="screen-title">Let’s set up your profile</h1>
          <p className="screen-sub">This helps us personalize your targets.</p>
          <label className="label" htmlFor="onb-name">Name</label>
          <input id="onb-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={100} />
          <label className="label" htmlFor="onb-weight">Current weight (lb)</label>
          <input id="onb-weight" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="185" />
          <label className="label">Height</label>
          <HeightPicker ft={ft} inch={inch} onChange={(f, i) => { setFt(f); setInch(i) }} />
        </div>
      )}

      {step === 2 && (
        <div>
          <h1 className="screen-title">GLP-1 medication and goals</h1>
          <p className="screen-sub">This sets how we read your weight trend.</p>
          <label className="label" htmlFor="onb-med">Currently taking a GLP-1 medication</label>
          <select id="onb-med" value={medication} onChange={(e) => setMedication(e.target.value)}>
            {MEDICATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <label className="label" htmlFor="onb-goal">Goal weight (lb)</label>
          <input id="onb-goal" type="number" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="165" />
        </div>
      )}

      {step === 3 && (
        <div>
          <h1 className="screen-title">Body composition access</h1>
          <p className="screen-sub">Select all that apply. Skip it if none do.</p>
          <BodyCompPicker value={bodyComp} onChange={setBodyComp} />
        </div>
      )}

      {step === 4 && (
        <div>
          <h1 className="screen-title">Logging style</h1>
          <p className="screen-sub">How you’ll log protein. You can change this any time in Settings.</p>
          {LOGGING_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`onb-option${logging === o.value ? ' selected' : ''}`}
              aria-pressed={logging === o.value}
              onClick={() => setLogging(o.value)}
            >
              <span style={{ flex: 1, textAlign: 'left', fontSize: 14 }}>
                <strong>{o.label}</strong> <span className="muted">· {o.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {step === 5 && (
        <div>
          <h1 className="screen-title">What your score reflects</h1>
          <p className="screen-sub" style={{ marginBottom: 14 }}>
            Your risk score is based on what you log: weight trend, protein, and training. It’s not a full
            picture of your diet or your health. It won’t catch things like low overall food intake, nutrient
            quality, or sleep, and it doesn’t replace a doctor or dietitian.
          </p>
          <label className="onb-ack">
            <input type="checkbox" checked={acknowledged} onChange={(e) => { setAcknowledged(e.target.checked); setError(null) }} />
            <span>I understand this score reflects what I log, not a full picture of my health.</span>
          </label>
        </div>
      )}

      {error && <p role="alert" style={{ fontSize: 13, color: 'var(--red)', margin: '8px 2px 0' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
        {(step > 1 || canCancel) && (
          <button className="btn" style={{ flex: 1 }} disabled={saving}
            onClick={() => (step > 1 ? (setError(null), setStep(step - 1)) : nav.back())}>
            {step > 1 ? 'Back' : 'Cancel'}
          </button>
        )}
        <button className="btn-primary" style={{ flex: 1, marginTop: 0 }} disabled={saving} onClick={next}>
          {saving ? 'Saving…' : step === TOTAL ? 'Finish' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
