import './styles.css';
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
        <h2 className="card-title">Noise and circuit controls</h2>
        <p className="card-subtitle">
          Today's quantum chips are noisy (NISQ: noisy, intermediate-scale quantum). Change how noisy each step is and how long the circuit is, and watch the answer get better or worse.
        </p>

        <div className="slider-group">
          <div className="slider-header">
            <label htmlFor="error-slider" className="slider-label">
              Error per two-qubit step (p_2q)
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
          <p className="q-hint">How often each operation that links the two qubits (quantum bits) goes wrong. Lower is better.</p>
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
              Circuit length (ansatz depth, layers)
            </label>
            <span className="slider-readout">
              {circuitDepth} ({evalResult.totalTwoQubitGates} two-qubit steps)
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
          <p className="q-hint">The ansatz is the adjustable circuit recipe the computer tunes. More layers means more steps, so more chances for errors to pile up.</p>
          <div className="slider-ticks">
            <span>2</span>
            <span>12</span>
            <span>24 layers</span>
          </div>
        </div>

        <div className="presets-block">
          <span className="presets-label">Real hardware noise levels (presets)</span>
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
          <h2 className="card-title">Pick a bond length</h2>
          <span className="mono-badge">R = {selectedPoint.r.toFixed(3)} Å</span>
        </div>

        <div className="slider-group compact">
          <label htmlFor="bond-slider" className="slider-label">
            Distance between the atoms, bond length ({spec.formula})
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

        <p className="q-hint">Energies in Hartree (Ha), the natural unit of energy for atoms. Brackets show the miss from the exact answer in mHa (milli-Hartree, a thousandth of a Hartree). Under 1.6 mHa counts as chemical accuracy: good enough to predict real chemistry.</p>
        <dl className="metric-list">
          <div className="metric-row">
            <dt>Exact answer (FCI)</dt>
            <dd className="mono-val text-fci">{selectedPoint.fci.toFixed(5)} Ha</dd>
          </div>
          <div className="metric-row">
            <dt>Quick classical estimate (Hartree-Fock)</dt>
            <dd className="mono-val text-rhf">
              {selectedPoint.rhf.toFixed(5)} Ha ({selectedPoint.rhfErrorMHa.toFixed(2)} mHa)
            </dd>
          </div>
          <div className="metric-row">
            <dt>Quantum, perfect chip (noiseless VQE)</dt>
            <dd className="mono-val text-ideal">
              {selectedPoint.vqeNoiseless.toFixed(5)} Ha ({selectedPoint.vqeNoiselessErrorMHa.toFixed(2)} mHa)
            </dd>
          </div>
          <div className="metric-row">
            <dt>Quantum, noisy chip (noisy VQE)</dt>
            <dd className="mono-val text-noisy">
              {selectedPoint.vqeNoisy.toFixed(5)} Ha ({selectedPoint.vqeNoisyErrorMHa.toFixed(2)} mHa)
            </dd>
          </div>
        </dl>

        <details className="editorial-details compact-details">
          <summary>Model size and sources (basis set, active space)</summary>
          <div className="details-body">
            <p><strong>Electrons and orbitals simulated (active space):</strong> {spec.activeSpace}</p>
            <p><strong>Source:</strong> {spec.reference}</p>
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
            <h2 className="module-heading">Can a small quantum computer get chemistry right?</h2>
            <p className="site-byline">A simulated 2-qubit quantum computer runs VQE (a way to estimate a molecule's energy on a quantum computer) in your browser. Its answers are scored against published exact energies for the simple STO-3G model of each molecule (a small, standard set of building blocks for electron clouds).</p>
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
            <span className="kpi-label">Chance the circuit runs clean (fidelity, F)</span>
            <span className="kpi-value">
              {(evalResult.circuitFidelity * 100).toFixed(2)}%
            </span>
            <span className="kpi-sub">
              {evalResult.totalTwoQubitGates} two-qubit steps &middot; {spec.qubits} qubits
            </span>
          </div>

          <div className="kpi-card">
            <span className="kpi-label">Noisy chip's miss at natural bond length</span>
            <span
              className={`kpi-value ${
                evalResult.eqPoint.beatsChemicalAccuracy ? 'text-pass' : 'text-fail'
              }`}
            >
              {evalResult.eqPoint.vqeNoisyErrorMHa.toFixed(2)} mHa
            </span>
            <span className="kpi-sub">
              Goal: under {CHEMICAL_ACCURACY_MHA.toFixed(1)} mHa (chemical accuracy)
            </span>
          </div>

          <div className="kpi-card">
            <span className="kpi-label">Highest step error that still hits 1.6 mHa</span>
            <span className="kpi-value text-accent">
              {evalResult.maxAllowedErrorPctAtEq.toFixed(4)}%
            </span>
            <span className="kpi-sub">
              The noise wall at {circuitDepth} layers
            </span>
          </div>

          <div className="kpi-card">
            <span className="kpi-label">Bond lengths within 1.6 mHa</span>
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
            Run the quantum circuit
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'pes'}
            className={`tab-btn ${activeTab === 'pes' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('pes')}
          >
            Energy vs bond length (PES)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'data'}
            className={`tab-btn ${activeTab === 'data' ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab('data')}
          >
            Verdict and data table
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
                    Energy at each bond length, published STO-3G values ({spec.formula})
                  </h2>
                  <p className="card-subtitle">
                    Energies in Hartree (Ha), errors in mHa. FCI is the exact answer, Hartree-Fock a quick classical estimate. Tap any row to use that bond length in the other views.
                  </p>
                </div>
              </div>

              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Bond length R (Å)</th>
                      <th>Exact, FCI (Ha)</th>
                      <th>Hartree-Fock (Ha)</th>
                      <th>Noiseless VQE (Ha)</th>
                      <th>Noisy VQE (Ha)</th>
                      <th>Hartree-Fock miss (mHa)</th>
                      <th>Noisy VQE miss (mHa)</th>
                      <th>Under 1.6 mHa?</th>
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

    </div>
  );
};

export default App;
