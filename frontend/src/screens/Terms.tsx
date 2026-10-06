import { ChevronLeft } from '../components/Icons'
import type { Nav } from '../nav'

const SECTIONS: [string, string][] = [
  ['Not medical advice',
    'TrajectoryFit provides general wellness information based on data you log. It is not medical advice, diagnosis, or treatment, and is not a substitute for care from a licensed physician, dietitian, or other qualified provider. Always talk to a healthcare professional before making changes related to a GLP-1 medication or any health condition.'],
  ['Accuracy of information',
    'Risk scores and trends are estimates based on self-reported data and general population thresholds. They may not reflect your individual circumstances and can be inaccurate or incomplete. See “How this works” for details on what is and isn’t captured.'],
  ['Your data',
    'Information you log is used to generate your personal trends and risk score. This is a portfolio demo that runs on synthetic data only; do not enter real health information.'],
  ['Limitation of liability',
    'TrajectoryFit and its creators are not liable for decisions made based on information in this app. Use of this app is at your own discretion and risk.'],
  ['Changes to these terms',
    'These terms may be updated from time to time. Continued use of the app after changes means you accept the revised terms.'],
]

export function Terms({ nav }: { nav: Nav }) {
  return (
    <div className="narrow">
      <button className="back-row" onClick={nav.back}>
        <ChevronLeft className="icon" style={{ width: 20, height: 20 }} />
        <span style={{ fontSize: 16, fontWeight: 600 }}>Terms of service</span>
      </button>
      {SECTIONS.map(([title, body]) => (
        <div className="card" key={title}>
          <span className="label">{title}</span>
          <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: 'var(--ink2)' }}>{body}</p>
        </div>
      ))}
      <p style={{ fontSize: 11, color: 'var(--ink3)', textAlign: 'center', margin: '8px 0 0' }}>
        Placeholder text for a portfolio demo. Have this reviewed by a lawyer before shipping.
      </p>
    </div>
  )
}
