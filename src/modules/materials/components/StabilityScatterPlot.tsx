import React, { useMemo, useState } from 'react';
import { Download, Check, Sparkles } from 'lucide-react';
import { MaterialRecord, SupplyRiskTier } from '../types';

export type ScatterAxisMode = 'bandgap' | 'abundance';

interface StabilityScatterPlotProps {
  allMaterials: MaterialRecord[];
  filteredMaterials: MaterialRecord[];
  paretoIds: Set<string>;
  bandGapMin: number;
  bandGapMax: number;
  maxHull: number;
  minAbundance: number;
  paretoOnly: boolean;
  onToggleParetoOnly: () => void;
  onExportCsv: () => void;
  csvExported: boolean;
  selectedId: string | null;
  onSelect: (material: MaterialRecord) => void;
}

const RISK_COLORS: Record<SupplyRiskTier, string> = {
  Low: '#15803d',
  Moderate: '#1e40af',
  High: '#b45309',
  Critical: '#b91c1c',
};

const LANDMARK_IDS = new Set([
  'si-diamond',
  'cdte-zb',
  'czts-kesterite',
  'fes2-pyrite',
  'gaas-zb',
  'sic-4h',
  'gan-wurtzite',
  'ga2o3-beta',
  'aln-wurtzite',
  'llzo-cubic',
  'lgps-superionic',
  'li6ps5cl-argyrodite',
  'nasicon-nzsp',
  'lifepo4-olivine',
]);

