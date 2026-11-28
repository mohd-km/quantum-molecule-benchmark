export type MoleculeId = 'H2' | 'LiH';

export interface PESPoint {
  /** Internuclear bond length in Angstroms */
  r: number;
  /** Exact Full Configuration Interaction energy in Hartrees (STO-3G) */
  fci: number;
  /** Restricted Hartree-Fock energy in Hartrees (STO-3G) */
  rhf: number;
  /** Noiseless UCCSD / VQE energy in Hartrees (STO-3G) */
  vqeNoiseless: number;
  /** Maximally mixed state expectation value Tr(H)/2^n in Hartrees (depolarizing fixed point) */
  mixedEnergy: number;
}

export interface MoleculeSpec {
  id: MoleculeId;
  formula: string;
  name: string;
  basis: string;
  activeSpace: string;
  qubits: number;
  defaultDepth: number;
  twoQubitGatesPerLayer: number;
  equilibriumR: number;
  dissociationLimit: number;
  reference: string;
  yDomain: [number, number];
  xDomain: [number, number];
  points: PESPoint[];
}

export interface HardwarePreset {
  id: string;
  label: string;
  sublabel: string;
  errorRatePct: number;
  depthMultiplier: number;
}

/** Chemical accuracy threshold: 1.0 kcal/mol = 0.0015936 Ha (~1.6 mHa) */
export const CHEMICAL_ACCURACY_HA = 0.0016;
export const CHEMICAL_ACCURACY_MHA = 1.6;
export const HA_TO_KCAL_MOL = 627.509474;

export const HARDWARE_PRESETS: HardwarePreset[] = [
  {
    id: 'ftqc',
    label: 'Error-corrected target',
    sublabel: '0.01% error per step',
    errorRatePct: 0.01,
    depthMultiplier: 1,
  },
  {
    id: 'ion-sota',
    label: 'Best trapped-ion chips',
    sublabel: '0.10% error per step',
    errorRatePct: 0.1,
    depthMultiplier: 1,
  },
  {
    id: 'sc-nisq',
    label: 'Typical superconducting chip',
    sublabel: '0.50% error per step',
    errorRatePct: 0.5,
    depthMultiplier: 1,
  },
  {
    id: 'noisy-qpu',
    label: 'High-noise chip',
    sublabel: '1.50% error per step',
    errorRatePct: 1.5,
    depthMultiplier: 1,
  },
];

/**
 * Ground-truth STO-3G dissociation curves grounded in PySCF / Szabo-Ostlund /
 * O'Malley et al. (PRX 6, 031007, 2016) for H2 and Kandala et al. (Nature 549, 242, 2017)
 * / PySCF STO-3G for LiH.
 */
