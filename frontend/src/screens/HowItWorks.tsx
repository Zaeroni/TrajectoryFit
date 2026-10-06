import { ChevronLeft } from '../components/Icons'
import type { Nav } from '../nav'

export function HowItWorks({ nav }: { nav: Nav }) {
  return (
    <div className="narrow">
      <button className="back-row" onClick={nav.back}>
        <ChevronLeft className="icon" style={{ width: 20, height: 20 }} />
        <span style={{ fontSize: 16, fontWeight: 600 }}>How this works</span>
      </button>

      <div className="card">
        <span className="label">What TrajectoryFit tracks</span>
        <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: 'var(--ink2)' }}>
          TrajectoryFit estimates your risk of losing muscle while losing weight, based on three signals:
          how fast you’re losing weight, how much protein you’re getting, and how often you’re training.
          Body composition, if you log it, sharpens the estimate further.
        </p>
      </div>
      <div className="card">
        <span className="label">What it doesn’t capture</span>
        <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: 'var(--ink2)' }}>
          Total calorie intake, other macros like carbs and fat, nutrient quality, sleep, stress, or anything a
          blood panel or body scan would catch. A low risk score means you’re doing well on the things tracked
          here, not that everything about your health is fine.
        </p>
      </div>
      <div className="card">
        <span className="label">What this app is, and isn’t</span>
        <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: 'var(--ink2)' }}>
          This doesn’t replace a doctor, dietitian, or trainer. It’s built to flag a specific, common problem
          early — muscle loss during rapid weight loss — so you can catch it and talk to someone about it, not
          to manage your health on its own.
        </p>
      </div>
    </div>
  )
}
