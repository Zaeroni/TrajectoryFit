import { useState } from 'react'
import { api } from '../api/client'
import type { Tier } from '../api/types'
import { BodyCompPicker } from '../components/BodyCompPicker'
import { HeightPicker } from '../components/HeightPicker'
import { ChevronLeft, ChevronRight } from '../components/Icons'
import { GOAL_RANGE, LOGGING_OPTIONS, MEDICATION_OPTIONS, joinHeight, optionalNumber, splitHeight } from '../lib/profile'
import { useApp } from '../state/AppContext'
import type { Nav } from '../nav'

const DEVICES = ['Apple Watch', 'Fitbit', 'Whoop']

function LinkRow({ label, onClick, last }: { label: string; onClick: () => void; last?: boolean }) {
  return (
    <button className="factor-row" style={last ? { borderBottom: 'none' } : undefined} onClick={onClick}>
      <span style={{ fontSize: 14, flex: 1, textAlign: 'left' }}>{label}</span>
      <ChevronRight className="icon" style={{ color: 'var(--ink3)', width: 14, height: 14 }} />
    </button>
  )
}

export function Settings({ nav }: { nav: Nav }) {
  const { currentUser } = useApp()
  if (!currentUser) return <div className="center-note">Pick a user to begin.</div>
  // Keyed by user so switching users resets the form to that user's stored values.
  return <SettingsForm key={currentUser.id} nav={nav} />
}

function SettingsForm({ nav }: { nav: Nav }) {
  const { currentUser, reloadUsers, bumpData, toast } = useApp()
  const u = currentUser!
  const initial = splitHeight(u.heightIn)

  const [name, setName] = useState(u.name)
  const [goal, setGoal] = useState(u.goalWeightLb != null ? String(u.goalWeightLb) : '')
  const [medication, setMedication] = useState(u.medication)
  const [ft, setFt] = useState(initial.ft)
  const [inch, setInch] = useState(initial.inch)
  const [logging, setLogging] = useState<Tier>(u.loggingPreference)
  const [bodyComp, setBodyComp] = useState<string[]>(u.bodyCompAccess)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const heightChanged = ft !== initial.ft || inch !== initial.inch

  async function save() {
    setError(null)
    if (!name.trim()) return setError('Name can’t be blank')
    const g = optionalNumber(goal)
    if (g !== undefined && (isNaN(g) || g < GOAL_RANGE[0] || g > GOAL_RANGE[1])) {
      return setError(`Enter a goal weight between ${GOAL_RANGE[0]} and ${GOAL_RANGE[1]} lb`)
    }
    setSaving(true)
    try {
      await api.updateUser(u.id, {
        name: name.trim(),
        goalWeightLb: g,
        // Only send height when edited: the picker rounds to whole inches, which would
        // otherwise nudge a stored 68.9 in to 69 on every save.
        heightIn: heightChanged ? joinHeight(ft, inch) : undefined,
        medication,
        loggingPreference: logging,
        bodyCompAccess: bodyComp,
      })
      await reloadUsers(true)
      bumpData()
      toast('Settings saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <button className="back-row" onClick={nav.back}>
        <ChevronLeft className="icon" style={{ width: 20, height: 20 }} />
        <span style={{ fontSize: 16, fontWeight: 600 }}>Settings</span>
      </button>

      <div className="card">
        <span className="label">Profile and goals</span>
        <label className="label" htmlFor="set-name">Name</label>
        <input id="set-name" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        <label className="label" htmlFor="set-goal">Goal weight (lb)</label>
        <input id="set-goal" type="number" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="165" />
        <label className="label" htmlFor="set-med">GLP-1 medication</label>
        <select id="set-med" value={medication} onChange={(e) => setMedication(e.target.value)}>
          {MEDICATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <label className="label">Height</label>
        <HeightPicker ft={ft} inch={inch} onChange={(f, i) => { setFt(f); setInch(i) }} />
      </div>

      <div className="card">
        <span className="label">Logging style</span>
        <div className="toggle-pill" style={{ display: 'flex', width: '100%' }}>
          {LOGGING_OPTIONS.map((o) => (
            <button key={o.value} style={{ flex: 1 }} className={logging === o.value ? 'active' : ''} onClick={() => setLogging(o.value)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <span className="label">Body composition access</span>
        <BodyCompPicker value={bodyComp} onChange={setBodyComp} />
      </div>

      <div className="card">
        <span className="label">Connected devices</span>
        {DEVICES.map((d, i) => (
          <div key={d} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0',
            borderBottom: i < DEVICES.length - 1 ? '0.5px solid var(--line)' : 'none',
          }}>
            <span style={{ fontSize: 14 }}>{d}</span>
            <span className="badge badge-neutral" style={{ fontSize: 11 }}>Coming soon</span>
          </div>
        ))}
      </div>

      <div className="card">
        <LinkRow label="How this works" onClick={() => nav.go('howitworks')} />
        <LinkRow label="Terms of service" onClick={() => nav.go('terms')} />
        <LinkRow label="Add a new profile" onClick={() => nav.go('onboarding')} last />
      </div>

      {error && <p role="alert" style={{ fontSize: 13, color: 'var(--red)', margin: '4px 2px' }}>{error}</p>}
      <button className="btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</button>
    </div>
  )
}
