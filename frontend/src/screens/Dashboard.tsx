import { api } from '../api/client'
import type { FactorDto } from '../api/types'
import { CheckCircle, ChevronRight, DumbbellIcon, ProteinIcon, ScaleIcon } from '../components/Icons'
import { WeightChart } from '../components/Charts'
import { bandColorVar, statusBadgeClass } from '../lib/colors'
import { useAsync } from '../lib/useAsync'
import { useIsDesktop } from '../lib/useMediaQuery'
import { useApp } from '../state/AppContext'
import type { FactorKey, Nav } from '../nav'

const MED_LABEL: Record<string, string> = {
  semaglutide: 'On semaglutide',
  tirzepatide: 'On tirzepatide',
  other: 'On a GLP-1 medication',
  none: 'Not yet on a GLP-1',
}

function greeting(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

const FACTOR_ICON = {
  weight: CheckCircle,
  protein: ProteinIcon,
  training: DumbbellIcon,
} as const

export function Dashboard({ nav }: { nav: Nav }) {
  const { currentUser, dataVersion } = useApp()
  const userId = currentUser?.id

  const isDesktop = useIsDesktop()
  const risk = useAsync(() => api.getRisk(userId!), [userId, dataVersion])
  const trends = useAsync(() => api.getTrends(userId!, 7), [userId, dataVersion])

  if (!currentUser) return <div className="center-note">Pick a user to begin.</div>
  if (risk.loading && !risk.data) return <div className="spinner" />
  if (risk.error) return <div className="center-note">Couldn’t load risk: {risk.error}</div>

  const r = risk.data!
  const firstName = currentUser.name.split(' ')[0]
  const color = `var(${bandColorVar(r.band)})`
  const bodyComp = r.factors.find((f) => f.factor === 'body_comp')
  const clickable: FactorKey[] = ['weight', 'protein', 'training']

  return (
    <div className="screen-grid">
      {r.sustainedRisk && (
        <div className="banner banner-red span-2"><p>{r.sustainedRiskNote}</p></div>
      )}

      <div className="span-2">
        <p style={{ fontSize: 13, color: 'var(--ink2)', margin: '8px 2px 2px' }}>{greeting()}, {firstName}</p>
        <p style={{ fontSize: 12, color: 'var(--ink3)', margin: '0 2px 2px' }}>{MED_LABEL[currentUser.medication] ?? ''}</p>
      </div>

      {/* Risk card */}
      <div className="card">
        <span className="label" style={{ marginBottom: 8 }}>Current risk</span>
        {r.hasData ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span className="risk-number" style={{ color }}>{r.band}</span>
              <span style={{ fontSize: 13, color: 'var(--ink3)' }}>score {r.score} / 100</span>
            </div>
            <div style={{ height: 7, borderRadius: 4, background: `var(${bandColorVar(r.band)}-tint)`, overflow: 'hidden', marginTop: 12 }}>
              <div style={{ height: '100%', width: `${r.score}%`, background: color }} />
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink2)', margin: '10px 0 0' }}>{r.summary}</p>
          </>
        ) : (
          <>
            <span className="risk-number" style={{ color: 'var(--ink3)' }}>No data yet</span>
            <p style={{ fontSize: 13, color: 'var(--ink2)', margin: '10px 0 0' }}>Log a few days to see your score.</p>
          </>
        )}
      </div>

      {/* Contributing factors */}
      <div className="card">
        <span className="label">Contributing factors</span>
        {clickable.map((key) => {
          const f = r.factors.find((x) => x.factor === key)!
          const Icon = FACTOR_ICON[key]
          const badgeClass = statusBadgeClass(f.status)
          const tint = badgeClass === 'badge-green' ? '--green' : badgeClass === 'badge-yellow' ? '--yellow' : badgeClass === 'badge-red' ? '--red' : '--ink3'
          return (
            <button key={key} className="factor-row" onClick={() => nav.openFactor(key)}>
              <div className="icon-square" style={{ background: `var(${tint}-tint, var(--page))` }}>
                <Icon className="icon" style={{ width: 16, height: 16, color: `var(${tint})` }} />
              </div>
              <span style={{ fontSize: 14, flex: 1 }}>{f.label}</span>
              <span className={`badge ${badgeClass}`}>{f.status}</span>
              <ChevronRight className="icon" style={{ width: 14, height: 14, color: 'var(--ink3)' }} />
            </button>
          )
        })}
        <BodyCompRow factor={bodyComp} />
      </div>

      {/* Weight trajectory */}
      <div className="card span-2">
        <span className="label">Weight trajectory, this week</span>
        {trends.data
          ? <WeightChart points={trends.data.points} height={isDesktop ? 200 : 100} />
          : <div className="muted" style={{ padding: '20px 0', textAlign: 'center' }}>…</div>}
      </div>

      <div className="row3 span-2">
        <button className="btn" onClick={() => nav.go('log')}>Weight</button>
        <button className="btn" onClick={() => nav.go('log')}>Protein</button>
        <button className="btn" onClick={() => nav.go('train')}>Trained</button>
      </div>

      <button className="btn-link span-2" onClick={() => nav.go('howitworks')}>How this works</button>
    </div>
  )
}

function BodyCompRow({ factor }: { factor?: FactorDto }) {
  const status = factor?.status ?? 'Not logged'
  const isReading = status !== 'Not logged' && status !== 'Baseline'
  const tint = status === 'Lean mass holding' ? '--green'
    : status === 'Losing lean mass' ? '--red'
    : status === 'Slight lean mass dip' ? '--yellow' : '--ink3'
  return (
    <div className="factor-row" style={{ cursor: 'default' }}>
      <div className="icon-square" style={{ background: isReading ? `var(${tint}-tint)` : 'var(--page)' }}>
        <ScaleIcon className="icon" style={{ width: 16, height: 16, color: `var(${tint})` }} />
      </div>
      <span style={{ fontSize: 14, flex: 1, color: 'var(--ink2)' }}>Body comp trend</span>
      <span style={{ fontSize: 12, color: isReading ? `var(${tint})` : 'var(--ink3)' }}>{status}</span>
    </div>
  )
}
