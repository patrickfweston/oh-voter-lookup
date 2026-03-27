import type { VoterRow } from '../types'
import {
  LIKERT_SHORT,
  computePartisanLean,
  likertBarFill,
} from '../lib/partyLikelihood'

const BAR_SLOTS = 5

type PartisanLeanCellProps = { row: VoterRow }

export function PartisanLeanCell({ row }: PartisanLeanCellProps) {
  const lean = computePartisanLean(row)
  const { activeIndices, variant } = likertBarFill(lean.likert)
  const active = new Set(activeIndices)
  const aria = `${LIKERT_SHORT[lean.likert]}. Five-step scale with Democrat on the left and Republican on the right; filled blocks include the center and extend toward that side (informal estimate).`

  return (
    <td
      className="col-likert likert"
      title={lean.detailLines.join('\n')}
    >
      <div className="likert-cell-inner">
        <div className="likert-bar">
          <span className="likert-dots" role="img" aria-label={aria}>
            {Array.from({ length: BAR_SLOTS }, (_, i) => (
              <span
                key={i}
                className={
                  active.has(i)
                    ? `likert-dot likert-dot--${variant}`
                    : 'likert-dot'
                }
              />
            ))}
          </span>
          <div className="likert-axis" aria-hidden="true">
            <span>D</span>
            <span>R</span>
          </div>
        </div>
        <span className="likert-num">{lean.likert}</span>
        <span className="likert-caption">{lean.summary}</span>
      </div>
    </td>
  )
}
