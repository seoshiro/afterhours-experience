import { useId } from 'react'

type ArtworkProps = {
  variant?: 'signal' | 'fracture' | 'afterimage' | 'hero'
  className?: string
}

/** Original vector studies, drawn in code for AFTERHOURS. No raster or WebGL dependency. */
export default function Artwork({ variant = 'hero', className = '' }: ArtworkProps) {
  const id = useId().replace(/:/g, '')

  if (variant === 'fracture') {
    return (
      <svg className={`artwork artwork-fracture ${className}`} viewBox="0 0 600 600" aria-hidden="true" focusable="false">
        <defs><clipPath id={`${id}-cut`}><circle cx="300" cy="300" r="255" /></clipPath></defs>
        <g clipPath={`url(#${id}-cut)`}>
          <circle cx="300" cy="300" r="255" fill="var(--ink)" />
          {Array.from({ length: 28 }, (_, i) => <path key={i} d={`M${i * 28 - 300} 0 ${i * 28 + 160} 600`} stroke="var(--coral)" strokeWidth={9 + (i % 3) * 2} />)}
          <path d="M0 328 600 212 600 267 0 383Z" fill="var(--blue)" />
          <path d="M0 392 600 276 600 297 0 413Z" fill="var(--paper)" />
          <path d="M0 183 600 380 600 410 0 213Z" fill="var(--lime)" />
        </g>
        <circle cx="300" cy="300" r="276" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M18 300h29m506 0h29M300 18v29m0 506v29" fill="none" stroke="currentColor" />
      </svg>
    )
  }

  if (variant === 'afterimage') {
    return (
      <svg className={`artwork artwork-afterimage ${className}`} viewBox="0 0 600 600" aria-hidden="true" focusable="false">
        <circle cx="300" cy="300" r="253" fill="var(--lime)" />
        <g transform="rotate(-32 300 300)" fill="none" stroke="var(--blue)">
          {Array.from({ length: 25 }, (_, i) => <ellipse key={i} cx="300" cy="300" rx={32 + i * 9.2} ry="251" strokeWidth="2.8" />)}
        </g>
        <circle cx="300" cy="300" r="49" fill="var(--coral)" />
        <circle cx="300" cy="300" r="8" fill="var(--ink)" />
        <path d="M23 300h31m492 0h31M300 23v31m0 492v31" fill="none" stroke="currentColor" />
      </svg>
    )
  }

  if (variant === 'signal') {
    return (
      <svg className={`artwork artwork-signal ${className}`} viewBox="0 0 600 600" aria-hidden="true" focusable="false">
        <defs><clipPath id={`${id}-disc`}><circle cx="300" cy="300" r="254" /></clipPath></defs>
        <circle cx="300" cy="300" r="254" fill="var(--blue)" />
        <g clipPath={`url(#${id}-disc)`} fill="none" stroke="var(--lime)" strokeWidth="2.6">
          {Array.from({ length: 31 }, (_, i) => <circle key={i} cx="206" cy="300" r={23 + i * 13} />)}
          {Array.from({ length: 31 }, (_, i) => <circle key={i} cx="394" cy="300" r={23 + i * 13} />)}
        </g>
        <circle cx="300" cy="300" r="35" fill="var(--coral)" />
        <path d="M23 300h31m492 0h31M300 23v31m0 492v31" fill="none" stroke="currentColor" />
      </svg>
    )
  }

  return (
    <svg className={`artwork artwork-hero ${className}`} viewBox="0 0 800 800" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={`${id}-iris`}><circle cx="400" cy="400" r="328" /></clipPath>
      </defs>
      <circle cx="400" cy="400" r="354" fill="none" stroke="var(--ink)" strokeWidth="1" />
      <circle cx="400" cy="400" r="328" fill="var(--ink)" />
      <g clipPath={`url(#${id}-iris)`} className="iris-lines" stroke="var(--lime)" fill="none">
        {Array.from({ length: 92 }, (_, i) => {
          const angle = i * (360 / 92)
          return <path key={i} d="M400 400C630 357 485 176 400 60" strokeWidth="2.3" transform={`rotate(${angle} 400 400)`} />
        })}
      </g>
      <circle cx="400" cy="400" r="127" fill="var(--blue)" />
      <circle cx="400" cy="400" r="76" fill="var(--coral)" />
      <circle cx="400" cy="400" r="11" fill="var(--ink)" />
      <circle cx="400" cy="400" r="145" fill="none" stroke="var(--lime)" strokeWidth="2" />
      <path d="M20 400h36m688 0h36M400 20v36m0 688v36" fill="none" stroke="var(--ink)" />
      <path d="m132 132 18 18m500 500 18 18M132 668l18-18m500-500 18-18" stroke="var(--ink)" />
      <g fill="var(--ink)" fontFamily="monospace" fontSize="11" letterSpacing="1.5">
        <text x="409" y="38">00:00</text>
        <text x="409" y="772">04:00</text>
        <text x="23" y="423">90°</text>
        <text x="745" y="423">270°</text>
      </g>
    </svg>
  )
}
