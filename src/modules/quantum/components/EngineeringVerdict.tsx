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
  let verdictHeadline = 'Noise wipes out the quantum advantage';
  let verdictSummary = '';
  let verdictDetail = '';

  if (passesChemAccAtEq && fractionWithinChemAcc >= 0.8) {
    verdictTier = 'pass';
    verdictHeadline = 'Chemical accuracy reached (under 1.6 mHa)';
    verdictSummary = `Off by only ${eqPoint.vqeNoisyErrorMHa.toFixed(2)} mHa at the natural bond length (fidelity ${(circuitFidelity * 100).toFixed(2)}%). Getting chips this clean needs error-corrected (fault-tolerant) qubits.`;
    verdictDetail = `At ${twoQubitErrorPct.toFixed(2)}% 2-qubit gate error across ${totalTwoQubitGates} entangling gates (depth ${circuitDepth}, fidelity ${(circuitFidelity * 100).toFixed(2)}%), the noisy chip stays inside the 1.6 mHa chemical-accuracy band at the natural bond length (${eqPoint.vqeNoisyErrorMHa.toFixed(2)} mHa). Getting there in practice needs error-corrected qubits or extremely clean hardware.`;
  } else if (beatsRhfAtEq || beatsRhfStretched) {
    verdictTier = 'warn';
    verdictHeadline = 'Not accurate enough yet, but beats the quick classical estimate somewhere';
    verdictSummary = `Off by ${eqPoint.vqeNoisyErrorMHa.toFixed(2)} mHa at the natural bond length, ${(eqPoint.vqeNoisyErrorMHa / 1.6).toFixed(1)}x the 1.6 mHa goal. Each two-qubit step would need an error rate below ${maxAllowedErrorPctAtEq.toFixed(4)}%.`;
    verdictDetail = `The noisy chip misses by ${eqPoint.vqeNoisyErrorMHa.toFixed(2)} mHa at the natural bond length (${(eqPoint.vqeNoisyErrorMHa / 1.6).toFixed(1)}x the 1.6 mHa goal). It still handles a stretched, breaking bond better than the quick Hartree-Fock estimate (${stretchedPoint.vqeNoisyErrorMHa.toFixed(1)} mHa vs ${stretchedPoint.rhfErrorMHa.toFixed(1)} mHa), but it cannot predict real chemistry until each two-qubit step's error is below ${maxAllowedErrorPctAtEq.toFixed(4)}%.`;
  } else {
    verdictTier = 'fail';
    verdictHeadline = 'Noise wins: worse than a quick classical estimate (Hartree-Fock)';
    verdictSummary = `Off by ${eqPoint.vqeNoisyErrorMHa.toFixed(1)} mHa at the natural bond length, while the classical Hartree-Fock shortcut is off by ${eqPoint.rhfErrorMHa.toFixed(1)} mHa (fidelity ${(circuitFidelity * 100).toFixed(1)}%).`;
    verdictDetail = `With ${totalTwoQubitGates} two-qubit gates at ${twoQubitErrorPct.toFixed(2)}% error (circuit fidelity ${(circuitFidelity * 100).toFixed(1)}%), noise pushes the answer ${eqPoint.vqeNoisyErrorMHa.toFixed(1)} mHa away at the natural bond length, worse than the quick Hartree-Fock estimate (${eqPoint.rhfErrorMHa.toFixed(1)} mHa). An ordinary laptop solves ${spec.formula} (${spec.basis}) exactly in microseconds.`;
  }

  return (
    <section className="panel verdict-section" aria-labelledby="verdict-heading">
      <div className="section-head">
        <div>
          <span className="eyebrow">The verdict</span>
          <h2 id="verdict-heading" className="section-title">
            {verdictHeadline}
          </h2>
        </div>
        <div className={`verdict-badge badge-${verdictTier}`}>
          {verdictTier === 'pass'
            ? 'Needs error-corrected chips'
            : verdictTier === 'warn'
            ? 'Close, not there'
            : 'Classical wins'}
        </div>
      </div>

      <div className={`live-verdict-banner banner-${verdictTier}`}>
        <p className="live-verdict-copy">{verdictSummary}</p>
      </div>

      <div className="details-stack">
        <details className="editorial-details">
          <summary>Read more: what this means for {spec.formula} at {twoQubitErrorPct.toFixed(2)}% error per two-qubit step</summary>
          <div className="details-body">
            <p>{verdictDetail}</p>
          </div>
        </details>

        <details className="editorial-details">
          <summary>Read more: what has really been shown so far</summary>
          <div className="details-body">
            <ul className="verdict-list">
              <li>
                <strong>Breaking bonds is where the quick estimate fails:</strong> Hartree-Fock treats each electron as moving on its own, so when a bond is pulled apart it goes badly wrong (for H₂ it misses by over 260 mHa at 3.0 Å). A noise-free VQE circuit gets this case right.
              </li>
              <li>
                <strong>It has run on real chips:</strong> experiments on real quantum processors (O&apos;Malley 2016, Kandala 2017) showed that a VQE circuit can encode a small molecule's energy on physical qubits and tune itself towards the lowest energy, with a normal computer steering the dials.
              </li>
              <li>
                <strong>Noise tricks help short circuits:</strong> running the circuit at several noise levels and extrapolating back to zero noise (ZNE, zero-noise extrapolation), or throwing out results that break known physical rules, can cut the error 3x-10x on short circuits.
              </li>
              <li>
                <strong>The real long-term target:</strong> quantum computers could win in chemistry on molecules whose electrons are tightly tangled together (for example FeMoco, the core of the nitrogenase enzyme, and metal catalysts). That needs error-corrected machines running quantum phase estimation (QPE). Small VQE runs like this one will not get there.
              </li>
            </ul>
          </div>
        </details>

        <details className="editorial-details">
          <summary>Read more: quantum hype vs reality</summary>
          <div className="details-body">
            <ul className="verdict-list">
              <li>
                <strong>No speed-up on small molecules:</strong> H₂ (2 electrons) and LiH (4 electrons) in this simple model are solved exactly in under 5 milliseconds on any ordinary laptop.
              </li>
              <li>
                <strong>Noise compounds with every step:</strong> the chance a circuit runs clean is (1 - error per step) raised to the number of steps. Realistic molecules need much longer circuits, so on today's noisy chips the noise swamps the 1.6 mHa goal long before the problem gets too hard for normal computers.
              </li>
              <li>
                <strong>Too many measurements:</strong> each measurement returns just one random outcome, and a molecule's energy is made of thousands of separate terms, so pinning it to 1.6 mHa takes billions of circuit runs per step. On today's chips that is far slower than a normal computer.
              </li>
              <li>
                <strong>Flat energy surfaces (barren plateaus):</strong> in long, generic circuits the energy surface becomes almost perfectly flat, so the optimiser cannot tell which way is downhill unless it starts from a chemistry-informed guess.
              </li>
            </ul>
          </div>
        </details>
      </div>
    </section>
  );
};
