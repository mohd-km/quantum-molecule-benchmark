import React, { useMemo, useState } from 'react';
import {
  CHEMICAL_ACCURACY_MHA,
  HARDWARE_PRESETS,
  MOLECULES,
  MoleculeId,
  evaluateMoleculePES,
} from './data/molecules';
import { PESChart } from './components/PESChart';
import { NoiseErrorChart } from './components/NoiseErrorChart';
import { EngineeringVerdict } from './components/EngineeringVerdict';

export const App: React.FC = () => {
  const [moleculeId, setMoleculeId] = useState<MoleculeId>('H2');
  const [twoQubitErrorPct, setTwoQubitErrorPct] = useState<number>(0.15);
  const [circuitDepth, setCircuitDepth] = useState<number>(MOLECULES.H2.defaultDepth);
  const [selectedIndex, setSelectedIndex] = useState<number>(4);

  const spec = MOLECULES[moleculeId];

  const handleSelectMolecule = (id: MoleculeId) => {
    setMoleculeId(id);
    setCircuitDepth(MOLECULES[id].defaultDepth);
    // Select equilibrium index by default
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

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <div className="brand-block">
            <span className="eyebrow">Computational Chemistry Benchmark Suite</span>
            <h1 className="site-title">Quantum vs Classical Molecular Benchmarker</h1>
            <p className="site-byline">
              By <strong>Mohammed KM</strong> &middot; 100% client-side STO-3G dissociation physics (PySCF / VQE ground truth)
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
              {evalResult.totalTwoQubitGates} two-qubit gates ({spec.qubits} qubits)
            </span>
          </div>

          <div className="kpi-card">
            <span className="kpi-label">Noisy VQE Error @ R_eq</span>
            <span
              className={`kpi-value ${
                evalResult.eqPoint.beatsChemicalAccuracy ? 'text-pass' : 'text-fail'
              }`}
            >
              {evalResult.eqPoint.vqeNoisyErrorMHa.toFixed(2)} mHa
            </span>
            <span className="kpi-sub">
              Limit: {CHEMICAL_ACCURACY_MHA.toFixed(1)} mHa (1.0 kcal/mol)
            </span>
          </div>

          <div className="kpi-card">
            <span className="kpi-label">Max 2Q Error for 1.6 mHa</span>
            <span className="kpi-value text-accent">
              {evalResult.maxAllowedErrorPctAtEq.toFixed(4)}%
            </span>
            <span className="kpi-sub">
              Exact noise wall at depth {circuitDepth}
            </span>
          </div>

          <div className="kpi-card">
            <span className="kpi-label">Curve Within 1.6 mHa</span>
            <span className="kpi-value">
              {Math.round(evalResult.fractionWithinChemAcc * 100)}%
            </span>
            <span className="kpi-sub">
              {evalResult.points.filter((p) => p.beatsChemicalAccuracy).length} of{' '}
              {evalResult.points.length} bond lengths
            </span>
          </div>
        </section>

        {/* Primary Dashboard Grid: Charts (left) + Hardware Controls & Inspector (right) */}
        <section className="workspace-grid">
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

          <aside className="controls-column">
            {/* Hardware Noise Controls */}
            <div className="panel control-panel">
              <h2 className="card-title">NISQ Hardware Noise Model</h2>
              <p className="card-subtitle">
                Depolarizing channel F = (1 - p_2q)^N_2q shifting VQE energy toward Tr(H)/2^n.
              </p>

              <div className="slider-group">
                <div className="slider-header">
                  <label htmlFor="error-slider" className="slider-label">
                    2-Qubit Gate Error Rate (p_2q)
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
                    Ansatz Circuit Depth (Layers)
                  </label>
                  <span className="slider-readout">
                    {circuitDepth} ({evalResult.totalTwoQubitGates} 2Q gates)
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
                  <span>2 layers</span>
                  <span>12 layers</span>
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

            {/* Selected Bond Length Inspector */}
            <div className="panel inspector-panel">
              <div className="inspector-head">
                <h2 className="card-title">Geometry Inspector</h2>
                <span className="mono-badge">R = {selectedPoint.r.toFixed(3)} A</span>
              </div>

              <div className="slider-group compact">
                <label htmlFor="bond-slider" className="slider-label">
                  Scrub Bond Length
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
                  <dt>Exact FCI (Ground Truth)</dt>
                  <dd className="mono-val text-fci">{selectedPoint.fci.toFixed(5)} Ha</dd>
                </div>
                <div className="metric-row">
                  <dt>Hartree-Fock (RHF)</dt>
                  <dd className="mono-val text-rhf">
                    {selectedPoint.rhf.toFixed(5)} Ha ({selectedPoint.rhfErrorMHa.toFixed(2)} mHa)
                  </dd>
                </div>
                <div className="metric-row">
                  <dt>Noiseless VQE (UCCSD)</dt>
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
                <div className="metric-row">
                  <dt>Active Space</dt>
                  <dd className="meta-val">{spec.activeSpace}</dd>
                </div>
                <div className="metric-row">
                  <dt>Reference Source</dt>
                  <dd className="meta-val">{spec.reference}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </section>

        {/* Class-I Engineering Verdict */}
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

        {/* Full Numerical Dissociation Table (Scrollable on Mobile) */}
        <section className="panel table-section" aria-labelledby="table-heading">
          <div className="table-head-row">
            <div>
              <h2 id="table-heading" className="card-title">
                Published STO-3G Dissociation Table ({spec.formula})
              </h2>
              <p className="card-subtitle">
                Tap any row to highlight that geometry on the PES and error charts.
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
                  <th>Noisy VQE Err (mHa)</th>
                  <th>1.6 mHa Status</th>
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
      </main>

      <footer className="site-footer">
        <p>
          Quantum vs Classical Molecular Benchmarker &middot; Engineered by Mohammed KM &middot; All curves computed client-side from published STO-3G PySCF / VQE benchmarks with zero external API calls.
        </p>
      </footer>
    </div>
  );
};

export default App;
