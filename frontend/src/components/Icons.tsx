// Minimal inline-SVG icon set, ported from the prototype. Each takes standard SVG props.
import type { SVGProps } from 'react'

const base = ({ className, ...props }: SVGProps<SVGSVGElement>) => ({
  viewBox: '0 0 24 24',
  ...props,
  className: className ? `ico ${className}` : 'ico',
})

export const HomeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z" /></svg>
)
export const LogIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>
)
export const TrendsIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 19h16M7 15l3-4 3 3 5-7" /></svg>
)
export const TrainIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 12h2m14 0h2M5 12v-3m14 3v-3M5 9h4v6H5zm10 0h4v6h-4z" /></svg>
)
export const ChevronLeft = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M15 18l-6-6 6-6" /></svg>
)
export const ChevronRight = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M9 18l6-6-6-6" /></svg>
)
export const CheckCircle = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" /></svg>
)
export const ProteinIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3v18M5 8c0 4 3 6 7 6s7-2 7-6" /></svg>
)
export const DumbbellIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="2" y="10" width="4" height="4" /><rect x="18" y="10" width="4" height="4" /><path d="M6 12h12" /></svg>
)
export const ScaleIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 17l5-5 4 4 9-9" /></svg>
)
export const PersonIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
)
