import type { MoleculeSpec, PESPoint } from '../data/molecules';

export interface Complex {
  re: number;
  im: number;
}

/** 2-qubit statevector in computational basis [|00>, |01>, |10>, |11>] */
export type Statevector2Q = [Complex, Complex, Complex, Complex];

/**
 * Parity-tapered 2-qubit molecular Hamiltonian:
 *   H(R) = g0*I + g1*Z0 + g2*Z1 + g3*Z0Z1 + g4*(X0X1 + Y0Y1)
 *
 * Calibrated directly to the verified STO-3G ground-truth point:
 *   <01|H|01> = E_RHF(R)
 *   min eig(H) = E_FCI(R)
 *   Tr(H)/4    = E_mixed(R)
 */
export interface Hamiltonian2Q {
  g0: number;
  g1: number;
  g2: number;
  g3: number;
  g4: number;
  e00: number;
  e01: number;
  e10: number;
  e11: number;
  coupling: number;
  exactGroundEnergy: number;
  rhfEnergy: number;
  mixedEnergy: number;
}

export interface ExpectationBreakdown {
  z0: number;
  z1: number;
  z0z1: number;
  x0x1: number;
  y0y1: number;
  energyIdeal: number;
  energyNoisy: number;
  idealProbs: [number, number, number, number];
  noisyProbs: [number, number, number, number];
}

export interface VQEStepSnapshot {
  step: number;
  params: number[];
  energyIdeal: number;
  energyNoisy: number;
  errorIdealMHa: number;
  errorNoisyMHa: number;
  fidelity: number;
  idealProbs: [number, number, number, number];
  noisyProbs: [number, number, number, number];
  gradNorm: number;
}

const c = (re: number, im = 0): Complex => ({ re, im });
const cMul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});
const cConj = (a: Complex): Complex => ({ re: a.re, im: -a.im });
const cAbs2 = (a: Complex): number => a.re * a.re + a.im * a.im;

/**
 * Builds the exact 2-qubit tapered Hamiltonian for a molecule geometry point.
 */
export function buildHamiltonian2Q(spec: MoleculeSpec, point: PESPoint): Hamiltonian2Q {
  const e01 = point.rhf;
  const eFci = point.fci;
  const eMixed = point.mixedEnergy;

  // Normalized bond stretch [0, 1] shrinks the bonding-antibonding gap realistically
  const [xMin, xMax] = spec.xDomain;
  const stretch = Math.max(0, Math.min(1, (point.r - xMin) / Math.max(0.1, xMax - xMin)));

  // Double-excitation diagonal energy E10 > E01
  const baseGap = spec.id === 'H2' ? 0.92 - 0.78 * stretch : 0.72 - 0.52 * stretch;
  const minSafeGap = Math.max(0.08, (e01 - eFci) * 0.45 + 0.08);
  const gap10 = Math.max(baseGap, minSafeGap);
  const e10 = e01 + gap10;

  // Exact off-diagonal coupling so lowest eigenvalue of 2x2 {|01>, |10>} block equals E_FCI
  const deltaCorr = Math.max(0, e01 - eFci);
  const coupling = Math.sqrt(deltaCorr * (e10 - eFci));

  // Choose E00 and E11 so Tr(H)/4 === eMixed exactly, while staying above E01
  const residualSum = 4 * eMixed - e01 - e10;
  const split = spec.id === 'H2' ? 0.09 : 0.06;
  const e00 = residualSum / 2 + split;
  const e11 = residualSum / 2 - split;

  // Pauli coefficients from diagonal energies:
  // e00 = g0 + g1 + g2 + g3
  // e01 = g0 + g1 - g2 - g3
  // e10 = g0 - g1 + g2 - g3
  // e11 = g0 - g1 - g2 + g3
  const g0 = (e00 + e01 + e10 + e11) / 4;
  const g1 = (e00 + e01 - e10 - e11) / 4;
  const g2 = (e00 - e01 + e10 - e11) / 4;
  const g3 = (e00 - e01 - e10 + e11) / 4;
  const g4 = coupling / 2;

  return {
    g0,
    g1,
    g2,
    g3,
    g4,
    e00,
    e01,
    e10,
    e11,
    coupling,
    exactGroundEnergy: eFci,
    rhfEnergy: e01,
    mixedEnergy: eMixed,
  };
}

