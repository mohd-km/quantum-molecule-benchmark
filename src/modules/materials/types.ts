export type SupplyRiskTier = 'Low' | 'Moderate' | 'High' | 'Critical';

export type PresetId = 'all' | 'solar' | 'power' | 'electrolyte';

export type MaterialFamily =
  | 'Solar Absorber'
  | 'Wide-Bandgap Power'
  | 'Solid-State Electrolyte'
  | 'Battery Electrode'
  | 'Functional Dielectric';

export interface MaterialRecord {
  id: string;
  mpId: string;
  formula: string;
  name: string;
  family: MaterialFamily;
  spaceGroup: string;
  crystalSystem: string;
  /** Benchmarked band gap (eV, HSE06/experiment-calibrated Materials Project reference) */
  bandGap: number;
  /** Raw PBE GGA band gap (eV) for DFT functional transparency */
  pbeBandGap: number;
  bandGapType: 'Direct' | 'Indirect';
  /** Energy above convex hull (eV/atom) */
  energyAboveHull: number;
  /** Formation energy per atom (eV/atom) */
  formationEnergy: number;
  /** Density (g/cm^3) */
  density: number;
  elements: string[];
  /** 0-100 earth-abundance & supply resilience score */
  earthAbundanceScore: number;
  supplyRisk: SupplyRiskTier;
  /** Flagged supply-chain bottleneck elements (e.g. Co, Te, In, Ge, Ga, La) */
  bottleneckElements: string[];
  /** Abundant elements present (e.g. Si, Fe, Na, P, S, Al, O, C, N) */
  abundantElements: string[];
  /** IDs of earth-abundant alternatives in this benchmark set */
  abundantAlternativeIds: string[];
  /** Discovery or first high-throughput DFT screening milestone year */
  milestoneYear: number;
  /** Commercialization status label */
  commercialStatus: string;
  /** Years from crystal/DFT milestone to commercial scale (or ongoing lag) */
  commercializationLag: string;
  /** Technology Readiness Level (1-9) */
  trl: number;
  /** Primary scale-up or deployment bottleneck */
  primaryBarrier: string;
  /** Detailed commercialization lag analysis */
  commercializationAnalysis: string;
}

export interface PresetConfig {
  id: PresetId;
  label: string;
  shortLabel: string;
  criteriaLabel: string;
  description: string;
  bandGapMin: number;
  bandGapMax: number | null;
  maxHullDefault: number;
  zoneColor: string;
  zoneBorder: string;
}
