import React, { useMemo, useState } from 'react';
import {
  CHEMICAL_ACCURACY_MHA,
  HARDWARE_PRESETS,
  MOLECULES,
  MoleculeId,
  evaluateMoleculePES,
} from './data/molecules';
import { LiveVQESimulator } from './components/LiveVQESimulator';
import { PESChart } from './components/PESChart';
import { NoiseErrorChart } from './components/NoiseErrorChart';
import { EngineeringVerdict } from './components/EngineeringVerdict';

type ActiveTab = 'simulator' | 'pes' | 'data';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('simulator');
  const [moleculeId, setMoleculeId] = useState<MoleculeId>('H2');
  const [twoQubitErrorPct, setTwoQubitErrorPct] = useState<number>(0.15);
  const [circuitDepth, setCircuitDepth] = useState<number>(MOLECULES.H2.defaultDepth);
  const [selectedIndex, setSelectedIndex] = useState<number>(4);

  const spec = MOLECULES[moleculeId];

  const handleSelectMolecule = (id: MoleculeId) => {
    setMoleculeId(id);
    setCircuitDepth(MOLECULES[id].defaultDepth);
    const pts = MOLECULES[id].points;
    let eqIdx = 0;
    let best = Math.abs(pts[0].r - MOLECULES[id].equilibriumR);
    pts.forEach((p, idx) => {
      const d = Math.abs(p.r - MOLECULES[id].equilibriumR);
      if (d < best) {
        best = d;
        eqIdx = idx;
      }
    });
    setSelectedIndex(eqIdx);
  };

  const evalResult = useMemo(
    () => evaluateMoleculePES(spec, twoQubitErrorPct, circuitDepth),
    [spec, twoQubitErrorPct, circuitDepth]
  );

  const safeIndex = Math.min(selectedIndex, evalResult.points.length - 1);
  const selectedPoint = evalResult.points[safeIndex];

  const controlsSidebar = (
    <aside className="controls-column">
      <div className="panel control-panel">
        <h2 className="card-title">NISQ Noise &amp; Circuit Controls</h2>
        <p className="card-subtitle">
          Adjust 2-qubit gate error and ansatz depth to shift circuit fidelity live.
        </p>

        <div className="slider-group">
          <div className="slider-header">
            <label htmlFor="error-slider" className="slider-label">
              2-Qubit Gate Error (p_2q)
            </label>
            <span className="slider-readout">{twoQubitErrorPct.toFixed(2)}%</span>
          </div>
          <input
            id="error-slider"
            type="range"
            min={0.01}
            max={2.0}
            step={0.01}
            value={twoQubitErrorPct}
            onChange={(e) => setTwoQubitErrorPct(parseFloat(e.target.value))}
            className="range-input"
          />
          <div className="slider-ticks">
            <span>0.01%</span>
            <span>0.50%</span>
            <span>1.00%</span>
            <span>2.00%</span>
          </div>
        </div>

        <div className="slider-group">
          <div className="slider-header">
            <label htmlFor="depth-slider" className="slider-label">
              Ansatz Depth (Layers)
            </label>
            <span className="slider-readout">
              {circuitDepth} ({evalResult.totalTwoQubitGates} 2Q)
            </span>
          </div>
          <input
            id="depth-slider"
            type="range"
            min={2}
            max={24}
            step={1}
            value={circuitDepth}
            onChange={(e) => setCircuitDepth(parseInt(e.target.value, 10))}
            className="range-input"
          />
          <div className="slider-ticks">
            <span>2</span>
            <span>12</span>
            <span>24 layers</span>
          </div>
        </div>

        <div className="presets-block">
          <span className="presets-label">Hardware Presets</span>
          <div className="presets-grid">
            {HARDWARE_PRESETS.map((preset) => {
              const isActive = Math.abs(twoQubitErrorPct - preset.errorRatePct) < 0.005;
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`preset-btn ${isActive ? 'preset-btn-active' : ''}`}
                  onClick={() => setTwoQubitErrorPct(preset.errorRatePct)}
                >
                  <span className="preset-name">{preset.label}</span>
                  <span className="preset-sub">{preset.sublabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="panel inspector-panel">
        <div className="inspector-head">
          <h2 className="card-title">Geometry Scrubber</h2>
          <span className="mono-badge">R = {selectedPoint.r.toFixed(3)} A</span>
        </div>

        <div className="slider-group compact">
          <label htmlFor="bond-slider" className="slider-label">
            Bond Length ({spec.formula})
          </label>
          <input
            id="bond-slider"
            type="range"
            min={0}
            max={evalResult.points.length - 1}
            step={1}
            value={safeIndex}
            onChange={(e) => setSelectedIndex(parseInt(e.target.value, 10))}
            className="range-input"
          />
        </div>

        <dl className="metric-list">
          <div className="metric-row">
            <dt>Exact FCI</dt>
            <dd className="mono-val text-fci">{selectedPoint.fci.toFixed(5)} Ha</dd>
          </div>
          <div className="metric-row">
            <dt>Hartree-Fock (RHF)</dt>
            <dd className="mono-val text-rhf">
              {selectedPoint.rhf.toFixed(5)} Ha ({selectedPoint.rhfErrorMHa.toFixed(2)} mHa)
            </dd>
          </div>
          <div className="metric-row">
            <dt>Noiseless VQE</dt>
            <dd className="mono-val text-ideal">
              {selectedPoint.vqeNoiseless.toFixed(5)} Ha ({selectedPoint.vqeNoiselessErrorMHa.toFixed(2)} mHa)
            </dd>
          </div>
          <div className="metric-row">
            <dt>Noisy NISQ VQE</dt>
            <dd className="mono-val text-noisy">
              {selectedPoint.vqeNoisy.toFixed(5)} Ha ({selectedPoint.vqeNoisyErrorMHa.toFixed(2)} mHa)
            </dd>
          </div>
        </dl>

        <details className="editorial-details compact-details">
          <summary>Basis &amp; reference metadata</summary>
          <div className="details-body">
            <p><strong>Active Space:</strong> {spec.activeSpace}</p>
            <p><strong>Reference:</strong> {spec.reference}</p>
          </div>
        </details>
      </div>
    </aside>
  );

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <div className="brand-block">
            <span className="eyebrow">Quantum Chemistry Benchmarker</span>
            <h1 className="site-title">2-Qubit VQE Circuit &amp; Noise Simulator</h1>
            <p className="site-byline">
              Mohammed KM &middot; Client-side STO-3G statevector simulation vs. exact FCI ground truth
            </p>
          </div>

          <div className="molecule-toggle" role="group" aria-label="Select molecule">
            {(['H2', 'LiH'] as MoleculeId[]).map((id) => {
              const m = MOLECULES[id];
              const active = id === moleculeId;
              return (
                <button
                  key={id}
                  type="button"
                  className={`toggle-btn ${active ? 'toggle-btn-active' : ''}`}
                  onClick={() => handleSelectMolecule(id)}
                  aria-pressed={active}
                >
                  <span className="toggle-formula">{m.formula}</span>
                  <span className="toggle-meta">{m.basis}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="main-container">
        {/* Top KPI Telemetry Strip */}
        <section className="kpi-grid" aria-label="Live benchmark metrics">
          <div className="kpi-card">
            <span className="kpi-label">Circuit Fidelity (F)</span>
            <span className="kpi-value">
              {(evalResult.circuitFidelity * 100).toFixed(2)}%
            </span>
            <span className="kpi-sub">
              {evalResult.totalTwoQubitGates} 2Q gates &middot; {spec.qubits}q active
            </span>
          </div>

          <div className="kpi-card">
            <span className="kpi-label">Noisy VQE Err @ R_eq</span>
            <span
              className={`kpi-value ${
                evalResult.eqPoint.beatsChemicalAccuracy ? 'text-pass' : 'text-fail'
              }`}
            >
              {evalResult.eqPoint.vqeNoisyErrorMHa.toFixed(2)} mHa
            </span>
            <span className="kpi-sub">
              Cutoff: {CHEMICAL_ACCURACY_MHA.toFixed(1)} mHa
            </span>
          </div>

          <div className="kpi-card">
            <span className="kpi-label">Max 2Q Err for 1.6 mHa</span>
            <span className="kpi-value text-accent">
              {evalResult.maxAllowedErrorPctAtEq.toFixed(4)}%
            </span>
            <span className="kpi-sub">
              Noise wall at depth {circuitDepth}
            </span>
          </div>

          <div className="kpi-card">
            <span className="kpi-label">Curve Within 1.6 mHa</span>
            <span className="kpi-value">
              {Math.round(evalResult.fractionWithinChemAcc * 100)}%
            </span>
            <span className="kpi-sub">
              {evalResult.points.filter((p) => p.beatsChemicalAccuracy).length}/{evalResult.points.length} geometries
            </span>
          </div>
        </section>

        {/* Primary View Tabs */}
        <nav className="tab-bar" role="tablist" aria-label="Benchmark views">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'simulator'}
            className={`tab-btn ${activeTab === 'simulator' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('simulator')}
          >
            Live VQE Simulator
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'pes'}
            className={`tab-btn ${activeTab === 'pes' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('pes')}
          >
            Dissociation Curves (PES)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'data'}
            className={`tab-btn ${activeTab === 'data' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('data')}
          >
            Benchmark Data &amp; Verdict
          </button>
        </nav>

        {/* Tab 1: Live 2-Qubit VQE Circuit & Noise Simulator */}
        {activeTab === 'simulator' && (
          <section className="workspace-grid" aria-label="Live VQE simulator workspace">
            <div className="charts-column">
              <div className="panel">
                <LiveVQESimulator
                  spec={spec}
                  point={selectedPoint}
                  twoQubitErrorPct={twoQubitErrorPct}
                  circuitDepth={circuitDepth}
                  totalTwoQubitGates={evalResult.totalTwoQubitGates}
                  circuitFidelity={evalResult.circuitFidelity}
                />
              </div>
            </div>
            {controlsSidebar}
          </section>
        )}

        {/* Tab 2: Potential Energy Surface & Error Charts */}
        {activeTab === 'pes' && (
          <section className="workspace-grid" aria-label="Potential energy surface workspace">
            <div className="charts-column">
              <div className="panel">
                <PESChart
                  spec={spec}
                  points={evalResult.points}
                  selectedIndex={safeIndex}
                  onSelectIndex={setSelectedIndex}
                />
              </div>

              <div className="panel">
                <NoiseErrorChart
                  spec={spec}
                  points={evalResult.points}
                  selectedIndex={safeIndex}
                  onSelectIndex={setSelectedIndex}
                />
              </div>
            </div>
            {controlsSidebar}
          </section>
        )}

        {/* Tab 3: Engineering Verdict + Full STO-3G Table */}
        {activeTab === 'data' && (
          <div className="data-tab-stack">
            <EngineeringVerdict
              spec={spec}
              twoQubitErrorPct={twoQubitErrorPct}
              circuitDepth={circuitDepth}
              totalTwoQubitGates={evalResult.totalTwoQubitGates}
              circuitFidelity={evalResult.circuitFidelity}
              maxAllowedErrorPctAtEq={evalResult.maxAllowedErrorPctAtEq}
              eqPoint={evalResult.eqPoint}
              stretchedPoint={evalResult.stretchedPoint}
              fractionWithinChemAcc={evalResult.fractionWithinChemAcc}
            />

            <section className="panel table-section" aria-labelledby="table-heading">
              <div className="table-head-row">
                <div>
                  <h2 id="table-heading" className="card-title">
                    Published STO-3G Dissociation Table ({spec.formula})
                  </h2>
                  <p className="card-subtitle">
                    Tap any row to set the active geometry across the simulator and PES charts.
                  </p>
                </div>
              </div>

              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>R (A)</th>
                      <th>Exact FCI (Ha)</th>
                      <th>Hartree-Fock (Ha)</th>
                      <th>Noiseless VQE (Ha)</th>
                      <th>Noisy VQE (Ha)</th>
                      <th>RHF Err (mHa)</th>
                      <th>Noisy Err (mHa)</th>
                      <th>1.6 mHa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evalResult.points.map((pt, idx) => {
                      const isSelected = idx === safeIndex;
                      return (
                        <tr
                          key={pt.r}
                          className={isSelected ? 'row-selected' : ''}
                          onClick={() => setSelectedIndex(idx)}
                        >
                          <td className="mono-cell">{pt.r.toFixed(3)}</td>
                          <td className="mono-cell">{pt.fci.toFixed(5)}</td>
                          <td className="mono-cell">{pt.rhf.toFixed(5)}</td>
                          <td className="mono-cell">{pt.vqeNoiseless.toFixed(5)}</td>
                          <td className="mono-cell">{pt.vqeNoisy.toFixed(5)}</td>
                          <td className="mono-cell">{pt.rhfErrorMHa.toFixed(2)}</td>
                          <td className="mono-cell">{pt.vqeNoisyErrorMHa.toFixed(2)}</td>
                          <td>
                            <span
                              className={`table-status ${
                                pt.beatsChemicalAccuracy ? 'status-pass' : 'status-fail'
                              }`}
                            >
                              {pt.beatsChemicalAccuracy ? 'PASS' : 'FAIL'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>

      <footer className="site-footer">
        <p>
          Quantum vs Classical Molecular Benchmarker &middot; Mohammed KM &middot; 100% client-side STO-3G PySCF / VQE benchmark, zero external APIs.
        </p>
      </footer>
    </div>
  );
};

export default App;
