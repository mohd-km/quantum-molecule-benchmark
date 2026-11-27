import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CHEMICAL_ACCURACY_MHA,
  EvaluatedPoint,
  MoleculeSpec,
} from '../data/molecules';
import {
  VQEStepSnapshot,
  buildHamiltonian2Q,
  createInitialVQESnapshot,
  runVQEOptimizationStep,
} from '../sim/vqe2qubit';

interface LiveVQESimulatorProps {
  spec: MoleculeSpec;
  point: EvaluatedPoint;
  twoQubitErrorPct: number;
  circuitDepth: number;
  totalTwoQubitGates: number;
  circuitFidelity: number;
}

const MAX_STEPS = 40;
const BASIS_LABELS = ['|00>', '|01>', '|10>', '|11>'] as const;

export const LiveVQESimulator: React.FC<LiveVQESimulatorProps> = ({
  spec,
  point,
  twoQubitErrorPct,
  circuitDepth,
  totalTwoQubitGates,
  circuitFidelity,
}) => {
  const ham = useMemo(() => buildHamiltonian2Q(spec, point), [spec, point]);

  const [history, setHistory] = useState<VQEStepSnapshot[]>(() => [
    createInitialVQESnapshot(ham, circuitDepth, circuitFidelity),
  ]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);

  // Reset trajectory when molecule or bond length changes
  useEffect(() => {
    setIsRunning(false);
    setHistory([createInitialVQESnapshot(ham, circuitDepth, circuitFidelity)]);
  }, [ham]);

  // Re-evaluate noisy floor & probabilities instantaneously when noise/depth changes
  const liveHistory = useMemo(() => {
    const F = Math.max(0, Math.min(1, circuitFidelity));
    return history.map((snap) => {
      const energyNoisy = F * snap.energyIdeal + (1 - F) * ham.mixedEnergy;
      const noisyProbs: [number, number, number, number] = [
        F * snap.idealProbs[0] + (1 - F) * 0.25,
        F * snap.idealProbs[1] + (1 - F) * 0.25,
        F * snap.idealProbs[2] + (1 - F) * 0.25,
        F * snap.idealProbs[3] + (1 - F) * 0.25,
      ];
      return {
        ...snap,
        fidelity: F,
        energyNoisy,
        errorNoisyMHa: Math.abs(energyNoisy - ham.exactGroundEnergy) * 1000,
        noisyProbs,
      };
    });
  }, [history, circuitFidelity, ham.mixedEnergy, ham.exactGroundEnergy]);

  const current = liveHistory[liveHistory.length - 1];
  const isComplete = current.step >= MAX_STEPS;

  const advanceOneStep = () => {
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      if (last.step >= MAX_STEPS) {
        setIsRunning(false);
        return prev;
      }
      const { snapshot } = runVQEOptimizationStep(
        last.params,
        ham,
        circuitDepth,
        circuitFidelity,
        last.step + 1,
        0.72
      );
      if (snapshot.step >= MAX_STEPS) {
        setIsRunning(false);
      }
      return [...prev, snapshot];
    });
  };

  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = window.setInterval(() => {
      advanceOneStep();
    }, 65);

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, ham, circuitDepth, circuitFidelity]);

  const handleRunToggle = () => {
    if (isRunning) {
      setIsRunning(false);
      return;
    }
    if (isComplete) {
      setHistory([createInitialVQESnapshot(ham, circuitDepth, circuitFidelity)]);
    }
    setIsRunning(true);
  };

  const handleReset = () => {
    setIsRunning(false);
    setHistory([createInitialVQESnapshot(ham, circuitDepth, circuitFidelity)]);
  };

  // Convergence SVG geometry
  const width = 760;
  const height = 285;
  const pad = { top: 24, right: 24, bottom: 44, left: 72 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const allEnergies = [
    ham.exactGroundEnergy,
    ham.rhfEnergy,
    ...liveHistory.flatMap((s) => [s.energyIdeal, s.energyNoisy]),
  ];
  const minE = Math.min(...allEnergies);
  const maxE = Math.max(...allEnergies);
  const spanE = Math.max(0.025, maxE - minE);
  const yMin = minE - spanE * 0.14;
  const yMax = maxE + spanE * 0.14;

  const xScale = (step: number) => pad.left + (step / MAX_STEPS) * plotW;
  const yScale = (e: number) => pad.top + plotH - ((e - yMin) / (yMax - yMin)) * plotH;

  const idealPath = liveHistory
    .map((s, i) => `${i === 0 ? 'M' : 'L'} ${xScale(s.step).toFixed(2)} ${yScale(s.energyIdeal).toFixed(2)}`)
    .join(' ');
  const noisyPath = liveHistory
    .map((s, i) => `${i === 0 ? 'M' : 'L'} ${xScale(s.step).toFixed(2)} ${yScale(s.energyNoisy).toFixed(2)}`)
    .join(' ');

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) => yMin + ((yMax - yMin) * i) / (yTicks - 1));
  const xTickValues = [0, 10, 20, 30, 40];

  const fciY = yScale(ham.exactGroundEnergy);
  const rhfY = yScale(ham.rhfEnergy);
  const chemBandTop = Math.min(yScale(ham.exactGroundEnergy + 0.0016), fciY - 3);
  const chemBandHeight = Math.max(6, Math.abs(yScale(ham.exactGroundEnergy - 0.0016) - chemBandTop));

  const theta0 = current.params[0] ?? 0;
  const theta1 = current.params[1] ?? 0;
  const passesChemAcc = current.errorNoisyMHa <= CHEMICAL_ACCURACY_MHA;

  return (
    <div className="vqe-sim-stack">
      {/* Top Action Bar */}
      <div className="sim-toolbar">
        <div className="sim-title-group">
          <h2 className="card-title">
            Live 2-Qubit VQE Circuit &amp; Noise Simulator ({spec.formula} @ R = {point.r.toFixed(2)} A)
          </h2>
          <p className="card-subtitle">
            Dial gate noise or depth, then run optimization to watch statevector VQE converge against exact FCI.
          </p>
        </div>

        <div className="sim-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={handleRunToggle}
          >
            {isRunning ? 'Pause' : isComplete ? 'Re-Run Optimization' : 'Run Optimization'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={advanceOneStep}
            disabled={isRunning || isComplete}
          >
            Step
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleReset}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Crisp Paper-White Scientific Instrument Box: 2-Qubit Circuit + Live Statevector Readout */}
      <div className="instrument-figure">
        <div className="instrument-head">
          <span className="instrument-tag">
            2-Qubit Statevector Engine &middot; Parameter-Shift Gradient
          </span>
          <span className="instrument-metrics">
            Iter <strong>{current.step}/{MAX_STEPS}</strong> &middot; Fidelity{' '}
            <strong>{(circuitFidelity * 100).toFixed(2)}%</strong> &middot; p_2q{' '}
            <strong>{twoQubitErrorPct.toFixed(2)}%</strong>
          </span>
        </div>

        <div className="instrument-body">
          {/* Live 2-Qubit Quantum Circuit Diagram */}
          <div className="circuit-pane">
            <svg
              viewBox="0 0 560 156"
              className="circuit-svg"
              role="img"
              aria-label="Live 2-qubit parameterized VQE quantum circuit"
            >
              {/* Qubit wires */}
              <line x1="56" y1="48" x2="516" y2="48" stroke="#a3a39e" strokeWidth="1.5" />
              <line x1="56" y1="108" x2="516" y2="108" stroke="#a3a39e" strokeWidth="1.5" />

              {/* Qubit labels */}
              <text x="16" y="52" fill="#111111" fontSize="13" fontWeight="500" fontFamily="var(--font-mono)">
                q0 |0&gt;
              </text>
              <text x="16" y="112" fill="#111111" fontSize="13" fontWeight="500" fontFamily="var(--font-mono)">
                q1 |0&gt;
              </text>

              {/* Hartree-Fock Prep Gate X on q1 */}
              <rect x="74" y="92" width="32" height="32" rx="5" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.4" />
              <text x="90" y="113" textAnchor="middle" fill="#1d4ed8" fontSize="13" fontWeight="600" fontFamily="var(--font-mono)">
                X
              </text>
              <text x="90" y="140" textAnchor="middle" fill="#737373" fontSize="10" fontFamily="var(--font-mono)">
                HF |01&gt;
              </text>

              {/* Variational Layer Bracket */}
              <rect
                x="126"
                y="18"
                width="302"
                height="112"
                rx="7"
                fill="rgba(29, 78, 216, 0.03)"
                stroke={isRunning ? '#1d4ed8' : '#d4d4d0'}
                strokeWidth="1.2"
                strokeDasharray="4 3"
              />
              <text
                x="277"
                y="145"
                textAnchor="middle"
                fill="#555555"
                fontSize="10.5"
                fontFamily="var(--font-mono)"
              >
                Ansatz Block x {circuitDepth} layers ({totalTwoQubitGates} 2Q gates)
              </text>

              {/* RY(theta1) on q1 */}
              <rect
                x="142"
                y="90"
                width="68"
                height="36"
                rx="5"
                fill="#ffffff"
                stroke="#1d4ed8"
                strokeWidth="1.4"
              />
              <text x="176" y="106" textAnchor="middle" fill="#111111" fontSize="11" fontWeight="600" fontFamily="var(--font-mono)">
                RY(θ1)
              </text>
              <text x="176" y="120" textAnchor="middle" fill="#1d4ed8" fontSize="10" fontFamily="var(--font-mono)">
                {theta1.toFixed(2)}
              </text>

              {/* First CNOT(0->1) */}
              <line x1="238" y1="48" x2="238" y2="116" stroke="#b91c1c" strokeWidth="1.7" />
              <circle cx="238" cy="48" r="4.8" fill="#b91c1c" />
              <circle cx="238" cy="108" r="9" fill="#ffffff" stroke="#b91c1c" strokeWidth="1.7" />
              <line x1="232" y1="108" x2="244" y2="108" stroke="#b91c1c" strokeWidth="1.5" />
              <line x1="238" y1="102" x2="238" y2="114" stroke="#b91c1c" strokeWidth="1.5" />

              {/* RY(theta0) on q0 */}
              <rect
                x="270"
                y="30"
                width="76"
                height="36"
                rx="5"
                fill="#ffffff"
                stroke="#15803d"
                strokeWidth="1.4"
              />
              <text x="308" y="46" textAnchor="middle" fill="#111111" fontSize="11" fontWeight="600" fontFamily="var(--font-mono)">
                RY(θ0)
              </text>
              <text x="308" y="60" textAnchor="middle" fill="#15803d" fontSize="10" fontFamily="var(--font-mono)">
                {theta0.toFixed(2)}
              </text>

              {/* Second CNOT(0->1) */}
              <line x1="376" y1="48" x2="376" y2="116" stroke="#b91c1c" strokeWidth="1.7" />
              <circle cx="376" cy="48" r="4.8" fill="#b91c1c" />
              <circle cx="376" cy="108" r="9" fill="#ffffff" stroke="#b91c1c" strokeWidth="1.7" />
              <line x1="370" y1="108" x2="382" y2="108" stroke="#b91c1c" strokeWidth="1.5" />
              <line x1="376" y1="102" x2="376" y2="114" stroke="#b91c1c" strokeWidth="1.5" />

              {/* Depolarizing Noise Channel Marker */}
              <rect x="444" y="34" width="44" height="88" rx="5" fill="#fffbeb" stroke="#b45309" strokeWidth="1.3" strokeDasharray="3 2" />
              <text x="466" y="72" textAnchor="middle" fill="#b45309" fontSize="10" fontWeight="600" fontFamily="var(--font-mono)">
                Λ(F)
              </text>
              <text x="466" y="88" textAnchor="middle" fill="#92400e" fontSize="9.5" fontFamily="var(--font-mono)">
                {(circuitFidelity * 100).toFixed(0)}%
              </text>

              {/* Measurement Block */}
              <rect x="504" y="34" width="42" height="88" rx="5" fill="#fafaf9" stroke="#111111" strokeWidth="1.3" />
              <text x="525" y="74" textAnchor="middle" fill="#111111" fontSize="11" fontWeight="600" fontFamily="var(--font-mono)">
                &lt;H&gt;
              </text>
              <text x="525" y="90" textAnchor="middle" fill="#555555" fontSize="9.5" fontFamily="var(--font-mono)">
                Pauli
              </text>
            </svg>
          </div>

          {/* Live Statevector Basis Probabilities */}
          <div className="statevector-pane">
            <div className="statevector-header">
              <span>Basis State Probabilities</span>
              <span className="sv-legend">
                <i className="sv-dot sv-dot-ideal" /> Ideal |ψ|²
                <i className="sv-dot sv-dot-noisy" /> Noisy ρ_ii
              </span>
            </div>
            <div className="sv-bars">
              {BASIS_LABELS.map((label, idx) => {
                const idealPct = current.idealProbs[idx] * 100;
                const noisyPct = current.noisyProbs[idx] * 100;
                return (
                  <div key={label} className="sv-row">
                    <span className="sv-ket">{label}</span>
                    <div className="sv-track-pair">
                      <div className="sv-track">
                        <div className="sv-fill-ideal" style={{ width: `${Math.min(100, idealPct)}%` }} />
                      </div>
                      <div className="sv-track">
                        <div className="sv-fill-noisy" style={{ width: `${Math.min(100, noisyPct)}%` }} />
                      </div>
                    </div>
                    <span className="sv-pct">{noisyPct.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Live Convergence Plot (Clean White Editorial Figure) */}
      <div className="convergence-card">
        <div className="chart-header">
          <div>
            <h3 className="subcard-title">VQE Ground-State Energy Convergence</h3>
            <p className="card-subtitle">
              Step-by-step optimization vs. exact classical FCI ({ham.exactGroundEnergy.toFixed(5)} Ha) and RHF ({ham.rhfEnergy.toFixed(5)} Ha).
            </p>
          </div>
          <div className={`status-pill ${passesChemAcc ? 'pill-pass' : 'pill-fail'}`}>
            {passesChemAcc
              ? `PASS · ${current.errorNoisyMHa.toFixed(2)} mHa`
              : `FAIL · ${current.errorNoisyMHa.toFixed(2)} mHa`}
          </div>
        </div>

        <div className="legend-row" aria-label="Convergence legend">
          <span className="legend-item"><span className="swatch swatch-fci" />Exact FCI</span>
          <span className="legend-item"><span className="swatch swatch-rhf" />Hartree-Fock</span>
          <span className="legend-item"><span className="swatch swatch-vqe-ideal" />Noiseless VQE</span>
          <span className="legend-item"><span className="swatch swatch-vqe-noisy" />Noisy VQE</span>
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="svg-chart"
          role="img"
          aria-label="Live VQE energy convergence chart comparing noisy and noiseless VQE against exact FCI"
        >
          {/* Horizontal gridlines */}
          {yTickValues.map((val, idx) => {
            const y = yScale(val);
            return (
              <g key={`cy-${idx}`}>
                <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#e5e5e3" strokeWidth="1" />
                <text x={pad.left - 10} y={y + 4} textAnchor="end" fill="#555555" fontSize="11.5" fontFamily="var(--font-mono)">
                  {val.toFixed(3)}
                </text>
              </g>
            );
          })}

          {/* Vertical gridlines */}
          {xTickValues.map((step) => {
            const x = xScale(step);
            return (
              <g key={`cx-${step}`}>
                <line x1={x} y1={pad.top} x2={x} y2={height - pad.bottom} stroke="#ececea" strokeWidth="1" strokeDasharray="3 3" />
                <text x={x} y={height - pad.bottom + 18} textAnchor="middle" fill="#555555" fontSize="11.5" fontFamily="var(--font-mono)">
                  {step}
                </text>
              </g>
            );
          })}

          {/* 1.6 mHa chemical accuracy band around Exact FCI */}
          <rect
            x={pad.left}
            y={chemBandTop}
            width={plotW}
            height={chemBandHeight}
            fill="#15803d"
            fillOpacity="0.12"
          />

          {/* Hartree-Fock reference line */}
          <line
            x1={pad.left}
            y1={rhfY}
            x2={width - pad.right}
            y2={rhfY}
            stroke="#b45309"
            strokeWidth="1.8"
            strokeDasharray="6 4"
          />
          <text
            x={width - pad.right - 6}
            y={rhfY - 6}
            textAnchor="end"
            fill="#b45309"
            fontSize="11"
            fontFamily="var(--font-mono)"
          >
            RHF {ham.rhfEnergy.toFixed(4)} Ha
          </text>

          {/* Exact FCI reference line */}
          <line
            x1={pad.left}
            y1={fciY}
            x2={width - pad.right}
            y2={fciY}
            stroke="#1d4ed8"
            strokeWidth="2.2"
          />
          <text
            x={width - pad.right - 6}
            y={fciY + 14}
            textAnchor="end"
            fill="#1d4ed8"
            fontSize="11"
            fontWeight="600"
            fontFamily="var(--font-mono)"
          >
            Exact FCI {ham.exactGroundEnergy.toFixed(4)} Ha (±1.6 mHa band)
          </text>

          {/* Noiseless VQE trajectory */}
          <path
            d={idealPath}
            fill="none"
            stroke="#15803d"
            strokeWidth="2.2"
            strokeDasharray="3 3"
          />

          {/* Noisy VQE trajectory */}
          <path
            d={noisyPath}
            fill="none"
            stroke="#b91c1c"
            strokeWidth="2.6"
          />

          {/* Live current step markers */}
          <circle
            cx={xScale(current.step)}
            cy={yScale(current.energyIdeal)}
            r="4.5"
            fill="#15803d"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <circle
            cx={xScale(current.step)}
            cy={yScale(current.energyNoisy)}
            r="5.5"
            fill="#b91c1c"
            stroke="#ffffff"
            strokeWidth="1.8"
          />

          {/* Axis labels */}
          <text
            x={pad.left + plotW / 2}
            y={height - 8}
            textAnchor="middle"
            fill="#111111"
            fontSize="12"
            fontWeight="600"
          >
            VQE Optimizer Iteration
          </text>
          <text
            x={16}
            y={pad.top + plotH / 2}
            textAnchor="middle"
            fill="#111111"
            fontSize="12"
            fontWeight="600"
            transform={`rotate(-90 16 ${pad.top + plotH / 2})`}
          >
            Energy (Ha)
          </text>
        </svg>

        {/* Live Telemetry Strip under Convergence Chart */}
        <div className="sim-readout-strip">
          <div className="readout-cell">
            <span className="readout-label">Noiseless VQE</span>
            <span className="readout-val text-ideal">{current.energyIdeal.toFixed(5)} Ha</span>
            <span className="readout-sub">Err: {current.errorIdealMHa.toFixed(2)} mHa</span>
          </div>
          <div className="readout-cell">
            <span className="readout-label">Noisy NISQ VQE</span>
            <span className="readout-val text-noisy">{current.energyNoisy.toFixed(5)} Ha</span>
            <span className="readout-sub">Err: {current.errorNoisyMHa.toFixed(2)} mHa</span>
          </div>
          <div className="readout-cell">
            <span className="readout-label">Exact Classical FCI</span>
            <span className="readout-val text-fci">{ham.exactGroundEnergy.toFixed(5)} Ha</span>
            <span className="readout-sub">Target ground state</span>
          </div>
        </div>

        {/* Collapsible Technical Theory Drawer */}
        <details className="editorial-details">
          <summary>Read more: 2-qubit Hamiltonian Pauli terms &amp; noise math</summary>
          <div className="details-body">
            <p>
              The parity-tapered 2-qubit Hamiltonian at R = {point.r.toFixed(3)} A is{' '}
              <code>
                H = {ham.g0.toFixed(4)} I + ({ham.g1.toFixed(4)}) Z0 + ({ham.g2.toFixed(4)}) Z1 + ({ham.g3.toFixed(4)}) Z0Z1 + ({ham.g4.toFixed(4)}) (X0X1 + Y0Y1)
              </code>
              .
            </p>
            <p>
              Each optimization step evaluates exact parameter-shift gradients{' '}
              <code>dE/dθ = 0.5 · [E(θ + π/2) - E(θ - π/2)]</code> on the 4-amplitude complex statevector, while global depolarizing noise mixes the pure state with the maximally mixed state:{' '}
              <code>ρ = F|ψ⟩⟨ψ| + (1 - F) I/4</code>, where <code>F = (1 - p_2q)^N_2q</code>.
            </p>
          </div>
        </details>
      </div>
    </div>
  );
};
