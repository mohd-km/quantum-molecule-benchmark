import React from 'react';
import {
  CHEMICAL_ACCURACY_MHA,
  EvaluatedPoint,
  HA_TO_KCAL_MOL,
  MoleculeSpec,
} from '../data/molecules';

interface NoiseErrorChartProps {
  spec: MoleculeSpec;
  points: EvaluatedPoint[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
}

export const NoiseErrorChart: React.FC<NoiseErrorChartProps> = ({
  spec,
  points,
  selectedIndex,
  onSelectIndex,
}) => {
  const width = 760;
  const height = 270;
  const pad = { top: 24, right: 24, bottom: 46, left: 70 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const [xMin, xMax] = spec.xDomain;
  const logMin = Math.log10(0.01);
  const logMax = Math.log10(600);

  const clampErr = (val: number) => Math.max(0.01, Math.min(600, val));
  const xScale = (r: number) => pad.left + ((r - xMin) / (xMax - xMin)) * plotW;
  const yScale = (mha: number) => {
    const lv = Math.log10(clampErr(mha));
    return pad.top + plotH - ((lv - logMin) / (logMax - logMin)) * plotH;
  };

  const buildPath = (accessor: (p: EvaluatedPoint) => number) =>
    points
      .map(
        (p, i) =>
          `${i === 0 ? 'M' : 'L'} ${xScale(p.r).toFixed(2)} ${yScale(accessor(p)).toFixed(2)}`
      )
      .join(' ');

  const chemAccY = yScale(CHEMICAL_ACCURACY_MHA);
  const yTicks = [0.01, 0.1, 1.6, 10, 100, 500];
  const selected = points[selectedIndex] ?? points[0];

  const errorRatio = selected.vqeNoisyErrorMHa / CHEMICAL_ACCURACY_MHA;
  const kcalError = (selected.vqeNoisyErrorMHa / 1000) * HA_TO_KCAL_MOL;

  return (
    <div className="chart-frame">
      <div className="chart-header">
        <div>
          <h2 className="card-title">
            How far each method misses the exact answer
          </h2>
          <p className="card-subtitle">
            Miss in mHa (milli-Hartree), |E - E_FCI|, on a log scale. Below the 1.6 mHa line is chemical accuracy: good enough to predict real reactions.
          </p>
        </div>
        <div className={`status-pill ${selected.beatsChemicalAccuracy ? 'pill-pass' : 'pill-fail'}`}>
          {selected.beatsChemicalAccuracy
            ? `PASS · R=${selected.r.toFixed(2)} Å (${selected.vqeNoisyErrorMHa.toFixed(2)} mHa)`
            : `FAIL · R=${selected.r.toFixed(2)} Å (${errorRatio.toFixed(1)}x the goal)`}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="svg-chart"
        role="img"
        aria-label="Logarithmic energy error comparison against the 1.6 mHa chemical accuracy threshold"
      >
        {/* Chemically accurate green zone */}
        <rect
          x={pad.left}
          y={chemAccY}
          width={plotW}
          height={pad.top + plotH - chemAccY}
          fill="#15803d"
          fillOpacity="0.08"
        />

        {/* Y gridlines */}
        {yTicks.map((tick) => {
          const y = yScale(tick);
          const isThreshold = tick === CHEMICAL_ACCURACY_MHA;
          return (
            <g key={tick}>
              <line
                x1={pad.left}
                y1={y}
                x2={width - pad.right}
                y2={y}
                stroke={isThreshold ? '#15803d' : '#e5e5e3'}
                strokeWidth={isThreshold ? '1.8' : '1'}
                strokeDasharray={isThreshold ? '6 4' : undefined}
              />
              <text
                x={pad.left - 10}
                y={y + 4}
                textAnchor="end"
                fill={isThreshold ? '#15803d' : '#555555'}
                fontSize="11.5"
                fontWeight={isThreshold ? '600' : '400'}
                fontFamily="var(--font-mono)"
              >
                {tick === 1.6 ? '1.6' : tick}
              </text>
            </g>
          );
        })}

        {/* Threshold callout */}
        <text
          x={width - pad.right - 6}
          y={chemAccY - 7}
          textAnchor="end"
          fill="#15803d"
          fontSize="11"
          fontWeight="600"
          fontFamily="var(--font-mono)"
        >
          Chemical Accuracy Limit: 1.6 mHa (1.0 kcal/mol)
        </text>

        {/* Curves */}
        <path
          d={buildPath((p) => p.rhfErrorMHa)}
          fill="none"
          stroke="#b45309"
          strokeWidth="2.1"
          strokeDasharray="6 4"
        />
        <path
          d={buildPath((p) => p.vqeNoiselessErrorMHa)}
          fill="none"
          stroke="#15803d"
          strokeWidth="2"
          strokeDasharray="2 4"
        />
        <path
          d={buildPath((p) => p.vqeNoisyErrorMHa)}
          fill="none"
          stroke="#b91c1c"
          strokeWidth="2.5"
        />

        {/* Selected vertical line and error bar */}
        <line
          x1={xScale(selected.r)}
          y1={pad.top}
          x2={xScale(selected.r)}
          y2={height - pad.bottom}
          stroke="#111111"
          strokeOpacity="0.22"
          strokeWidth="1.2"
        />
        <circle
          cx={xScale(selected.r)}
          cy={yScale(selected.vqeNoisyErrorMHa)}
          r="5"
          fill="#b91c1c"
          stroke="#ffffff"
          strokeWidth="1.5"
        />
        <circle
          cx={xScale(selected.r)}
          cy={yScale(selected.rhfErrorMHa)}
          r="4.2"
          fill="#b45309"
          stroke="#ffffff"
          strokeWidth="1.5"
        />

        {/* Hit zones */}
        {points.map((pt, idx) => (
          <rect
            key={pt.r}
            x={xScale(pt.r) - plotW / (points.length * 2)}
            y={pad.top}
            width={plotW / points.length}
            height={plotH}
            fill="transparent"
            style={{ cursor: 'pointer' }}
            onClick={() => onSelectIndex(idx)}
            onMouseEnter={() => onSelectIndex(idx)}
          />
        ))}

        {/* X axis ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const val = xMin + (xMax - xMin) * frac;
          return (
            <text
              key={frac}
              x={xScale(val)}
              y={height - pad.bottom + 18}
              textAnchor="middle"
              fill="#555555"
              fontSize="11.5"
              fontFamily="var(--font-mono)"
            >
              {val.toFixed(2)}
            </text>
          );
        })}

        <text
          x={pad.left + plotW / 2}
          y={height - 8}
          textAnchor="middle"
          fill="#111111"
          fontSize="12"
          fontWeight="600"
        >
          Bond Length R (Angstroms)
        </text>
        <text
          x={18}
          y={pad.top + plotH / 2}
          textAnchor="middle"
          fill="#111111"
          fontSize="12"
          fontWeight="600"
          transform={`rotate(-90 18 ${pad.top + plotH / 2})`}
        >
          Miss |ΔE| (mHa, log scale)
        </text>
      </svg>

      {/* Chemical Accuracy Error Bar Meter at Selected R */}
      <div className="error-bar-box">
        <div className="error-bar-meta">
          <span>
            Noisy chip's miss at R = {selected.r.toFixed(2)} Å:{' '}
            <strong>{selected.vqeNoisyErrorMHa.toFixed(2)} mHa</strong> ({kcalError.toFixed(2)} kcal/mol)
          </span>
          <span>
            Quick classical estimate (Hartree-Fock): <strong>{selected.rhfErrorMHa.toFixed(2)} mHa</strong>
          </span>
        </div>
        <div className="error-meter-track" aria-hidden="true">
          <div
            className={`error-meter-fill ${selected.beatsChemicalAccuracy ? 'fill-pass' : 'fill-fail'}`}
            style={{
              width: `${Math.min(100, ((Math.log10(clampErr(selected.vqeNoisyErrorMHa)) - logMin) / (logMax - logMin)) * 100)}%`,
            }}
          />
          <div
            className="error-meter-threshold"
            style={{
              left: `${((Math.log10(CHEMICAL_ACCURACY_MHA) - logMin) / (logMax - logMin)) * 100}%`,
            }}
            title="1.6 mHa Chemical Accuracy Threshold"
          />
        </div>
        <div className="error-meter-labels">
          <span>0.01 mHa</span>
          <span className="threshold-label">1.6 mHa goal</span>
          <span>600 mHa</span>
        </div>
      </div>
    </div>
  );
};
