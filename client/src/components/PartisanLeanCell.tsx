import { useId } from 'react'
import type { VoterRow } from '../types'
import {
  LIKERT_SHORT,
  computePartisanLean,
  likertBarFill,
  likertNeedleRotateDeg,
} from '../lib/partyLikelihood'

const CX = 36
const CY = 38
const R = 27
/** Upper semicircle: sweep 0 draws the arc through (CX, CY − R). */
const ARC_PATH = `M ${CX - R} ${CY} A ${R} ${R} 0 0 0 ${CX + R} ${CY}`
const NEEDLE_TOP = CY - R

type PartisanLeanCellProps = { row: VoterRow }

export function PartisanLeanCell({ row }: PartisanLeanCellProps) {
  const gradientId = useId().replace(/:/g, '')
  const lean = computePartisanLean(row)
  const deg = likertNeedleRotateDeg(lean.likert)
  const { variant } = likertBarFill(lean.likert)
  const aria = `${LIKERT_SHORT[lean.likert]}. Gauge-style readout: Democrat on the left, Republican on the right; needle tilts toward that side (informal estimate).`

  return (
    <td
      className="col-likert likert"
      title={lean.detailLines.join('\n')}
    >
      <div className="likert-cell-inner">
        <div className="likert-gauge">
          <svg
            className="likert-gauge-svg"
            viewBox="0 0 72 44"
            role="img"
            aria-label={aria}
          >
            <defs>
              <linearGradient
                id={gradientId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="rgba(37, 99, 235, 0.35)" />
                <stop offset="50%" stopColor="rgba(156, 163, 175, 0.25)" />
                <stop offset="100%" stopColor="rgba(185, 28, 28, 0.35)" />
              </linearGradient>
            </defs>
            {/* Upper arc (gas-gauge dial); quadratic matches needle pivot geometry */}
            <path className="gauge-arc-bg" d={ARC_PATH} fill="none" />
            <path
              className="gauge-arc-tint"
              d={ARC_PATH}
              fill="none"
              stroke={`url(#${gradientId})`}
            />
            <g transform={`rotate(${deg} ${CX} ${CY})`}>
              <line
                className={`gauge-needle gauge-needle--${variant}`}
                x1={CX}
                y1={CY}
                x2={CX}
                y2={NEEDLE_TOP}
              />
            </g>
            <circle className="gauge-pivot-ring" cx={CX} cy={CY} r={5} />
            <circle className="gauge-pivot" cx={CX} cy={CY} r={3.2} />
          </svg>
          <div className="likert-axis" aria-hidden="true">
            <span>D</span>
            <span>R</span>
          </div>
        </div>
      </div>
    </td>
  )
}
