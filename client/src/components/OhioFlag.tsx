import { useId } from 'react'

type OhioFlagProps = { className?: string }

/**
 * Ohio state flag — source geometry from public-domain SVG (burgee, stars, Buckeye O).
 */
export function OhioFlag({ className }: OhioFlagProps) {
  const raw = useId().replace(/:/g, '')
  const id = (n: string) => `${raw}-${n}`
  const href = (n: string) => `#${raw}-${n}`

  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="520"
      height="320"
      viewBox="0 0 26 16"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Ohio state flag"
    >
      <defs>
        <g id={id('s')} fill="#fff" transform="translate(3.944272,0) scale(0.625)">
          <g id={id('f')}>
            <g id={id('t')}>
              <path
                id={id('o')}
                d="M1,0H0V0.5z"
                transform="rotate(18,1,0)"
              />
              <use href={href('o')} transform="scale(1,-1)" />
            </g>
            <use href={href('t')} transform="rotate(72)" />
          </g>
          <use href={href('t')} transform="rotate(-72)" />
          <use href={href('f')} transform="rotate(144)" />
        </g>
        <clipPath id={id('c')}>
          <path d="M0,16V0L26,3 20,8 26,13z" />
        </clipPath>
      </defs>
      <g fill="#fff" stroke="#bf0a30" clipPath={`url(${href('c')})`}>
        <path d="M26,3 0,0V16L26,13" strokeWidth="4" />
        <path d="M0,8H26" strokeWidth="2" />
      </g>
      <path d="M0,0V16L16,8z" fill="#00205B" />
      <g transform="translate(4.944272,8)">
        <circle r="3" fill="#fff" />
        <circle r="2" fill="#bf0a30" />
        <use href={href('s')} x={4} />
        <g id={id('s3')}>
          <use href={href('s')} />
          <use href={href('s')} x={2} transform="rotate(-9.650225)" />
          <use href={href('s')} x={2} transform="rotate(9.650225)" />
        </g>
        <g id={id('s6')}>
          <use href={href('s')} transform="rotate(63.434949)" />
          <use href={href('s')} transform="rotate(92.576212)" />
          <use href={href('s3')} transform="rotate(121.717474)" />
          <use href={href('s')} transform="rotate(150.858737)" />
        </g>
        <use href={href('s')} transform="rotate(180)" />
        <use href={href('s6')} transform="scale(1,-1)" />
      </g>
    </svg>
  )
}
