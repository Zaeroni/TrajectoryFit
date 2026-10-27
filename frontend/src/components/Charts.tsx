import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TrendPoint } from '../api/types'
import { shortLabel, weekdayShort } from '../lib/dates'
import {
  WEIGHT_ON_TRACK_PCT, WEIGHT_SLIGHTLY_FAST_PCT, WEIGHT_ZONE_LABEL,
  weightZoneEdges, weightZoneFor, type WeightZone,
} from '../lib/riskThresholds'
import { useThemeColors } from '../lib/theme'

const CHART_VARS = ['--blue', '--ink2', '--ink3', '--line', '--surface', '--ink', '--green', '--yellow', '--red'] as const
const ZONE_VAR: Record<WeightZone, '--green' | '--yellow' | '--red'> = { onTrack: '--green', slightlyFast: '--yellow', tooFast: '--red' }
const ZONE_OPACITY = 0.16
const X_AXIS_HEIGHT = 18
/** Minimum horizontal distance between X labels on long ranges, and half a "Mar 30" label plus a little air. */
const MIN_LABEL_GAP_PX = 56
const LABEL_EDGE_PX = 16

/**
 * Long ranges (30D/90D): short-date tick days counted back from the latest day, so the latest day is always labelled.
 * Steps are whole weeks (7 for 30D, 14 for 90D), widened until neighbouring labels are at least MIN_LABEL_GAP_PX apart.
 * Ticks too close to the left edge are dropped. The first day gets a left-anchored label of its own when it is
 * at least MIN_LABEL_GAP_PX from the nearest tick, so a short history visibly starts on the right date.
 */
function longRangeTickDates(dates: string[], plotWidthPx: number): string[] {
  const n = dates.length
  const pxPerDay = plotWidthPx > 0 && n > 1 ? plotWidthPx / (n - 1) : 0
  let step = n > 45 ? 14 : 7
  if (pxPerDay > 0) while (step * pxPerDay < MIN_LABEL_GAP_PX) step += 7
  const out: string[] = []
  for (let i = n - 1; i >= 0; i -= step) {
    if (pxPerDay === 0 || i === 0 || i * pxPerDay >= LABEL_EDGE_PX) out.push(dates[i])
  }
  const oldestTickIndex = out.length ? dates.indexOf(out[out.length - 1]) : n
  if (pxPerDay > 0 && oldestTickIndex > 0 && oldestTickIndex * pxPerDay >= MIN_LABEL_GAP_PX) out.push(dates[0])
  return out.reverse()
}

const tooltipDate = (iso: string) => `${weekdayShort(iso)}, ${shortLabel(iso)}`

/** Evenly spaced "nice" Y ticks: half-pound steps under ~4 lb of range, otherwise whole-pound steps (1, 2, 5, 10...) with at most 6 ticks. */
function niceWeightTicks(values: number[]): { ticks: number[]; decimals: number; width: number } {
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  let step = 0.5
  if (hi - lo >= 4) {
    step = [1, 2, 5, 10, 20, 50].find((s) => Math.ceil(hi / s) - Math.floor(lo / s) <= 5) ?? 100
  }
  const first = Math.floor(lo / step) * step
  const last = Math.max(Math.ceil(hi / step) * step, first + step)
  const ticks: number[] = []
  for (let v = first; v <= last + step / 2; v += step) ticks.push(Math.round(v * 10) / 10)
  const decimals = step < 1 ? 1 : 0
  const chars = Math.max(...ticks.map((t) => t.toFixed(decimals).length))
  return { ticks, decimals, width: chars * 6 + 10 }
}

interface WeightChartProps {
  points: TrendPoint[]
  showAxes?: boolean
  showSmoothed?: boolean
  /** Shade On track / Slightly fast / Too fast zones anchored on the first weight. Only valid for the 7-day scoring window. */
  showHealthyRange?: boolean
  /** Day labels along the bottom without a weight scale (Home). Trends gets them via showAxes. */
  showXAxis?: boolean
  /** Selected range in days (Trends). Above 7, X labels are short dates and only the last point keeps its dot. */
  rangeDays?: number
  height?: number
}

