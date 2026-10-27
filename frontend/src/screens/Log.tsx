import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import type { Level, NutritionDay, Tier } from '../api/types'
import { DayStrip } from '../components/DayStrip'
import { addDaysISO, shortLabel, todayISO } from '../lib/dates'
import { useAsync } from '../lib/useAsync'
import { useApp } from '../state/AppContext'

const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'] as const
const MEAL_LABEL: Record<string, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks' }
const LEVELS: Level[] = ['low', 'good', 'high']
const LEVEL_LABEL: Record<Level, string> = { low: 'Low', good: 'Good', high: 'High' }
const KG_PER_LB = 1 / 2.2046

const round5 = (n: number) => Math.round(n / 5) * 5

function logDays(): string[] {
  const today = todayISO()
  const out: string[] = []
  for (let i = 13; i >= 0; i--) out.push(addDaysISO(today, -i))
  return out
}

export function Log() {
  const { currentUser, selectedDate, setSelectedDate, dataVersion, bumpData, toast } = useApp()
  const userId = currentUser?.id

  const weighIns = useAsync(() => api.getWeighIns(userId!), [userId, dataVersion])
  const nutrition = useAsync(() => api.getNutrition(userId!), [userId, dataVersion])
  const bodyComp = useAsync(() => api.getBodyComp(userId!), [userId, dataVersion])

  const [tier, setTier] = useState<Tier>(currentUser?.loggingPreference ?? 'quick')
  const [weight, setWeight] = useState('')
  const [quickLevel, setQuickLevel] = useState<Level | null>(null)
  const [mealLevels, setMealLevels] = useState<Record<string, Level | null>>({})
  const [mealGrams, setMealGrams] = useState<Record<string, string>>({})
  const [openMeal, setOpenMeal] = useState<string | null>('breakfast')
  const [bodyFat, setBodyFat] = useState('')
  const [leanMass, setLeanMass] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Prefill the form from stored data whenever the day (or fetched data) changes.
  useEffect(() => {
    const w = weighIns.data?.find((x) => x.loggedOn === selectedDate)
    setWeight(w ? String(w.weightLb) : '')
    const bc = bodyComp.data?.find((x) => x.loggedOn === selectedDate)
    setBodyFat(bc?.bodyFatPct != null ? String(bc.bodyFatPct) : '')
    setLeanMass(bc?.leanMassLb != null ? String(bc.leanMassLb) : '')

    const day = nutrition.data?.find((x) => x.loggedOn === selectedDate)
    setQuickLevel(null); setMealLevels({}); setMealGrams({})
    if (day) {
      setTier(day.tier)
      applyNutritionDay(day)
    } else {
      setTier(currentUser?.loggingPreference ?? 'quick')
    }
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, weighIns.data, nutrition.data, bodyComp.data])

  function applyNutritionDay(day: NutritionDay) {
    if (day.tier === 'quick') {
      setQuickLevel((day.meals[0]?.level ?? null) as Level | null)
    } else if (day.tier === 'estimate') {
      const levels: Record<string, Level | null> = {}
      day.meals.forEach((m) => { levels[m.meal] = m.level })
      setMealLevels(levels)
    } else {
      const grams: Record<string, string> = {}
      day.meals.forEach((m) => { if (m.grams != null) grams[m.meal] = String(m.grams) })
      setMealGrams(grams)
    }
  }

  // 7-day trailing average weight for protein gram targets.
  const avgLb = useMemo(() => {
    const from = addDaysISO(selectedDate, -6)
    const inWindow = (weighIns.data ?? []).filter((w) => w.loggedOn >= from && w.loggedOn <= selectedDate)
    const entered = parseFloat(weight)
    const vals = inWindow.map((w) => w.weightLb)
    if (!isNaN(entered)) vals.push(entered)
    if (vals.length === 0) return 150
    return vals.reduce((a, b) => a + b, 0) / vals.length
  }, [weighIns.data, selectedDate, weight])

  const kg = avgLb * KG_PER_LB
  const dayLo = round5(kg * 1.2), dayHi = round5(kg * 1.6)
  const mealLo = round5((kg * 1.2) / 4), mealHi = round5((kg * 1.6) / 4)
  const dayRange = { low: `under ${dayLo}g`, good: `${dayLo} to ${dayHi}g`, high: `over ${dayHi}g` }
  const mealRange = { low: `under ${mealLo}g`, good: `${mealLo} to ${mealHi}g`, high: `over ${mealHi}g` }

  const datesWithData = useMemo(() => {
    const s = new Set<string>()
    weighIns.data?.forEach((w) => s.add(w.loggedOn))
    nutrition.data?.forEach((n) => s.add(n.loggedOn))
    bodyComp.data?.forEach((b) => s.add(b.loggedOn))
    return s
  }, [weighIns.data, nutrition.data, bodyComp.data])

  const preciseTotal = MEALS.reduce((sum, m) => sum + (parseFloat(mealGrams[m]) || 0), 0)

  if (!currentUser) return <div className="center-note">Pick a user to begin.</div>

  async function save() {
    setError(null)
    const w = weight.trim() === '' ? null : parseFloat(weight)
    if (w != null && (isNaN(w) || w < 60 || w > 700)) return setError('Enter a weight between 60 and 700 lb')
    const bf = bodyFat.trim() === '' ? null : parseFloat(bodyFat)
    const lm = leanMass.trim() === '' ? null : parseFloat(leanMass)
    if (bf != null && (isNaN(bf) || bf < 3 || bf > 70)) return setError('Body fat should be 3 to 70%')
    if (lm != null && (isNaN(lm) || lm < 20 || lm > 500)) return setError('Lean mass should be 20 to 500 lb')

    setSaving(true)
    try {
      const uid = currentUser!.id
      if (w != null) await api.postWeighIn(uid, selectedDate, w)

      if (tier === 'quick' && quickLevel) {
        await api.postNutritionQuick(uid, selectedDate, quickLevel)
      } else if (tier === 'estimate') {
        const levels: Record<string, Level> = {}
        MEALS.forEach((m) => { if (mealLevels[m]) levels[m] = mealLevels[m]! })
        if (Object.keys(levels).length) await api.postNutritionEstimate(uid, selectedDate, levels)
      } else if (tier === 'precise') {
        const grams: Record<string, number> = {}
        MEALS.forEach((m) => { const g = parseFloat(mealGrams[m]); if (!isNaN(g)) grams[m] = g })
        if (Object.keys(grams).length) await api.postNutritionPrecise(uid, selectedDate, grams)
      }

      if (bf != null || lm != null) {
        await api.postBodyComp({ userId: uid, loggedOn: selectedDate, bodyFatPct: bf ?? undefined, leanMassLb: lm ?? undefined, source: 'smart_scale' })
      }
      bumpData()
      toast(`Saved for ${shortLabel(selectedDate)}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="narrow">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 2px 8px' }}>
        <h1 className="screen-title" style={{ margin: 0 }}>Log</h1>
        <div className="toggle-pill">
          {(['quick', 'estimate', 'precise'] as Tier[]).map((t) => (
            <button key={t} className={tier === t ? 'active' : ''} onClick={() => setTier(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <DayStrip dates={logDays()} selected={selectedDate} onSelect={setSelectedDate} datesWithData={datesWithData} />

      <label className="label">Weight (lb)</label>
      <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 184" />
      <p style={{ fontSize: 12, color: 'var(--ink3)', margin: '-8px 2px 16px' }}>
        {(weighIns.data ?? []).some((w) => w.loggedOn <= selectedDate)
          ? `7-day average: ${avgLb.toFixed(1)} lb`
          : 'No prior weights logged yet'}
      </p>

      {tier === 'quick' && (
        <div>
          <label className="label">Protein, roughly</label>
          <p style={{ fontSize: 12, color: 'var(--ink3)', margin: '0 2px 10px' }}>One tap for the whole day, no meal breakdown</p>
          <div className="row3">
            {LEVELS.map((lvl) => (
              <button key={lvl} className={`level-btn${quickLevel === lvl ? ' selected' : ''}`} onClick={() => setQuickLevel(lvl)}>
                <span className="level-name">{LEVEL_LABEL[lvl]}</span>
                <span className="level-grams">{dayRange[lvl]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {tier === 'estimate' && (
        <div>
          <label className="label">Protein by meal</label>
          <p style={{ fontSize: 12, color: 'var(--ink3)', margin: '0 2px 10px' }}>Tap a meal; ranges are based on your 7-day average weight</p>
          {MEALS.map((m) => {
            const lvl = mealLevels[m] ?? null
            const open = openMeal === m
            return (
              <div className="meal-row" key={m}>
                <div className="meal-header" onClick={() => setOpenMeal(open ? null : m)}>
                  <span style={{ fontSize: 14, flex: 1 }}>{MEAL_LABEL[m]}</span>
                  {lvl
                    ? <span style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 500 }}>{LEVEL_LABEL[lvl]} ({mealRange[lvl]})</span>
                    : <span style={{ fontSize: 12, color: 'var(--ink3)' }}>Tap to log</span>}
                </div>
                {open && (
                  <div className="meal-options">
                    {LEVELS.map((level) => (
                      <button
                        key={level}
                        className={`level-btn${lvl === level ? ' selected' : ''}`}
                        onClick={() => { setMealLevels((prev) => ({ ...prev, [m]: level })); setOpenMeal(null) }}
                      >
                        <span className="level-name">{LEVEL_LABEL[level]}</span>
                        <span className="level-grams">{mealRange[level]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tier === 'precise' && (
        <div>
          <label className="label">Protein by meal, exact grams</label>
          <p style={{ fontSize: 12, color: 'var(--ink3)', margin: '0 2px 10px' }}>Enter grams per meal; they add up as you go</p>
          {MEALS.map((m) => (
            <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--fill)', border: '1px solid var(--line)', borderRadius: 12, padding: '10px 12px', marginBottom: 8 }}>
              <span style={{ fontSize: 14, flex: 1 }}>{MEAL_LABEL[m]}</span>
              <input
                type="number" placeholder="0" value={mealGrams[m] ?? ''}
                onChange={(e) => setMealGrams((prev) => ({ ...prev, [m]: e.target.value }))}
                style={{ width: 80, margin: 0, padding: '8px 10px', textAlign: 'right' }}
              />
              <span style={{ fontSize: 13, color: 'var(--ink3)' }}>g</span>
            </div>
          ))}
          <div className="card" style={{ background: 'var(--fill)', boxShadow: 'none', marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--ink2)' }}>Logged</span>
              <span style={{ fontSize: 20, fontWeight: 600 }}>{Math.round(preciseTotal)}g</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink3)', margin: '4px 0 0' }}>Target for you: {dayLo} to {dayHi}g, based on your 7-day average weight</p>
          </div>
        </div>
      )}

      <label className="label" style={{ marginTop: 14 }}>Body composition <span style={{ color: 'var(--ink3)', fontWeight: 400 }}>(optional)</span></label>
      <p style={{ fontSize: 12, color: 'var(--ink3)', margin: '0 2px 10px' }}>Only if you had a scan or scale reading today</p>
      <div className="row2">
        <div>
          <label className="label">Body fat %</label>
          <input type="number" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} placeholder="e.g. 18.5" />
        </div>
        <div>
          <label className="label">Lean mass (lb)</label>
          <input type="number" value={leanMass} onChange={(e) => setLeanMass(e.target.value)} placeholder="e.g. 150" />
        </div>
      </div>

      {error && <p style={{ fontSize: 12, color: 'var(--red)', margin: '0 2px 10px' }}>{error}</p>}
      <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
    </div>
  )
}
