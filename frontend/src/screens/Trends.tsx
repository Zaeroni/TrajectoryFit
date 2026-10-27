import { useState } from 'react'
import { api } from '../api/client'
import { WeightChart, LevelBars } from '../components/Charts'
import { CheckCircle } from '../components/Icons'
import { levelColor } from '../lib/colors'
import { weekdayShort } from '../lib/dates'
import { useIsDesktop } from '../lib/useMediaQuery'
import { useAsync } from '../lib/useAsync'
import { useApp } from '../state/AppContext'

const RANGES = [7, 30, 90]

export function Trends() {
  const { currentUser, dataVersion } = useApp()
  const userId = currentUser?.id
  const [range, setRange] = useState(7)
  const trends = useAsync(() => api.getTrends(userId!, range), [userId, range, dataVersion])
  const weighIns = useAsync(() => api.getWeighIns(userId!), [userId, dataVersion])

  if (!currentUser) return <div className="center-note">Pick a user to begin.</div>

  const isDesktop = useIsDesktop()
  const data = trends.data
  const last7 = data ? data.points.slice(-7) : []

  // On 30D/90D, start the weight axis at the first-ever weigh-in when history is shorter than the range,
  // so the chart fills its width. Needs 2+ weigh-ins; with fewer there is no line to fill the space with.
  const firstWeighIn = weighIns.data && weighIns.data.length >= 2 ? weighIns.data[0].loggedOn : null
  const weightPoints = data && range > 7 && firstWeighIn && firstWeighIn > data.points[0].date
    ? data.points.filter((p) => p.date >= firstWeighIn)
    : data?.points
  const chartReady = !!data && !trends.loading && !weighIns.loading

  return (
    <div className="screen-grid">
      <div className="span-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 2px 16px' }}>
        <h1 className="screen-title" style={{ margin: 0 }}>Trends</h1>
        <div className="toggle-pill">
          {RANGES.map((r) => (
            <button key={r} className={range === r ? 'active' : ''} onClick={() => setRange(r)}>{r}D</button>
          ))}
        </div>
      </div>

      <div className="card span-2">
        <span className="label">Weight</span>
        {chartReady && weightPoints ? <WeightChart points={weightPoints} showAxes showSmoothed rangeDays={range} height={isDesktop ? 280 : 150} /> : <div className="spinner" />}
        <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
          <Legend color="var(--blue)" label="Actual" />
          <Legend color="var(--ink3)" label="Smoothed" />
        </div>
      </div>

      <div className="row2 contents-desktop" style={{ marginBottom: 12 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <span className="label">Avg protein adherence</span>
          <span style={{ fontSize: 22, fontWeight: 600 }}>
            {data?.avgProteinAdherencePct != null ? `${data.avgProteinAdherencePct}%` : '—'}
          </span>
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <span className="label">Training sessions</span>
          <span style={{ fontSize: 22, fontWeight: 600 }}>
            {data?.resistanceSessionsLast7Days ?? '—'} <span style={{ fontSize: 12, color: 'var(--ink3)', fontWeight: 400 }}>this week</span>
          </span>
        </div>
      </div>

      <div className="card">
        <span className="label">Protein by day (last 7)</span>
        {data
          ? <LevelBars segments={last7.map((p) => ({ color: levelColor(p.proteinLevel), label: weekdayShort(p.date) }))} />
          : <div className="muted">…</div>}
      </div>

      <div className="card">
        <span className="label">Training this week</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
          {last7.map((p) => {
            const trained = p.training != null
            return (
              <div key={p.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--ink3)' }}>{weekdayShort(p.date).slice(0, 1)}</span>
                <div style={{
                  width: '100%', aspectRatio: '1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: p.training === 'resistance' ? 'var(--blue-tint)' : 'var(--surface)',
                  border: p.training === 'resistance' ? 'none' : '1px solid var(--line)',
                }}>
                  {trained && (
                    <CheckCircle className="ico" style={{ width: 12, height: 12, color: p.training === 'resistance' ? 'var(--blue)' : 'var(--ink3)' }} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--ink2)' }}>
      <span style={{ width: 10, height: 2, background: color, display: 'inline-block' }} />{label}
    </span>
  )
}