/** Weight over time: a blue actual line, optionally a grey smoothed line and healthy-range zones. */
export function WeightChart({ points, showAxes = false, showSmoothed = false, showHealthyRange = false, showXAxis = false, rangeDays = 7, height = 100 }: WeightChartProps) {
  const data = points.map((p) => ({
    label: weekdayShort(p.date),
    date: p.date,
    weight: p.weightLb,
    smoothed: p.weightSmoothedLb,
  }))
  const c = useThemeColors(CHART_VARS)
  const [containerWidth, setContainerWidth] = useState(0)
  const logged = data.filter((d) => d.weight != null)

  if (logged.length === 0) {
    return <div className="muted" style={{ padding: '28px 0', textAlign: 'center' }}>No weight logged in this range</div>
  }

  // The backend needs two weights to compute a rate, so there is no verdict (and no band) before that.
  const zones = showHealthyRange && logged.length >= 2
    ? (() => {
        const start = logged[0].weight as number
        const last = logged[logged.length - 1]
        const edges = weightZoneEdges(start)
        const lows = logged.map((d) => d.weight as number)
        return {
          ...edges,
          start,
          lastIndex: data.indexOf(last),
          lastZone: weightZoneFor(start, last.weight as number),
          min: Math.min(...lows, edges.slightlyFastLb) - 1,
          max: Math.max(...lows, start) + 1,
        }
      })()
    : null

  const yAxis = showAxes && !zones
    ? niceWeightTicks([...logged.map((d) => d.weight as number), ...(showSmoothed ? data.flatMap((d) => (d.smoothed != null ? [d.smoothed] : [])) : [])])
    : null

  const xLabels = showAxes || showXAxis
  const longRange = rangeDays > 7
  const lastLoggedIndex = data.indexOf(logged[logged.length - 1])
  const plotWidth = containerWidth - (showAxes ? 0 : 6) - 6 - (yAxis?.width ?? 0)
  const xTicks = xLabels && longRange ? longRangeTickDates(data.map((d) => d.date), plotWidth) : undefined
  const firstKey = longRange ? data[0].date : data[0].label
  const lastKey = longRange ? data[data.length - 1].date : data[data.length - 1].label

  // Edge labels hug the plot edge instead of straddling it, so they are never clipped.
  const renderXTick = (props: { x?: number; y?: number; payload?: { value: string } }) => {
    const { x, y, payload } = props
    if (x == null || y == null || !payload) return <g />
    const value = payload.value
    const anchor = value === firstKey ? 'start' : value === lastKey ? 'end' : 'middle'
    return (
      <text x={x} y={y} dy="0.71em" textAnchor={anchor} fontSize={10} fill={c['--ink2']}>
        {longRange ? shortLabel(value) : value}
      </text>
    )
  }

  // Long ranges are too dense for a dot per day: keep only the latest weight.
  const renderLastDot = (props: { cx?: number; cy?: number; index?: number }) => {
    const { cx, cy, index } = props
    if (cx == null || cy == null || index !== lastLoggedIndex) return <g key={`d${index}`} />
    return <circle key={`d${index}`} cx={cx} cy={cy} r={3.5} fill={c['--blue']} />
  }

  const renderDot = (props: { cx?: number; cy?: number; index?: number }) => {
    const { cx, cy, index } = props
    if (cx == null || cy == null) return <g key={`d${index}`} />
    if (zones && index === zones.lastIndex) {
      const color = c[ZONE_VAR[zones.lastZone]]
      const labelY = cy > 22 ? cy - 10 : cy + 18
      return (
        <g key={`d${index}`}>
          <circle cx={cx} cy={cy} r={5} fill={color} stroke={c['--surface']} strokeWidth={2} />
          <text x={cx + 2} y={labelY} textAnchor="end" fontSize={11} fontWeight={600} fill={c['--ink']}
            stroke={c['--surface']} strokeWidth={3} strokeLinejoin="round" paintOrder="stroke">
            {WEIGHT_ZONE_LABEL[zones.lastZone]}
          </text>
        </g>
      )
    }
    return <circle key={`d${index}`} cx={cx} cy={cy} r={2} fill={c['--blue']} />
  }

  return (
    <>
      <div style={{ position: 'relative', height: showXAxis && !showAxes ? height + X_AXIS_HEIGHT : height }}>
        <ResponsiveContainer width="100%" height="100%" onResize={(w) => setContainerWidth(w)}>
          <LineChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: showAxes ? 0 : 6 }}>
            {showAxes && <CartesianGrid stroke={c['--line']} vertical={false} />}
            <XAxis
              dataKey={longRange ? 'date' : 'label'}
              hide={!xLabels}
              ticks={xTicks}
              interval={0}
              height={showAxes ? 30 : X_AXIS_HEIGHT}
              tick={renderXTick}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              hide={!showAxes}
              domain={zones ? [zones.min, zones.max] : yAxis ? [yAxis.ticks[0], yAxis.ticks[yAxis.ticks.length - 1]] : ['dataMin - 1', 'dataMax + 1']}
              ticks={yAxis?.ticks}
              tickFormatter={yAxis ? (v: number) => v.toFixed(yAxis.decimals) : undefined}
              tick={{ fill: c['--ink2'], fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={yAxis?.width ?? 34}
            />
            {zones && (
              <>
                <ReferenceArea y1={zones.onTrackLb} y2={zones.max} fill={c['--green']} fillOpacity={ZONE_OPACITY} stroke="none" />
                <ReferenceArea y1={zones.slightlyFastLb} y2={zones.onTrackLb} fill={c['--yellow']} fillOpacity={ZONE_OPACITY} stroke="none" />
                <ReferenceArea y1={zones.min} y2={zones.slightlyFastLb} fill={c['--red']} fillOpacity={ZONE_OPACITY} stroke="none" />
              </>
            )}
            {showAxes && <Tooltip formatter={(v: number) => `${v} lb`} labelFormatter={(_, items) => { const iso = items?.[0]?.payload?.date; return iso ? tooltipDate(iso) : '' }} contentStyle={{ background: c['--surface'], border: `1px solid ${c['--line']}`, borderRadius: 10 }} labelStyle={{ color: c['--ink2'] }} itemStyle={{ color: c['--ink'] }} />}
            {showSmoothed && (
              <Line type="monotone" dataKey="smoothed" stroke={c['--ink3']} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
            )}
            <Line type="monotone" dataKey="weight" stroke={c['--blue']} strokeWidth={2} dot={zones ? renderDot : longRange ? renderLastDot : { r: 2 }} connectNulls isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {showAxes && logged.length === 1 && (
        <p className="muted" style={{ margin: 'var(--space-2) 0 0' }}>Log a second weight to see your trend.</p>
      )}
      {showHealthyRange && (zones ? <HealthyRangeLegend colors={c} /> : (
        <p className="muted" style={{ margin: 'var(--space-2) 0 0' }}>Log a second weight to see your healthy range.</p>
      ))}
    </>
  )
}

