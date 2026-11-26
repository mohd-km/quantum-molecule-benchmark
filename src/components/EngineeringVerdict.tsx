import React from 'react';
import { EvaluatedPoint, MoleculeSpec } from '../data/molecules';

interface EngineeringVerdictProps {
  spec: MoleculeSpec;
  twoQubitErrorPct: number;
  circuitDepth: number;
  totalTwoQubitGates: number;
  circuitFidelity: number;
  maxAllowedErrorPctAtEq: number;
  eqPoint: EvaluatedPoint;
  stretchedPoint: EvaluatedPoint;
  fractionWithinChemAcc: number;
}

export const EngineeringVerdict: React.FC<EngineeringVerdictProps> = ({
  spec,
  twoQubitErrorPct,
  circuitDepth,
  totalTwoQubitGates,
  circuitFidelity,
  maxAllowedErrorPctAtEq,
  eqPoint,
  stretchedPoint,
  fractionWithinChemAcc,
}) => {
  const passesChemAccAtEq = eqPoint.beatsChemicalAccuracy;
  const beatsRhfAtEq = eqPoint.beatsHartreeFock;
  const beatsRhfStretched = stretchedPoint.beatsHartreeFock;

  let verdictTier: 'pass' | 'warn' | 'fail' = 'fail';
  let verdictHeadline = 'NISQ Noise Breaks VQE Advantage';
  let verdictSummary = '';
  let verdictDetail = '';

  if (passesChemAccAtEq && fractionWithinChemAcc >= 0.8) {
    verdictTier = 'pass';
    verdictHeadline = 'Chemical Accuracy Achieved (< 1.6 mHa)';
    verdictSummary = `${eqPoint.vqeNoisyErrorMHa.toFixed(2)} mHa error at equilibrium (F = ${(circuitFidelity * 100).toFixed(2)}%) — requires fault-tolerant logical error rates.`;
    verdictDetail = `At ${twoQubitErrorPct.toFixed(2)}% 2-qubit gate error across ${totalTwoQubitGates} entangling gates (depth ${circuitDepth}, fidelity ${(circuitFidelity * 100).toFixed(2)}%), Noisy VQE stays inside the 1.6 mHa chemical-accuracy corridor at equilibrium (${eqPoint.vqeNoisyErrorMHa.toFixed(2)} mHa). Reaching this regime requires fault-tolerant logical qubits or extreme error suppression.`;
  } else if (beatsRhfAtEq || beatsRhfStretched) {
    verdictTier = 'warn';
    verdictHeadline = 'Fails Chemical Accuracy; Partial Static-Correlation Recovery';
    verdictSummary = `${eqPoint.vqeNoisyErrorMHa.toFixed(2)} mHa at equilibrium (${(eqPoint.vqeNoisyErrorMHa / 1.6).toFixed(1)}x cutoff). Needs p_2q < ${maxAllowedErrorPctAtEq.toFixed(4)}%.`;
    verdictDetail = `Noisy VQE incurs ${eqPoint.vqeNoisyErrorMHa.toFixed(2)} mHa error at equilibrium (exceeding the 1.6 mHa cutoff by ${(eqPoint.vqeNoisyErrorMHa / 1.6).toFixed(1)}x). While it still tracks stretched-bond dissociation better than restricted Hartree-Fock (${stretchedPoint.vqeNoisyErrorMHa.toFixed(1)} mHa vs. RHF ${stretchedPoint.rhfErrorMHa.toFixed(1)} mHa), it cannot support predictive thermochemistry without lowering 2Q error below ${maxAllowedErrorPctAtEq.toFixed(4)}%.`;
  } else {
    verdictTier = 'fail';
    verdictHeadline = 'Noise-Dominated Regime: Worse Than Classical Hartree-Fock';
    verdictSummary = `${eqPoint.vqeNoisyErrorMHa.toFixed(1)} mHa error at equilibrium vs. RHF ${eqPoint.rhfErrorMHa.toFixed(1)} mHa (F = ${(circuitFidelity * 100).toFixed(1)}%).`;
    verdictDetail = `With ${totalTwoQubitGates} two-qubit gates at ${twoQubitErrorPct.toFixed(2)}% error (circuit fidelity ${(circuitFidelity * 100).toFixed(1)}%), depolarizing noise lifts the VQE energy by ${eqPoint.vqeNoisyErrorMHa.toFixed(1)} mHa at equilibrium—worse than mean-field Hartree-Fock (${eqPoint.rhfErrorMHa.toFixed(1)} mHa). Classical CCSD(T) and FCI solve ${spec.formula} (${spec.basis}) in microseconds on a laptop.`;
  }

  return (
    <section className="panel verdict-section" aria-labelledby="verdict-heading">
      <div className="section-head">
        <div>
          <span className="eyebrow">Engineering Verdict</span>
          <h2 id="verdict-heading" className="section-title">
            {verdictHeadline}
          </h2>
        </div>
        <div className={`verdict-badge badge-${verdictTier}`}>
          {verdictTier === 'pass'
            ? 'FTQC REGIME'
            : verdictTier === 'warn'
            ? 'SUB-CHEMICAL NISQ'
            : 'CLASSICAL WINS'}
        </div>
      </div>

      <div className={`live-verdict-banner banner-${verdictTier}`}>
        <p className="live-verdict-copy">{verdictSummary}</p>
      </div>

      <div className="details-stack">
        <details className="editorial-details">
          <summary>Read more: Regime analysis for {spec.formula} at {twoQubitErrorPct.toFixed(2)}% 2Q error</summary>
          <div className="details-body">
            <p>{verdictDetail}</p>
          </div>
        </details>

        <details className="editorial-details">
          <summary>Read more: Verified Engineering Milestones (What is Real)</summary>
          <div className="details-body">
            <ul className="verdict-list">
              <li>
                <strong>Static Correlation at Bond Breaking:</strong> Restricted Hartree-Fock fails qualitatively when stretching covalent bonds (H2 RHF misses dissociation by over 260 mHa at 3.0 A). Ideal UCCSD VQE recovers exact multi-reference behavior naturally.
              </li>
              <li>
                <strong>Hardware-Verified Active Spaces:</strong> Experimental VQE on superconducting and trapped-ion QPUs (O&apos;Malley 2016, Kandala 2017) proved that variational circuits can map molecular Hamiltonians to physical qubits and optimize energies in closed loop.
              </li>
              <li>
                <strong>Error Mitigation Extends Shallow Depth:</strong> Zero-Noise Extrapolation (ZNE) and symmetry verification can cut effective bias by 3x-10x on shallow circuits, turning raw hardware outputs into diagnostic benchmarks.
              </li>
              <li>
                <strong>True Long-Term Target (FTQC + QPE):</strong> Quantum advantage in chemistry is credibly targeted at strongly correlated open-shell active spaces (e.g., FeMoco nitrogenase, transition-metal catalysts) using Fault-Tolerant Quantum Phase Estimation, not minimal-basis VQE.
              </li>
            </ul>
          </div>
        </details>

        <details className="editorial-details">
          <summary>Read more: Quantum Hype vs. Computational Reality</summary>
          <div className="details-body">
            <ul className="verdict-list">
              <li>
                <strong>Zero Speedup on Small Molecules:</strong> STO-3G H2 (2 electrons) and LiH (4 electrons) are solved to exact machine precision in under 5 milliseconds using classical PySCF FCI or CCSD(T) on any consumer CPU.
              </li>
              <li>
                <strong>Exponential Depolarizing Wall:</strong> Fidelity decays as (1 - p_2q)^N_2q. As ansatz depth grows for realistic basis sets (cc-pVDZ/TZ), unmitigated NISQ noise washes out the 1.6 mHa chemical-accuracy signal long before classical hardness begins.
              </li>
              <li>
                <strong>Measurement Shot Bottleneck:</strong> Estimating molecular Hamiltonians with O(N^4) Pauli terms to 1.6 mHa precision via VQE requires billions of circuit evaluations per geometry step, eliminating wall-clock competitiveness on NISQ devices.
              </li>
              <li>
                <strong>Barren Plateaus &amp; Optimizer Cost:</strong> Deep hardware-efficient ansatze suffer exponentially vanishing gradients, making classical outer-loop parameter optimization intractable without chemically informed initialization.
              </li>
            </ul>
          </div>
        </details>
      </div>
    </section>
  );
};