export const StabilityScatterPlot: React.FC<StabilityScatterPlotProps> = ({
  allMaterials,
  filteredMaterials,
  paretoIds,
  bandGapMin,
  bandGapMax,
  maxHull,
  minAbundance,
  paretoOnly,
  onToggleParetoOnly,
  onExportCsv,
  csvExported,
  selectedId,
  onSelect,
}) => {
  const [hovered, setHovered] = useState<MaterialRecord | null>(null);
  const [axisMode, setAxisMode] = useState<ScatterAxisMode>('bandgap');

  const filteredIds = useMemo(() => new Set(filteredMaterials.map((m) => m.id)), [filteredMaterials]);

  const width = 820;
  const height = 430;
  const pad = { top: 28, right: 28, bottom: 52, left: 68 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const maxBgX = 7.6;
  const maxY = 0.065;

  const xScale = (m: MaterialRecord) => {
    if (axisMode === 'bandgap') {
      return pad.left + (Math.min(Math.max(m.bandGap, 0), maxBgX) / maxBgX) * plotW;
    }
    return pad.left + (Math.min(Math.max(m.earthAbundanceScore, 0), 100) / 100) * plotW;
  };

  const xValScale = (val: number) => {
    if (axisMode === 'bandgap') {
      return pad.left + (Math.min(Math.max(val, 0), maxBgX) / maxBgX) * plotW;
    }
    return pad.left + (Math.min(Math.max(val, 0), 100) / 100) * plotW;
  };

  const yScale = (hull: number) =>
    pad.top + plotH - (Math.min(Math.max(hull, 0), maxY) / maxY) * plotH;

  const xTicks = axisMode === 'bandgap' ? [0, 1, 2, 3, 4, 5, 6, 7] : [0, 20, 40, 60, 80, 100];
  const yTicks = [0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06];

  // Live Spec Box coordinates
  const specX1 = axisMode === 'bandgap' ? xValScale(bandGapMin) : xValScale(minAbundance);
  const specX2 = axisMode === 'bandgap' ? xValScale(bandGapMax) : xValScale(100);
  const specYTop = yScale(maxHull);
  const specYBottom = yScale(0);

  // Pareto frontier polyline points sorted along active X-axis
  const paretoPoints = useMemo(() => {
    const pts = filteredMaterials.filter((m) => paretoIds.has(m.id));
    return pts.sort((a, b) =>
      axisMode === 'bandgap'
        ? a.bandGap - b.bandGap || a.energyAboveHull - b.energyAboveHull
        : a.earthAbundanceScore - b.earthAbundanceScore || a.energyAboveHull - b.energyAboveHull
    );
  }, [filteredMaterials, paretoIds, axisMode]);

  const paretoPolyline = paretoPoints
    .map((m) => `${xScale(m).toFixed(1)},${yScale(m.energyAboveHull).toFixed(1)}`)
    .join(' ');

  const thresholdY = yScale(0.025);
  const activeInspect = hovered ?? allMaterials.find((m) => m.id === selectedId) ?? null;

  return (
    <section className="card chart-card" aria-label="Interactive Pareto-Frontier Scatter Plot">
      <div className="card-header chart-header-bar">
        <div className="chart-title-block">
          <h2 className="card-title">Stability vs band gap: the best trade-offs</h2>
          <p className="card-subtitle">
            Lower on the chart means more stable. Blue dots joined by the line are the Pareto frontier: crystals no other crystal beats on stability, abundance and band-gap fit all at once. Move the sliders or click any dot.
          </p>
        </div>

        <div className="chart-toolbar">
          <div className="segmented-tabs" role="tablist" aria-label="Scatter X-axis metric">
            <button
              type="button"
              role="tab"
              aria-selected={axisMode === 'bandgap'}
              className={`seg-tab ${axisMode === 'bandgap' ? 'seg-tab-active' : ''}`}
              onClick={() => setAxisMode('bandgap')}
            >
              Band Gap
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={axisMode === 'abundance'}
              className={`seg-tab ${axisMode === 'abundance' ? 'seg-tab-active' : ''}`}
              onClick={() => setAxisMode('abundance')}
            >
              Abundance (0 to 100)
            </button>
          </div>

          <button
            type="button"
            className={`btn-toggle-pareto ${paretoOnly ? 'btn-toggle-pareto-active' : ''}`}
            onClick={onToggleParetoOnly}
            aria-pressed={paretoOnly}
          >
            <Sparkles size={14} aria-hidden="true" />
            <span>Best trade-offs only ({paretoIds.size})</span>
          </button>

          <button
            type="button"
            className="btn-export-csv"
            onClick={onExportCsv}
            disabled={filteredMaterials.length === 0}
          >
            {csvExported ? (
              <>
                <Check size={15} aria-hidden="true" />
                <span>Exported</span>
              </>
            ) : (
              <>
                <Download size={15} aria-hidden="true" />
                <span>CSV ({filteredMaterials.length})</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="legend-row" aria-label="Chart legend">
        <span className="legend-item">
          <span className="legend-pareto-swatch" />
          <span>Best trade-offs, Pareto ({paretoIds.size})</span>
        </span>
        {(['Low', 'Moderate', 'High', 'Critical'] as SupplyRiskTier[]).map((tier) => (
          <span key={tier} className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: RISK_COLORS[tier] }} />
            <span>{tier === 'Low' ? 'Abundant' : `${tier} supply risk`}</span>
          </span>
        ))}
      </div>

      <div className="svg-wrapper">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="scatter-svg"
          role="img"
          aria-label={
            axisMode === 'bandgap'
              ? 'Interactive Pareto scatter plot of Energy Above Hull versus Band Gap'
              : 'Interactive Pareto scatter plot of Energy Above Hull versus Earth Abundance Score'
          }
        >
          {/* Crisp white paper plot area */}
          <rect
            x={pad.left}
            y={pad.top}
            width={plotW}
            height={plotH}
            fill="#ffffff"
            stroke="#e5e5e3"
            strokeWidth="1"
          />

          {/* Gridlines */}
          {xTicks.map((t) => {
            const x = xValScale(t);
            return (
              <g key={`gx-${t}`}>
                <line x1={x} y1={pad.top} x2={x} y2={pad.top + plotH} stroke="#f0f0ee" strokeWidth="1" />
                <text x={x} y={pad.top + plotH + 20} textAnchor="middle" className="axis-tick">
                  {t}
                </text>
              </g>
            );
          })}

          {yTicks.map((t) => {
            const y = yScale(t);
            return (
              <g key={`gy-${t}`}>
                <line x1={pad.left} y1={y} x2={pad.left + plotW} y2={y} stroke="#f0f0ee" strokeWidth="1" />
                <text x={pad.left - 10} y={y + 4} textAnchor="end" className="axis-tick">
                  {t.toFixed(3)}
                </text>
              </g>
            );
          })}

          {/* Live Active Spec Window */}
          <g>
            <rect
              x={specX1}
              y={specYTop}
              width={Math.max(specX2 - specX1, 2)}
              height={Math.max(specYBottom - specYTop, 2)}
              fill="rgba(30, 64, 175, 0.055)"
              stroke="rgba(30, 64, 175, 0.35)"
              strokeWidth="1.25"
              strokeDasharray="4 4"
            />
            <text
              x={Math.min(Math.max((specX1 + specX2) / 2, pad.left + 70), pad.left + plotW - 70)}
              y={Math.max(specYTop - 7, pad.top + 14)}
              textAnchor="middle"
              className="zone-label"
            >
              {axisMode === 'bandgap'
                ? `Spec: ${bandGapMin.toFixed(1)}–${bandGapMax.toFixed(1)} eV | E_hull ≤ ${maxHull.toFixed(3)}`
                : `Spec: Abundance ≥ ${minAbundance} | E_hull ≤ ${maxHull.toFixed(3)}`}
            </text>
          </g>

          {/* Synthesizable guideline at 0.025 eV/atom */}
          <line
            x1={pad.left}
            y1={thresholdY}
            x2={pad.left + plotW}
            y2={thresholdY}
            stroke="#a3a3a0"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <text x={pad.left + plotW - 6} y={thresholdY - 6} textAnchor="end" className="threshold-label">
            0.025 eV/atom: usually still makeable
          </text>

          {/* Ground state baseline */}
          <line
            x1={pad.left}
            y1={yScale(0)}
            x2={pad.left + plotW}
            y2={yScale(0)}
            stroke="#111111"
            strokeOpacity={0.35}
            strokeWidth="1.25"
          />

          {/* Live Pareto Frontier Polyline */}
          {paretoPoints.length >= 2 && (
            <polyline
              points={paretoPolyline}
              fill="none"
              stroke="#1e40af"
              strokeWidth="2.25"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeOpacity={0.85}
            />
          )}

          {/* Out-of-filter crystals (context dots) */}
          {allMaterials
            .filter((m) => !filteredIds.has(m.id))
            .map((m) => (
              <circle
                key={`dim-${m.id}`}
                cx={xScale(m)}
                cy={yScale(m.energyAboveHull)}
                r={4}
                fill="#d6d6d2"
                fillOpacity={0.65}
              />
            ))}

          {/* Active shortlisted crystals */}
          {filteredMaterials.map((m) => {
            const cx = xScale(m);
            const cy = yScale(m.energyAboveHull);
            const isSelected = m.id === selectedId;
            const isHovered = hovered?.id === m.id;
            const isPareto = paretoIds.has(m.id);
            const color = RISK_COLORS[m.supplyRisk];
            const showLabel =
              isSelected ||
              isHovered ||
              isPareto ||
              (filteredMaterials.length <= 12 ? true : LANDMARK_IDS.has(m.id));

            const labelOffsetY = isPareto ? -13 : -10;
            const anchor = cx > width - 100 ? 'end' : cx < pad.left + 55 ? 'start' : 'middle';

            return (
              <g
                key={m.id}
                className="scatter-point-group"
                onClick={() => onSelect(m)}
                onMouseEnter={() => setHovered(m)}
                onMouseLeave={() => setHovered(null)}
                role="button"
                tabIndex={0}
                aria-label={`${m.formula} (${m.name}), band gap ${m.bandGap} eV, hull ${m.energyAboveHull} eV/atom, abundance ${m.earthAbundanceScore}${isPareto ? ', Pareto optimal' : ''}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(m);
                  }
                }}
              >
                <circle cx={cx} cy={cy} r={14} fill="transparent" />

                {/* Pareto frontier outer ring */}
                {isPareto && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected || isHovered ? 12 : 10}
                    fill="rgba(30, 64, 175, 0.12)"
                    stroke="#1e40af"
                    strokeWidth={1.75}
                  />
                )}

                {!isPareto && (isSelected || isHovered) && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={10}
                    fill={color}
                    fillOpacity={0.14}
                    stroke={color}
                    strokeWidth={1.25}
                  />
                )}

                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 7 : isPareto ? 6.2 : 5.2}
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth={1.75}
                />

                {showLabel && (
                  <text
                    x={cx}
                    y={cy + labelOffsetY}
                    textAnchor={anchor}
                    className={
                      isSelected || isHovered || isPareto
                        ? 'point-label point-label-active'
                        : 'point-label'
                    }
                  >
                    {m.formula}
                  </text>
                )}
              </g>
            );
          })}

          {/* Axis Labels */}
          <text x={pad.left + plotW / 2} y={height - 12} textAnchor="middle" className="axis-title">
            {axisMode === 'bandgap'
              ? 'Band gap, E_g (eV): energy to free an electron'
              : 'Earth abundance score (0 to 100, higher is easier to source)'}
          </text>
          <text
            x={18}
            y={pad.top + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90 18 ${pad.top + plotH / 2})`}
            className="axis-title"
          >
            Instability, E_hull (eV/atom), 0 = stable
          </text>
        </svg>
      </div>

      {/* Live Inspection Bar */}
      <div className="chart-inspect-bar">
        {activeInspect ? (
          <>
            <div className="inspect-primary">
              <span className="mono-badge">{activeInspect.mpId}</span>
              <strong className="mono-formula">{activeInspect.formula}</strong>
              <span className="inspect-name">{activeInspect.name}</span>
              {paretoIds.has(activeInspect.id) && (
                <span className="pareto-badge">Pareto Frontier</span>
              )}
            </div>
            <div className="inspect-metrics">
              <span>
                Band gap <strong>{activeInspect.bandGap.toFixed(2)} eV</strong>
              </span>
              <span>
                Instability (E_hull) <strong>{activeInspect.energyAboveHull.toFixed(3)} eV/atom</strong>
              </span>
              <span>
                Abundance <strong>{activeInspect.earthAbundanceScore}/100</strong>
              </span>
              <button
                type="button"
                className="btn-inline-link"
                onClick={() => onSelect(activeInspect)}
              >
                Inspect
              </button>
            </div>
          </>
        ) : (
          <span className="inspect-placeholder">
            Hover or tap any crystal marker to inspect stability, abundance, and commercialization lag.
          </span>
        )}
      </div>

      {/* Collapsible Methodology Drawer */}
      <details className="editorial-details chart-details">
        <summary className="details-summary">How the best trade-offs are picked, and where the data comes from</summary>
        <div className="details-body">
          <p>
            <strong>Best trade-offs (Pareto optimal):</strong> a crystal makes the cut if no other
            shortlisted crystal is at least as good on all three goals and better on one: lower
            instability (<code>E_hull</code>), higher earth-abundance score, and better band-gap fit
            (closest to the middle of your window, or simply the widest gap when the window is open-ended,
            as for power chips and solid electrolytes).
          </p>
          <p>
            <strong>Data:</strong> stability values (<code>E_hull</code>) are hand-curated estimates
            modelled on Materials Project stability maps, not a live query. Band gaps use published,
            experiment-checked values; the crystal drawer also shows the rougher PBE gap, a quick
            computer estimate that usually comes out too low.
          </p>
        </div>
      </details>
    </section>
  );
};
