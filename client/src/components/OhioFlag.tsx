import { useId } from 'react'

/**
 * Ohio state flag (guidon / burgee) — simplified geometry for small UI use.
 * Colors: red #BF0A30, white #FFF, blue #002868 per common references.
 */
export function OhioFlag({ className }: { className?: string }) {
  const clipId = useId().replace(/:/g, '')
  const starR = 2.15
  const stars = Array.from({ length: 17 }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 17
    return {
      cx: 56 + 31 * Math.cos(a),
      cy: 75 + 31 * Math.sin(a),
      key: i,
    }
  })

  return (
    <svg
      className={className}
      viewBox="0 0 260 150"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Ohio state flag"
    >
      <defs>
        <clipPath id={clipId}>
          <path d="M0 0h220l40 75-40 75H0z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect y="0" width="260" height="30" fill="#bf0a30" />
        <rect y="30" width="260" height="30" fill="#fff" />
        <rect y="60" width="260" height="30" fill="#bf0a30" />
        <rect y="90" width="260" height="30" fill="#fff" />
        <rect y="120" width="260" height="30" fill="#bf0a30" />
        {/* Hoist union (triangular blue field) */}
        <path d="M0 0 L0 150 L118 75z" fill="#002868" />
        {stars.map(({ key, cx, cy }) => (
          <circle key={key} cx={cx} cy={cy} r={starR} fill="#fff" />
        ))}
        {/* Buckeye O: white ring, red center */}
        <circle cx="56" cy="75" r="14" fill="none" stroke="#fff" strokeWidth="5" />
        <circle cx="56" cy="75" r="6.5" fill="#bf0a30" />
      </g>
    </svg>
  )
}
