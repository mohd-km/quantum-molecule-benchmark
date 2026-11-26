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
  const height = 400;
  const pad = { top: 26, right: 24, bottom: 52, left: 70 };
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

  // Shaded noise gap polygon between Noisy VQE and Exact FCI
  const noiseAreaPath = [
    ...points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.r).toFixed(2)} ${yScale(p.vqeNoisy).toFixed(2)}`),
    ...[...points]
      .reverse()
      .map((p) => `L ${xScale(p.r).toFixed(2)} ${yScale(p.fci).toFixed(2)}`),
    'Z',
  ].join(' ');

  // Chemical accuracy visual band around FCI (+/- 1.6 mHa, with minimum 2px visibility)
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
            Ground-state dissociation energy (Hartrees) vs. internuclear bond length (Angstroms). Select any point to inspect.
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
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.06" />
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
                stroke="#1e293b"
                strokeWidth="1"
              />
              <text
                x={pad.left - 10}
                y={y + 4}
                textAnchor="end"
                fill="#94a3b8"
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
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray="3 4"
              />
              <text
                x={x}
                y={height - pad.bottom + 20}
                textAnchor="middle"
                fill="#94a3b8"
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
          stroke="#475569"
          strokeWidth="1.25"
          strokeDasharray="4 4"
        />
        <text
          x={eqX + 6}
          y={pad.top + 14}
          fill="#94a3b8"
          fontSize="11"
          fontFamily="var(--font-mono)"
        >
          R_eq = {spec.equilibriumR.toFixed(2)} A
        </text>

        {/* Shaded noise gap */}
        <path d={noiseAreaPath} fill="url(#noiseGapGrad)" />

        {/* Chemical accuracy band around FCI */}
        <path d={chemAccAreaPath} fill="#34d399" fillOpacity="0.22" />

        {/* Hartree-Fock curve */}
        <path
          d={buildPath((p) => p.rhf)}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2.4"
          strokeDasharray="7 5"
        />

        {/* Exact FCI curve */}
        <path
          d={buildPath((p) => p.fci)}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2.8"
        />

        {/* Noiseless VQE curve */}
        <path
          d={buildPath((p) => p.vqeNoiseless)}
          fill="none"
          stroke="#34d399"
          strokeWidth="2.2"
          strokeDasharray="2 4"
          strokeLinecap="round"
        />

        {/* Noisy VQE curve */}
        <path
          d={buildPath((p) => p.vqeNoisy)}
          fill="none"
          stroke="#f43f5e"
          strokeWidth="2.6"
        />

        {/* Selected crosshair */}
        <line
          x1={xScale(selected.r)}
          y1={pad.top}
          x2={xScale(selected.r)}
          y2={height - pad.bottom}
          stroke="#e2e8f0"
          strokeOpacity="0.35"
          strokeWidth="1.2"
        />

        {/* Selected point markers */}
        <circle cx={xScale(selected.r)} cy={yScale(selected.rhf)} r="4.5" fill="#f59e0b" stroke="#0b0f17" strokeWidth="1.5" />
        <circle cx={xScale(selected.r)} cy={yScale(selected.fci)} r="5" fill="#38bdf8" stroke="#0b0f17" strokeWidth="1.5" />
        <circle cx={xScale(selected.r)} cy={yScale(selected.vqeNoisy)} r="5" fill="#f43f5e" stroke="#0b0f17" strokeWidth="1.5" />

        {/* Interactive hit targets for every bond length */}
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
                  r="2.8"
                  fill="#f43f5e"
                  fillOpacity="0.7"
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
          fill="#cbd5e1"
          fontSize="13"
          fontWeight="600"
        >
          Internuclear Bond Length R (Angstroms)
        </text>
        <text
          x={18}
          y={pad.top + plotH / 2}
          textAnchor="middle"
          fill="#cbd5e1"
          fontSize="13"
          fontWeight="600"
          transform={`rotate(-90 18 ${pad.top + plotH / 2})`}
        >
          Total Energy (Hartrees, Ha)
        </text>
      </svg>
    </div>
  );
};