function HealthyRangeLegend({ colors }: { colors: Record<string, string> }) {
  const items: { zone: WeightZone; text: string }[] = [
    { zone: 'onTrack', text: `up to ${WEIGHT_ON_TRACK_PCT.toFixed(1)}%` },
    { zone: 'slightlyFast', text: `${WEIGHT_ON_TRACK_PCT.toFixed(1)}\u2013${WEIGHT_SLIGHTLY_FAST_PCT.toFixed(1)}%` },
    { zone: 'tooFast', text: `over ${WEIGHT_SLIGHTLY_FAST_PCT.toFixed(1)}%` },
  ]
  return (
    <div style={{ marginTop: 'var(--space-2)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)', marginBottom: 'var(--space-1)' }}>Weight loss this week</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1) var(--space-3)' }}>
        {items.map(({ zone, text }) => (
          <span key={zone} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 11, color: 'var(--ink2)' }}>
            <span style={{
              width: 10, height: 10, borderRadius: 2, display: 'inline-block', boxSizing: 'border-box',
              background: colors[ZONE_VAR[zone]], border: `1px solid ${colors[ZONE_VAR[zone]]}`,
            }} />
            {WEIGHT_ZONE_LABEL[zone]} · {text}
          </span>
        ))}
      </div>
    </div>
  )
}

interface LevelBarsProps {
  /** One entry per day: a fill color and a short label. */
  segments: { color: string; label: string }[]
}

/** A row of equal-height colored bars — used for protein/training level history. */
export function LevelBars({ segments }: LevelBarsProps) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 90 }}>
      {segments.map((s, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ width: '100%', height: 56, background: s.color, borderRadius: 3 }} />
          <span style={{ fontSize: 9, color: 'var(--ink3)' }}>{s.label}</span>
        </div>
      ))}
    </div>
  )
}