/** Single-qubit Pauli-X on qubit q (0 = MSB, 1 = LSB) */
function applyX(state: Statevector2Q, qubit: 0 | 1): Statevector2Q {
  if (qubit === 0) {
    return [state[2], state[3], state[0], state[1]];
  }
  return [state[1], state[0], state[3], state[2]];
}

/** Single-qubit RY(theta) on qubit q (0 = MSB, 1 = LSB) */
function applyRY(state: Statevector2Q, qubit: 0 | 1, theta: number): Statevector2Q {
  const cos = Math.cos(theta / 2);
  const sin = Math.sin(theta / 2);
  const out: Statevector2Q = [c(0), c(0), c(0), c(0)];

  const pairs: Array<[number, number]> =
    qubit === 0
      ? [
          [0, 2],
          [1, 3],
        ]
      : [
          [0, 1],
          [2, 3],
        ];

  for (const [i0, i1] of pairs) {
    const a = state[i0];
    const b = state[i1];
    out[i0] = c(cos * a.re - sin * b.re, cos * a.im - sin * b.im);
    out[i1] = c(sin * a.re + cos * b.re, sin * a.im + cos * b.im);
  }
  return out;
}

/** Controlled-NOT with control -> target */
function applyCNOT(state: Statevector2Q, control: 0 | 1): Statevector2Q {
  if (control === 0) {
    // Flip q1 when q0 == 1: swaps |10> (2) and |11> (3)
    return [state[0], state[1], state[3], state[2]];
  }
  // Flip q0 when q1 == 1: swaps |01> (1) and |11> (3)
  return [state[0], state[3], state[2], state[1]];
}

/**
 * Clean implementation of the exact 2-CNOT Givens/UCCSD layer circuit:
 *   Init: |00> -> X(q1) -> |01>
 *   For each layer l = 0 .. depth-1:
 *     RY(theta_b) on q1 (hardware-efficient variational perturbation)
 *     CNOT(0 -> 1)
 *     RY(theta_a) on q0
 *     CNOT(0 -> 1)
 *
 * At theta = [0, 0, 0, 0]: state is identically |01> (exact Hartree-Fock).
 * With theta_a = -2 * arctan(...) and theta_b = 0: state is identically exact FCI ground state!
 */
export function evaluateCircuitState(params: number[], depth: number): Statevector2Q {
  let state: Statevector2Q = applyX([c(1), c(0), c(0), c(0)], 1);
  const layers = Math.max(1, Math.min(depth, 24));

  const thetaMain = params[0] ?? 0;
  const thetaLeak = params[1] ?? 0;
  const thetaAlt = params[2] ?? 0;

  for (let l = 0; l < layers; l++) {
    const a = thetaMain / layers + (l % 2 === 0 ? thetaAlt : -thetaAlt) / layers;
    const b = thetaLeak / layers;

    if (Math.abs(b) > 1e-12) {
      state = applyRY(state, 1, b);
    }
    state = applyCNOT(state, 0);
    state = applyRY(state, 0, a);
    state = applyCNOT(state, 0);
  }

  return state;
}

/**
 * Computes Pauli expectation values and ideal/noisy energies from a 2-qubit statevector.
 */
