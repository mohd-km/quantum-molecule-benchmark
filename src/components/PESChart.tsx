import React from 'react';
import { EvaluatedPoint, MoleculeSpec } from '../data/molecules';

interface PESChartProps {
  spec: MoleculeSpec;
  points: EvaluatedPoint[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
}

export const PESChart: React.FC<PESChartProps> = ({
  spec,
  points,
  selectedIndex,
  onSelectIndex,
}) => {
  const width = 760;
  const height = 385;
  const pad = { top: 24, right: 24, bottom: 50, left: 70 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const [xMin, xMax] = spec.xDomain;
  const allY = points.flatMap((p) => [p.fci, p.rhf, p.vqeNoiseless, p.vqeNoisy]);
  const dataMinY = Math.min(spec.yDomain[0], ...allY);
  const dataMaxY = Math.max(spec.yDomain[1], ...allY);
  const ySpan = Math.max(0.08, dataMaxY - dataMinY);
  const yMin = dataMinY - ySpan * 0.06;
  const yMax = dataMaxY + ySpan * 0.08;

  const xScale = (r: number) => pad.left + ((r - xMin) / (xMax - xMin)) * plotW;
  const yScale = (e: number) =>
    pad.top + plotH - ((e - yMin) / (yMax - yMin)) * plotH;

  const buildPath = (accessor: (p: EvaluatedPoint) => number) =>
    points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.r).toFixed(2)} ${yScale(accessor(p)).toFixed(2)}`)
      .join(' ');

  const noiseAreaPath = [
    ...points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.r).toFixed(2)} ${yScale(p.vqeNoisy).toFixed(2)}`),
    ...[...points]
      .reverse()
      .map((p) => `L ${xScale(p.r).toFixed(2)} ${yScale(p.fci).toFixed(2)}`),
    'Z',
  ].join(' ');

  const chemAccAreaPath = [
    ...points.map((p, i) => {
      const yUpper = Math.min(yScale(p.fci + 0.0016), yScale(p.fci) - 2);
      return `${i === 0 ? 'M' : 'L'} ${xScale(p.r).toFixed(2)} ${yUpper.toFixed(2)}`;
    }),
    ...[...points].reverse().map((p) => {
      const yLower = Math.max(yScale(p.fci - 0.0016), yScale(p.fci) + 2);
      return `L ${xScale(p.r).toFixed(2)} ${yLower.toFixed(2)}`;
    }),
    'Z',
  ].join(' ');

  const yTicks = 6;
  const yTickValues = Array.from({ length: yTicks }, (_, i) => yMin + ((yMax - yMin) * i) / (yTicks - 1));
  const xTicks = 6;
  const xTickValues = Array.from({ length: xTicks }, (_, i) => xMin + ((xMax - xMin) * i) / (xTicks - 1));

  const selected = points[selectedIndex] ?? points[0];
  const eqX = xScale(spec.equilibriumR);

  return (
    <div className="chart-frame">
      <div className="chart-header">
        <div>
          <h2 className="card-title">
            Potential Energy Surface ({spec.formula}, {spec.basis})
          </h2>
          <p className="card-subtitle">
            Dissociation energy (Ha) vs. bond length (A). Hover or tap any geometry to inspect.
          </p>
        </div>
        <div className="legend-row" aria-label="Chart legend">
          <span className="legend-item">
            <span className="swatch swatch-fci" />
            Exact FCI
          </span>
          <span className="legend-item">
            <span className="swatch swatch-rhf" />
            Hartree-Fock
          </span>
          <span className="legend-item">
            <span className="swatch swatch-vqe-ideal" />
            Noiseless VQE
          </span>
          <span className="legend-item">
            <span className="swatch swatch-vqe-noisy" />
            Noisy VQE
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="svg-chart"
        role="img"
        aria-label={`${spec.formula} potential energy surface comparing Exact FCI, Hartree-Fock, Noiseless VQE, and Noisy VQE`}
      >
        <defs>
          <linearGradient id="noiseGapGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b91c1c" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        {yTickValues.map((val, idx) => {
          const y = yScale(val);
          return (
            <g key={`y-${idx}`}>
              <line
                x1={pad.left}
                y1={y}
                x2={width - pad.right}
                y2={y}
                stroke="#e5e5e3"
                strokeWidth="1"
              />
              <text
                x={pad.left - 10}
                y={y + 4}
                textAnchor="end"
                fill="#555555"
                fontSize="12"
                fontFamily="var(--font-mono)"
              >
                {val.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Vertical gridlines */}
        {xTickValues.map((val, idx) => {
          const x = xScale(val);
          return (
            <g key={`x-${idx}`}>
              <line
                x1={x}
                y1={pad.top}
                x2={x}
                y2={height - pad.bottom}
                stroke="#ececea"
                strokeWidth="1"
                strokeDasharray="3 4"
              />
              <text
                x={x}
                y={height - pad.bottom + 20}
                textAnchor="middle"
                fill="#555555"
                fontSize="12"
                fontFamily="var(--font-mono)"
              >
                {val.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Equilibrium bond length marker */}
        <line
          x1={eqX}
          y1={pad.top}
          x2={eqX}
          y2={height - pad.bottom}
          stroke="#9ca3af"
          strokeWidth="1.25"
          strokeDasharray="4 4"
        />
        <text
          x={eqX + 6}
          y={pad.top + 14}
          fill="#555555"
          fontSize="11.5"
          fontFamily="var(--font-mono)"
        >
          R_eq = {spec.equilibriumR.toFixed(2)} A
        </text>

        {/* Shaded noise gap */}
        <path d={noiseAreaPath} fill="url(#noiseGapGrad)" />

        {/* Chemical accuracy band around FCI */}
        <path d={chemAccAreaPath} fill="#15803d" fillOpacity="0.16" />

        {/* Hartree-Fock curve */}
        <path
          d={buildPath((p) => p.rhf)}
          fill="none"
          stroke="#b45309"
          strokeWidth="2.2"
          strokeDasharray="7 5"
        />

        {/* Exact FCI curve */}
        <path
          d={buildPath((p) => p.fci)}
          fill="none"
          stroke="#1d4ed8"
          strokeWidth="2.6"
        />

        {/* Noiseless VQE curve */}
        <path
          d={buildPath((p) => p.vqeNoiseless)}
          fill="none"
          stroke="#15803d"
          strokeWidth="2.1"
          strokeDasharray="2 4"
          strokeLinecap="round"
        />

        {/* Noisy VQE curve */}
        <path
          d={buildPath((p) => p.vqeNoisy)}
          fill="none"
          stroke="#b91c1c"
          strokeWidth="2.5"
        />

        {/* Selected crosshair */}
        <line
          x1={xScale(selected.r)}
          y1={pad.top}
          x2={xScale(selected.r)}
          y2={height - pad.bottom}
          stroke="#111111"
          strokeOpacity="0.22"
          strokeWidth="1.2"
        />

        {/* Selected point markers */}
        <circle cx={xScale(selected.r)} cy={yScale(selected.rhf)} r="4.5" fill="#b45309" stroke="#ffffff" strokeWidth="1.5" />
        <circle cx={xScale(selected.r)} cy={yScale(selected.fci)} r="5" fill="#1d4ed8" stroke="#ffffff" strokeWidth="1.5" />
        <circle cx={xScale(selected.r)} cy={yScale(selected.vqeNoisy)} r="5" fill="#b91c1c" stroke="#ffffff" strokeWidth="1.5" />

        {/* Interactive hit targets */}
        {points.map((pt, idx) => {
          const cx = xScale(pt.r);
          const isSelected = idx === selectedIndex;
          return (
            <g
              key={pt.r}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelectIndex(idx)}
              onMouseEnter={() => onSelectIndex(idx)}
            >
              <rect
                x={cx - plotW / (points.length * 2)}
                y={pad.top}
                width={plotW / points.length}
                height={plotH}
                fill="transparent"
              />
              {!isSelected && (
                <circle
                  cx={cx}
                  cy={yScale(pt.vqeNoisy)}
                  r="2.6"
                  fill="#b91c1c"
                  fillOpacity="0.65"
                />
              )}
            </g>
          );
        })}

        {/* Axis labels */}
        <text
          x={pad.left + plotW / 2}
          y={height - 10}
          textAnchor="middle"
          fill="#111111"
          fontSize="12.5"
          fontWeight="600"
        >
          Internuclear Bond Length R (Angstroms)
        </text>
        <text
          x={18}
          y={pad.top + plotH / 2}
          textAnchor="middle"
          fill="#111111"
          fontSize="12.5"
          fontWeight="600"
          transform={`rotate(-90 18 ${pad.top + plotH / 2})`}
        >
          Total Energy (Hartrees, Ha)
        </text>
      </svg>
    </div>
  );
};
