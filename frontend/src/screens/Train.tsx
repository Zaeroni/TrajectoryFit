import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { TrainingKind } from '../api/types'
import { DayStrip } from '../components/DayStrip'
import { addDaysISO, shortLabel, todayISO } from '../lib/dates'
import { useAsync } from '../lib/useAsync'
import { useApp } from '../state/AppContext'
import type { Nav } from '../nav'

const MUSCLES = ['Legs', 'Push', 'Pull', 'Core', 'Full body', 'Other']
const EFFORTS = ['light', 'moderate', 'hard']
const CARDIO_TYPES = ['Walking', 'Running', 'Cycling', 'Swimming', 'HIIT', 'Other']

function trainDays(): string[] {
  const today = todayISO()
  const out: string[] = []
  for (let i = 13; i >= 0; i--) out.push(addDaysISO(today, -i))
  return out
}

export function Train({ nav }: { nav: Nav }) {
  const { currentUser, selectedDate, setSelectedDate, dataVersion, bumpData, toast } = useApp()
  const userId = currentUser?.id
  const workouts = useAsync(() => api.getWorkouts(userId!), [userId, dataVersion])

  const [type, setType] = useState<TrainingKind>('resistance')
  const [duration, setDuration] = useState('45')
  const [muscles, setMuscles] = useState<string[]>([])
  const [effort, setEffort] = useState('moderate')
  const [cardioType, setCardioType] = useState('Walking')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const w = workouts.data?.find((x) => x.loggedOn === selectedDate)
    if (w) {
      setType(w.type)
      setDuration(w.durationMin != null ? String(w.durationMin) : '0')
      setMuscles(w.muscles ?? [])
      setEffort(w.effort ?? 'moderate')
      setCardioType(w.cardioType ?? 'Walking')
    } else {
      setType('resistance'); setDuration('45'); setMuscles([]); setEffort('moderate'); setCardioType('Walking')
    }
    setError(null)
  }, [selectedDate, workouts.data])

  const datesWithData = new Set((workouts.data ?? []).map((w) => w.loggedOn))

  if (!currentUser) return <div className="center-note">Pick a user to begin.</div>

  function toggleMuscle(m: string) {
    setMuscles((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
  }

  async function save() {
    setError(null)
    setSaving(true)
    try {
      const dur = parseInt(duration, 10)
      await api.postWorkout({
        userId: currentUser!.id,
        loggedOn: selectedDate,
        type,
        durationMin: isNaN(dur) ? undefined : dur,
        muscles: type === 'resistance' ? muscles : undefined,
        effort: type === 'resistance' ? effort : undefined,
        cardioType: type === 'cardio' ? cardioType : undefined,
      })
      bumpData()
      toast(`Saved for ${shortLabel(selectedDate)}`)
      nav.go('home')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="narrow">
      <h1 className="screen-title">Log training</h1>
      <DayStrip dates={trainDays()} selected={selectedDate} onSelect={setSelectedDate} datesWithData={datesWithData} />

      <label className="label">Session type</label>
      <div className="row3" style={{ marginBottom: 16 }}>
        {(['resistance', 'cardio', 'rest'] as TrainingKind[]).map((t) => (
          <button key={t} className={`btn${type === t ? ' btn-selected' : ''}`} onClick={() => setType(t)}>
            {t === 'rest' ? 'Rest day' : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {type === 'resistance' && (
        <>
          <label className="label">Duration (min)</label>
          <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
          <label className="label">Muscle groups trained</label>
          <div className="row3" style={{ marginBottom: 14 }}>
            {MUSCLES.map((m) => (
              <button key={m} className={`chip${muscles.includes(m) ? ' selected' : ''}`} onClick={() => toggleMuscle(m)}>{m}</button>
            ))}
          </div>
          <label className="label">Effort</label>
          <div className="row3">
            {EFFORTS.map((e) => (
              <button key={e} className={`chip${effort === e ? ' selected' : ''}`} onClick={() => setEffort(e)}>
                {e[0].toUpperCase() + e.slice(1)}
              </button>
            ))}
          </div>
        </>
      )}

      {type === 'cardio' && (
        <>
          <label className="label">Duration (min)</label>
          <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
          <label className="label">Type</label>
          <select value={cardioType} onChange={(e) => setCardioType(e.target.value)}>
            {CARDIO_TYPES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </>
      )}

      {type === 'rest' && (
        <p style={{ fontSize: 12, color: 'var(--ink3)' }}>
          No training logged today. That’s fine occasionally, but frequent rest days are a factor in your risk score.
        </p>
      )}

      {error && <p style={{ fontSize: 12, color: 'var(--red)', margin: '10px 2px 0' }}>{error}</p>}
      <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
    </div>
  )
}