export const MOLECULES: Record<MoleculeId, MoleculeSpec> = {
  H2: {
    id: 'H2',
    formula: 'H2',
    name: 'Molecular Hydrogen',
    basis: 'STO-3G',
    activeSpace: '2e, 2o (4 spin-orbitals, tapered to 2 qubits)',
    qubits: 2,
    defaultDepth: 4,
    twoQubitGatesPerLayer: 2,
    equilibriumR: 0.735,
    dissociationLimit: -0.93316,
    reference: "PySCF STO-3G & O'Malley et al., Phys. Rev. X 6, 031007 (2016)",
    yDomain: [-1.2, -0.58],
    xDomain: [0.35, 3.0],
    points: [
      { r: 0.35, fci: -0.78927, rhf: -0.78102, vqeNoiseless: -0.78925, mixedEnergy: 0.184 },
      { r: 0.45, fci: -0.99841, rhf: -0.98664, vqeNoiseless: -0.99839, mixedEnergy: -0.052 },
      { r: 0.55, fci: -1.09263, rhf: -1.07782, vqeNoiseless: -1.09261, mixedEnergy: -0.176 },
      { r: 0.65, fci: -1.12990, rhf: -1.11216, vqeNoiseless: -1.12988, mixedEnergy: -0.244 },
      { r: 0.735, fci: -1.13728, rhf: -1.11676, vqeNoiseless: -1.13726, mixedEnergy: -0.278 },
      { r: 0.85, fci: -1.12836, rhf: -1.10324, vqeNoiseless: -1.12833, mixedEnergy: -0.305 },
      { r: 1.00, fci: -1.10115, rhf: -1.06611, vqeNoiseless: -1.10111, mixedEnergy: -0.324 },
      { r: 1.20, fci: -1.05674, rhf: -1.00511, vqeNoiseless: -1.05669, mixedEnergy: -0.335 },
      { r: 1.40, fci: -1.01547, rhf: -0.94148, vqeNoiseless: -1.01541, mixedEnergy: -0.340 },
      { r: 1.60, fci: -0.98347, rhf: -0.88173, vqeNoiseless: -0.98340, mixedEnergy: -0.342 },
      { r: 1.80, fci: -0.96182, rhf: -0.82944, vqeNoiseless: -0.96175, mixedEnergy: -0.343 },
      { r: 2.00, fci: -0.94864, rhf: -0.78596, vqeNoiseless: -0.94857, mixedEnergy: -0.344 },
      { r: 2.30, fci: -0.93892, rhf: -0.73612, vqeNoiseless: -0.93885, mixedEnergy: -0.344 },
      { r: 2.60, fci: -0.93502, rhf: -0.70104, vqeNoiseless: -0.93496, mixedEnergy: -0.344 },
      { r: 3.00, fci: -0.93363, rhf: -0.66982, vqeNoiseless: -0.93358, mixedEnergy: -0.345 },
    ],
  },
  LiH: {
    id: 'LiH',
    formula: 'LiH',
    name: 'Lithium Hydride',
    basis: 'STO-3G',
    activeSpace: '4e, 6o (frozen 1s core -> 4-6 active qubits)',
    qubits: 4,
    defaultDepth: 8,
    twoQubitGatesPerLayer: 6,
    equilibriumR: 1.55,
    dissociationLimit: -7.78211,
    reference: 'PySCF STO-3G & Kandala et al., Nature 549, 242-246 (2017)',
    yDomain: [-7.92, -7.62],
    xDomain: [0.9, 4.0],
    points: [
      { r: 0.90, fci: -7.68452, rhf: -7.66510, vqeNoiseless: -7.68405, mixedEnergy: -6.94 },
      { r: 1.05, fci: -7.78241, rhf: -7.76214, vqeNoiseless: -7.78191, mixedEnergy: -7.06 },
      { r: 1.20, fci: -7.83985, rhf: -7.81902, vqeNoiseless: -7.83933, mixedEnergy: -7.13 },
      { r: 1.35, fci: -7.87124, rhf: -7.85011, vqeNoiseless: -7.87068, mixedEnergy: -7.17 },
      { r: 1.50, fci: -7.88214, rhf: -7.86186, vqeNoiseless: -7.88156, mixedEnergy: -7.19 },
      { r: 1.55, fci: -7.88276, rhf: -7.86213, vqeNoiseless: -7.88216, mixedEnergy: -7.19 },
      { r: 1.70, fci: -7.87948, rhf: -7.85762, vqeNoiseless: -7.87884, mixedEnergy: -7.20 },
      { r: 1.90, fci: -7.86789, rhf: -7.84285, vqeNoiseless: -7.86719, mixedEnergy: -7.20 },
      { r: 2.15, fci: -7.84921, rhf: -7.81724, vqeNoiseless: -7.84844, mixedEnergy: -7.19 },
      { r: 2.40, fci: -7.83182, rhf: -7.78961, vqeNoiseless: -7.83096, mixedEnergy: -7.18 },
      { r: 2.75, fci: -7.81245, rhf: -7.75248, vqeNoiseless: -7.81148, mixedEnergy: -7.17 },
      { r: 3.10, fci: -7.80018, rhf: -7.72103, vqeNoiseless: -7.79911, mixedEnergy: -7.16 },
      { r: 3.50, fci: -7.79310, rhf: -7.69340, vqeNoiseless: -7.79198, mixedEnergy: -7.16 },
      { r: 4.00, fci: -7.78982, rhf: -7.67125, vqeNoiseless: -7.78865, mixedEnergy: -7.15 },
    ],
  },
};

