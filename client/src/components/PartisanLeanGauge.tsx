import GaugeComponent from 'react-gauge-component'
import type { VoterRow } from '../types'
import {
  LIKERT_SHORT,
  computePartisanLean,
  likertBarFill,
} from '../lib/partyLikelihood'
import type { LikertBarFillVariant } from '../lib/partyLikelihood'

const NEEDLE_BY_VARIANT: Record<LikertBarFillVariant, string> = {
  'd-strong': '#1e40af',
  'd-lean': '#3b82f6',
  neutral: '#4b5563',
  'r-lean': '#ef4444',
  'r-strong': '#b91c1c',
}

function gaugeValueFromLikert(likert: 1 | 2 | 3 | 4 | 5): number {
  return 6 - likert
}

type PartisanLeanGaugeProps = { row: VoterRow }

/** Partisan lean semicircle gauge (for expanded voter detail). */
export function PartisanLeanGauge({ row }: PartisanLeanGaugeProps) {
  const lean = computePartisanLean(row)
  const { variant } = likertBarFill(lean.likert)
  const aria = `${LIKERT_SHORT[lean.likert]}. Gauge readout: Democrat on the left, Republican on the right (informal estimate).`

  return (
    <div
      className="partisan-lean-gauge"
      title={lean.detailLines.join('\n')}
    >
      <div
        className="likert-gauge-wrap"
        role="img"
        aria-label={aria}
      >
        <GaugeComponent
          className="partisan-gauge"
          type="semicircle"
          marginInPercent={{
            top: 0.06,
            bottom: 0,
            left: 0.06,
            right: 0.06,
          }}
          minValue={1}
          maxValue={5}
          value={gaugeValueFromLikert(lean.likert)}
          arc={{
            gradient: false,
            subArcs: [{ color: '#e5e7eb' }],
            width: 0.14,
            padding: 0.008,
          }}
          labels={{
            valueLabel: { hide: true },
            tickLabels: {
              hideMinMax: true,
              ticks: [],
            },
          }}
          pointer={{
            type: 'needle',
            color: NEEDLE_BY_VARIANT[variant],
            baseColor: '#ffffff',
            length: 0.72,
            width: 28,
            animate: true,
            elastic: false,
            animationDuration: 500,
            animationDelay: 0,
            strokeWidth: 1.1,
            strokeColor: 'rgba(255,255,255,0.9)',
          }}
        />
        <div className="likert-axis" aria-hidden="true">
          <span>D</span>
          <span>R</span>
        </div>
      </div>
    </div>
  )
}
