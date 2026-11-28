import './styles.css';
import React, { useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { APPLICATION_PRESETS, MATERIALS_DATA } from './data/materials';
import { MaterialRecord, PresetId } from './types';
import { StabilityScatterPlot } from './components/StabilityScatterPlot';
import { FilterPanel, RiskFilterMode } from './components/FilterPanel';
import { MaterialsTable } from './components/MaterialsTable';
import { CrystalDetailDrawer } from './components/CrystalDetailDrawer';
import { computeParetoIds, downloadShortlistCsv } from './utils/pareto';

const DEFAULT_BG_MIN = 0.0;
const DEFAULT_BG_MAX = 7.6;
const DEFAULT_MAX_HULL = 0.065;
const DEFAULT_MIN_ABUNDANCE = 0;

export const App: React.FC = () => {
  const [presetId, setPresetId] = useState<PresetId | 'custom'>('all');
  const [bandGapMin, setBandGapMin] = useState<number>(DEFAULT_BG_MIN);
  const [bandGapMax, setBandGapMax] = useState<number>(DEFAULT_BG_MAX);
  const [maxHull, setMaxHull] = useState<number>(DEFAULT_MAX_HULL);
  const [minAbundance, setMinAbundance] = useState<number>(DEFAULT_MIN_ABUNDANCE);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskMode, setRiskMode] = useState<RiskFilterMode>('all');
  const [excludedBottlenecks, setExcludedBottlenecks] = useState<string[]>([]);
  const [requiredAbundant, setRequiredAbundant] = useState<string[]>([]);
  const [paretoOnly, setParetoOnly] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialRecord | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [csvExported, setCsvExported] = useState(false);

  const handleSelectPreset = (id: PresetId) => {
    setPresetId(id);
    const p = APPLICATION_PRESETS.find((item) => item.id === id);
    if (!p) return;
    setBandGapMin(p.bandGapMin);
    setBandGapMax(p.bandGapMax ?? DEFAULT_BG_MAX);
    setMaxHull(Math.min(p.maxHullDefault, DEFAULT_MAX_HULL));
  };

  const handleBandGapMinChange = (val: number) => {
    setPresetId('custom');
    setBandGapMin(val);
  };

  const handleBandGapMaxChange = (val: number) => {
    setPresetId('custom');
    setBandGapMax(val);
  };

  const handleToggleBottleneck = (symbol: string) => {
    setExcludedBottlenecks((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    );
  };

  const handleToggleAbundant = (symbol: string) => {
    setRequiredAbundant((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    );
  };

  const handleReset = () => {
    setPresetId('all');
    setBandGapMin(DEFAULT_BG_MIN);
    setBandGapMax(DEFAULT_BG_MAX);
    setMaxHull(DEFAULT_MAX_HULL);
    setMinAbundance(DEFAULT_MIN_ABUNDANCE);
    setSearchQuery('');
    setRiskMode('all');
    setExcludedBottlenecks([]);
    setRequiredAbundant([]);
    setParetoOnly(false);
  };

  const hasActiveFilters =
    presetId !== 'all' ||
    bandGapMin > DEFAULT_BG_MIN ||
    bandGapMax < DEFAULT_BG_MAX ||
    maxHull < DEFAULT_MAX_HULL ||
    minAbundance > DEFAULT_MIN_ABUNDANCE ||
    searchQuery.trim() !== '' ||
    riskMode !== 'all' ||
    excludedBottlenecks.length > 0 ||
    requiredAbundant.length > 0 ||
    paretoOnly;

  // Base shortlist matching spec sliders and supply filters
  const baseShortlist = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return MATERIALS_DATA.filter((m) => {
      if (m.bandGap < bandGapMin - 1e-6 || m.bandGap > bandGapMax + 1e-6) return false;
      if (m.energyAboveHull > maxHull + 1e-6) return false;
      if (m.earthAbundanceScore < minAbundance) return false;

      if (riskMode === 'abundant-only' && m.supplyRisk !== 'Low') return false;
      if (riskMode === 'exclude-critical' && m.supplyRisk === 'Critical') return false;
      if (riskMode === 'critical-only' && m.supplyRisk !== 'Critical') return false;

      if (
        excludedBottlenecks.length > 0 &&
        excludedBottlenecks.some((el) => m.elements.includes(el))
      ) {
        return false;
      }

      if (
        requiredAbundant.length > 0 &&
        !requiredAbundant.some((el) => m.elements.includes(el))
      ) {
        return false;
      }

      if (q) {
        const hay = `${m.formula} ${m.name} ${m.mpId} ${m.spaceGroup} ${m.family}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [
    bandGapMin,
    bandGapMax,
    maxHull,
    minAbundance,
    riskMode,
    excludedBottlenecks,
    requiredAbundant,
    searchQuery,
  ]);

  // Live Pareto frontier computed over the base shortlist
  const paretoIds = useMemo(
    () => computeParetoIds(baseShortlist, { bandGapMin, bandGapMax }),
    [baseShortlist, bandGapMin, bandGapMax]
  );

  // Final displayed shortlist (respects optional "Pareto only" toggle)
  const displayedMaterials = useMemo(
    () => (paretoOnly ? baseShortlist.filter((m) => paretoIds.has(m.id)) : baseShortlist),
    [baseShortlist, paretoIds, paretoOnly]
  );

  const kpis = useMemo(() => {
    const stableCount = displayedMaterials.filter((m) => m.energyAboveHull <= 0.025).length;
    const abundantCount = displayedMaterials.filter((m) => m.supplyRisk === 'Low').length;
    return {
      total: displayedMaterials.length,
      paretoCount: paretoIds.size,
      stableCount,
      abundantCount,
    };
  }, [displayedMaterials, paretoIds]);

  const handleExportCsv = () => {
    if (displayedMaterials.length === 0) return;
    downloadShortlistCsv(displayedMaterials, paretoIds);
    setCsvExported(true);
    window.setTimeout(() => setCsvExported(false), 2000);
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <div className="brand-block">
            <h2 className="module-heading">Material screener: right electrical behaviour, stable, buildable</h2>
            <p className="site-subtitle">
              Best trade-offs (Pareto frontier) across {MATERIALS_DATA.length} known crystals. Band gaps come from published measurements; stability, abundance and supply-risk scores are hand-curated estimates, not a live Materials Project database pull.
            </p>
          </div>
        </div>

        <div className="kpi-strip" aria-label="Screened portfolio summary">
          <div className="kpi-card">
            <span className="kpi-label">Shortlisted</span>
            <strong className="kpi-value">
              {kpis.total} <span className="kpi-denom">/ {MATERIALS_DATA.length}</span>
            </strong>
          </div>
          <div className="kpi-card kpi-card-accent">
            <span className="kpi-label">Best trade-offs (Pareto)</span>
            <strong className="kpi-value kpi-accent">{kpis.paretoCount}</strong>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Stable enough to make (E_hull &le; 0.025)</span>
            <strong className="kpi-value">{kpis.stableCount}</strong>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Common elements only</span>
            <strong className="kpi-value kpi-success">{kpis.abundantCount}</strong>
          </div>
        </div>
      </header>

      <main className="main-container">
        {/* Application Target Presets */}
        <section className="presets-bar" aria-label="Application target presets">
          <div className="presets-header-row">
            <span className="presets-label">Pick a job for the material</span>
            <button
              type="button"
              className="mobile-filter-toggle"
              onClick={() => setMobileFiltersOpen((v) => !v)}
              aria-expanded={mobileFiltersOpen}
            >
              <SlidersHorizontal size={15} aria-hidden="true" />
              <span>{mobileFiltersOpen ? 'Hide Controls' : 'Spec Controls'}</span>
            </button>
          </div>
          <div className="presets-grid">
            {APPLICATION_PRESETS.map((preset) => {
              const active = preset.id === presetId;
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`preset-btn ${active ? 'preset-btn-active' : ''}`}
                  onClick={() => handleSelectPreset(preset.id)}
                  aria-pressed={active}
                >
                  <span className="preset-btn-title">
                    {preset.id === 'all' ? `All (${MATERIALS_DATA.length})` : preset.shortLabel}
                  </span>
                  <span className="preset-btn-criteria">{preset.criteriaLabel}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Responsive Workspace */}
        <div className="workspace-grid">
          <div className={`filter-column ${mobileFiltersOpen ? 'filter-column-open' : ''}`}>
            <FilterPanel
              bandGapMin={bandGapMin}
              bandGapMax={bandGapMax}
              onBandGapMinChange={handleBandGapMinChange}
              onBandGapMaxChange={handleBandGapMaxChange}
              maxHull={maxHull}
              onMaxHullChange={setMaxHull}
              minAbundance={minAbundance}
              onMinAbundanceChange={setMinAbundance}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              riskMode={riskMode}
              onRiskModeChange={setRiskMode}
              excludedBottlenecks={excludedBottlenecks}
              onToggleBottleneck={handleToggleBottleneck}
              requiredAbundant={requiredAbundant}
              onToggleAbundant={handleToggleAbundant}
              onReset={handleReset}
              hasActiveFilters={hasActiveFilters}
            />
          </div>

          <div className="stage-column">
            <StabilityScatterPlot
              allMaterials={MATERIALS_DATA}
              filteredMaterials={displayedMaterials}
              paretoIds={paretoIds}
              bandGapMin={bandGapMin}
              bandGapMax={bandGapMax}
              maxHull={maxHull}
              minAbundance={minAbundance}
              paretoOnly={paretoOnly}
              onToggleParetoOnly={() => setParetoOnly((v) => !v)}
              onExportCsv={handleExportCsv}
              csvExported={csvExported}
              selectedId={selectedMaterial?.id ?? null}
              onSelect={setSelectedMaterial}
            />

            <MaterialsTable
              materials={displayedMaterials}
              paretoIds={paretoIds}
              selectedId={selectedMaterial?.id ?? null}
              onSelect={setSelectedMaterial}
              onExportCsv={handleExportCsv}
              csvExported={csvExported}
            />
          </div>
        </div>
      </main>


      <CrystalDetailDrawer
        material={selectedMaterial}
        isPareto={selectedMaterial ? paretoIds.has(selectedMaterial.id) : false}
        allMaterials={MATERIALS_DATA}
        onClose={() => setSelectedMaterial(null)}
        onSelectAlternative={(alt) => setSelectedMaterial(alt)}
      />
    </div>
  );
};

export default App;