export function measureExpectation(
  state: Statevector2Q,
  ham: Hamiltonian2Q,
  circuitFidelity: number
): ExpectationBreakdown {
  const p00 = cAbs2(state[0]);
  const p01 = cAbs2(state[1]);
  const p10 = cAbs2(state[2]);
  const p11 = cAbs2(state[3]);

  const z0 = p00 + p01 - p10 - p11;
  const z1 = p00 - p01 + p10 - p11;
  const z0z1 = p00 - p01 - p10 + p11;

  // <psi|X0 X1|psi> = 2 Re(a0* a3 + a1* a2)
  const a0a3 = cMul(cConj(state[0]), state[3]);
  const a1a2 = cMul(cConj(state[1]), state[2]);
  const x0x1 = 2 * (a0a3.re + a1a2.re);

  // <psi|Y0 Y1|psi> = 2 Re(-a0* a3 + a1* a2)
  const y0y1 = 2 * (-a0a3.re + a1a2.re);

  const energyIdeal =
    ham.g0 +
    ham.g1 * z0 +
    ham.g2 * z1 +
    ham.g3 * z0z1 +
    ham.g4 * (x0x1 + y0y1);

  const F = Math.max(0, Math.min(1, circuitFidelity));
  const energyNoisy = F * energyIdeal + (1 - F) * ham.mixedEnergy;

  const idealProbs: [number, number, number, number] = [p00, p01, p10, p11];
  const noisyProbs: [number, number, number, number] = [
    F * p00 + (1 - F) * 0.25,
    F * p01 + (1 - F) * 0.25,
    F * p10 + (1 - F) * 0.25,
    F * p11 + (1 - F) * 0.25,
  ];

  return {
    z0,
    z1,
    z0z1,
    x0x1,
    y0y1,
    energyIdeal,
    energyNoisy,
    idealProbs,
    noisyProbs,
  };
}

/**
 * Evaluates a single VQE optimization step using the quantum parameter-shift rule
 * on the 2-qubit statevector.
 */
export function runVQEOptimizationStep(
  params: number[],
  ham: Hamiltonian2Q,
  depth: number,
  circuitFidelity: number,
  stepIndex: number,
  learningRate = 0.65
): { nextParams: number[]; snapshot: VQEStepSnapshot } {
  const shift = Math.PI / 2;
  const grads: number[] = [];

  for (let k = 0; k < params.length; k++) {
    const plus = [...params];
    const minus = [...params];
    plus[k] += shift;
    minus[k] -= shift;

    const ePlus = measureExpectation(evaluateCircuitState(plus, depth), ham, circuitFidelity).energyIdeal;
    const eMinus = measureExpectation(evaluateCircuitState(minus, depth), ham, circuitFidelity).energyIdeal;
    // Exact parameter-shift gradient (scaled by F for noisy landscape gradient attenuation!)
    const grad = 0.5 * (ePlus - eMinus) * Math.max(0.25, circuitFidelity);
    grads.push(grad);
  }

  const gradNorm = Math.sqrt(grads.reduce((acc, g) => acc + g * g, 0));

  // Adaptive step size for crisp, stable convergence
  const effectiveLr = learningRate / (1 + 0.035 * stepIndex);
  const nextParams = params.map((p, idx) => p - effectiveLr * grads[idx]);

  const nextState = evaluateCircuitState(nextParams, depth);
  const meas = measureExpectation(nextState, ham, circuitFidelity);

  const snapshot: VQEStepSnapshot = {
    step: stepIndex,
    params: nextParams,
    energyIdeal: meas.energyIdeal,
    energyNoisy: meas.energyNoisy,
    errorIdealMHa: Math.abs(meas.energyIdeal - ham.exactGroundEnergy) * 1000,
    errorNoisyMHa: Math.abs(meas.energyNoisy - ham.exactGroundEnergy) * 1000,
    fidelity: circuitFidelity,
    idealProbs: meas.idealProbs,
    noisyProbs: meas.noisyProbs,
    gradNorm,
  };

  return { nextParams, snapshot };
}

/** Initial VQE state (step 0): starts near Hartree-Fock |01> with slight variational offset */
export function createInitialVQESnapshot(
  ham: Hamiltonian2Q,
  depth: number,
  circuitFidelity: number
): VQEStepSnapshot {
  // Small non-zero perturbation on theta_leak and theta_main so step 0 shows visible descent from ~RHF
  const initParams = [0.06, 0.22, 0.04];
  const state = evaluateCircuitState(initParams, depth);
  const meas = measureExpectation(state, ham, circuitFidelity);

  return {
    step: 0,
    params: initParams,
    energyIdeal: meas.energyIdeal,
    energyNoisy: meas.energyNoisy,
    errorIdealMHa: Math.abs(meas.energyIdeal - ham.exactGroundEnergy) * 1000,
    errorNoisyMHa: Math.abs(meas.energyNoisy - ham.exactGroundEnergy) * 1000,
    fidelity: circuitFidelity,
    idealProbs: meas.idealProbs,
    noisyProbs: meas.noisyProbs,
    gradNorm: 0,
  };
}
