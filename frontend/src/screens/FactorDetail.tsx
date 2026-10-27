import { api } from '../api/client'
import type { TrendPoint } from '../api/types'
import { LevelBars } from '../components/Charts'
import { ChevronLeft } from '../components/Icons'
import { statusBadgeClass } from '../lib/colors'
import { weekdayShort } from '../lib/dates'
import { useAsync } from '../lib/useAsync'
import { useApp } from '../state/AppContext'
import type { FactorKey, Nav } from '../nav'

const COPY: Record<FactorKey, { why: string; help: string; caveat: string }> = {
  weight: {
    why: 'Losing faster than roughly 1% of bodyweight per week raises the risk of losing lean mass alongside fat.',
    help: 'Keep your pace steady — aim to stay under about 1% of bodyweight per week.',
    caveat: 'Day-to-day changes can reflect water retention or GI symptoms, not just fat loss, especially early on a GLP-1. That’s why this looks at your trend, not any single reading.',
  },
  protein: {
    why: 'When protein falls below roughly 1.2 to 1.6g per kg of bodyweight, your body is more likely to break down muscle for fuel during weight loss, not just fat.',
    help: 'Add a protein source to meals where you tend to fall short. A shake or bar between meals is an easy way to close the gap.',
    caveat: 'This reflects the amount you logged, not how it’s spread across the day or what else you ate. Hitting your number with one meal isn’t the same as spreading it across three.',
  },
  training: {
    why: 'Zero to one resistance sessions a week is a major flag, since training is what signals your body to keep the muscle it has.',
    help: 'Aim for at least 2 resistance sessions this week, even short ones.',
    caveat: 'This counts resistance sessions logged, not the quality or intensity of each one. Two solid sessions matter more than three half-hearted ones.',
  },
}

const NEUTRAL = 'var(--line)'
const GREEN = 'var(--green)'
const YELLOW = 'var(--yellow)'
const RED = 'var(--red)'

function buildSegments(key: FactorKey, points: TrendPoint[]): { color: string; label: string }[] {
  return points.map((p, i) => {
    const label = weekdayShort(p.date)
    if (key === 'protein') {
      const c = p.proteinLevel === 'good' ? GREEN : p.proteinLevel === 'high' ? YELLOW : p.proteinLevel === 'low' ? RED : NEUTRAL
      return { color: c, label }
    }
    if (key === 'training') {
      const c = p.training === 'resistance' ? GREEN : p.training == null ? NEUTRAL : RED
      return { color: c, label }
    }
    // weight: color by day-over-day change
    if (p.weightLb == null) return { color: NEUTRAL, label }
    const prev = [...points.slice(0, i)].reverse().find((q) => q.weightLb != null)
    if (!prev || prev.weightLb == null) return { color: GREEN, label }
    const diff = p.weightLb - prev.weightLb
    const c = diff <= 0 ? GREEN : diff <= 0.3 ? YELLOW : RED
    return { color: c, label }
  })
}

export function FactorDetail({ factorKey, nav }: { factorKey: FactorKey; nav: Nav }) {
  const { currentUser, dataVersion } = useApp()
  const userId = currentUser?.id
  const risk = useAsync(() => api.getRisk(userId!), [userId, dataVersion])
  const trends = useAsync(() => api.getTrends(userId!, 14), [userId, dataVersion])

  const factor = risk.data?.factors.find((f) => f.factor === factorKey)
  const isDriver = risk.data?.biggestDriver === factorKey
  const copy = COPY[factorKey]
  const badgeClass = factor ? statusBadgeClass(factor.status) : 'badge-neutral'
  const color = badgeClass === 'badge-green' ? 'var(--green)' : badgeClass === 'badge-yellow' ? 'var(--yellow-text)' : badgeClass === 'badge-red' ? 'var(--red)' : 'var(--ink3)'

  return (
    <div className="screen-grid">
      <button className="back-row span-2" onClick={nav.back}>
        <ChevronLeft className="icon" style={{ width: 20, height: 20 }} />
        <span style={{ fontSize: 16, fontWeight: 600 }}>{factor?.label ?? 'Factor'}</span>
      </button>

      <div className="card">
        <span className="risk-number" style={{ fontSize: 17, color }}>{factor?.status ?? '—'}</span>
        <p style={{ fontSize: 13, color: 'var(--ink2)', margin: '8px 0 0', lineHeight: 1.5 }}>
          {isDriver
            ? 'This is currently your biggest risk driver, contributing the most to your overall score.'
            : 'This is one of the signals behind your score. Here’s what it means and what helps.'}
        </p>
      </div>

      <div className="card">
        <span className="label">Last 14 days</span>
        {trends.data ? <LevelBars segments={buildSegments(factorKey, trends.data.points)} /> : <div className="muted">…</div>}
      </div>

      <div className="card">
        <span className="label">Why this matters</span>
        <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: 'var(--ink2)' }}>{copy.why}</p>
      </div>
      <div className="card">
        <span className="label">What would help</span>
        <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: 'var(--ink2)' }}>{copy.help}</p>
      </div>
      <div className="card span-2" style={{ background: 'var(--fill)', boxShadow: 'none' }}>
        <p style={{ fontSize: 12, lineHeight: 1.55, margin: 0, color: 'var(--ink2)' }}>{copy.caveat}</p>
      </div>
    </div>
  )
}