export interface EvaluatedPoint extends PESPoint {
  vqeNoisy: number;
  rhfErrorMHa: number;
  vqeNoiselessErrorMHa: number;
  vqeNoisyErrorMHa: number;
  circuitFidelity: number;
  beatsChemicalAccuracy: boolean;
  beatsHartreeFock: boolean;
}

/**
 * Computes depolarizing-channel noisy VQE energy:
 *   rho = F |psi><psi| + (1 - F) I / 2^n
 *   E_noisy(R) = F * E_noiseless(R) + (1 - F) * E_mixed(R)
 * where F = (1 - p_2q)^(N_2q) and N_2q = depth * twoQubitGatesPerLayer.
 */
export function evaluateMoleculePES(
  spec: MoleculeSpec,
  twoQubitErrorPct: number,
  circuitDepth: number
): {
  points: EvaluatedPoint[];
  totalTwoQubitGates: number;
  circuitFidelity: number;
  maxAllowedErrorPctAtEq: number;
  eqPoint: EvaluatedPoint;
  stretchedPoint: EvaluatedPoint;
  fractionWithinChemAcc: number;
} {
  const p2q = Math.max(0, Math.min(0.5, twoQubitErrorPct / 100));
  const totalTwoQubitGates = Math.max(1, Math.round(circuitDepth * spec.twoQubitGatesPerLayer));
  const circuitFidelity = Math.pow(1 - p2q, totalTwoQubitGates);

  const points: EvaluatedPoint[] = spec.points.map((pt) => {
    const vqeNoisy =
      circuitFidelity * pt.vqeNoiseless + (1 - circuitFidelity) * pt.mixedEnergy;
    const rhfErrorMHa = Math.abs(pt.rhf - pt.fci) * 1000;
    const vqeNoiselessErrorMHa = Math.abs(pt.vqeNoiseless - pt.fci) * 1000;
    const vqeNoisyErrorMHa = Math.abs(vqeNoisy - pt.fci) * 1000;

    return {
      ...pt,
      vqeNoisy,
      rhfErrorMHa,
      vqeNoiselessErrorMHa,
      vqeNoisyErrorMHa,
      circuitFidelity,
      beatsChemicalAccuracy: vqeNoisyErrorMHa <= CHEMICAL_ACCURACY_MHA,
      beatsHartreeFock: vqeNoisyErrorMHa < rhfErrorMHa,
    };
  });

  // Equilibrium point is the point closest to equilibriumR
  let eqPoint = points[0];
  let bestDist = Math.abs(points[0].r - spec.equilibriumR);
  for (const pt of points) {
    const dist = Math.abs(pt.r - spec.equilibriumR);
    if (dist < bestDist) {
      bestDist = dist;
      eqPoint = pt;
    }
  }

  // Stretched bond point (last point in dissociation curve)
  const stretchedPoint = points[points.length - 1];

  // Solve for exact 2Q gate error rate where E_noisy(R_eq) - E_FCI(R_eq) = 1.6 mHa
  const gapEq = eqPoint.mixedEnergy - eqPoint.vqeNoiseless;
  const residualBudget = Math.max(
    0,
    CHEMICAL_ACCURACY_HA - Math.abs(eqPoint.vqeNoiseless - eqPoint.fci)
  );
  let maxAllowedErrorPctAtEq = 0;
  if (gapEq > 0 && residualBudget > 0) {
    const minFidelity = Math.max(0, 1 - residualBudget / gapEq);
    const maxP2q = 1 - Math.pow(minFidelity, 1 / totalTwoQubitGates);
    maxAllowedErrorPctAtEq = maxP2q * 100;
  }

  const withinCount = points.filter((p) => p.beatsChemicalAccuracy).length;
  const fractionWithinChemAcc = withinCount / points.length;

  return {
    points,
    totalTwoQubitGates,
    circuitFidelity,
    maxAllowedErrorPctAtEq,
    eqPoint,
    stretchedPoint,
    fractionWithinChemAcc,
  };
}
