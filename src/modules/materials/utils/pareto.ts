import { MaterialRecord } from '../types';

export interface ParetoOptions {
  bandGapMin: number;
  bandGapMax: number;
}

/**
 * Computes the multi-objective Pareto-optimal frontier over the shortlisted crystals.
 *
 * Objectives (all minimized):
 *  1. Thermodynamic instability: energyAboveHull (eV/atom)
 *  2. Supply scarcity: -earthAbundanceScore (maximize earth abundance)
 *  3. Electronic target fit:
 *     - When a bounded band-gap window is set (bandGapMax < 7.5 eV):
 *       minimize |bandGap - midpoint| where midpoint = (bandGapMin + bandGapMax) / 2
 *     - When open-ended (bandGapMax >= 7.5 eV, e.g. wide-bandgap / all):
 *       minimize -bandGap (maximize breakdown / electrochemical window)
 */
export function computeParetoIds(
  candidates: MaterialRecord[],
  options: ParetoOptions
): Set<string> {
  const { bandGapMin, bandGapMax } = options;
  const boundedWindow = bandGapMax < 7.5;
  const targetMid = (bandGapMin + bandGapMax) / 2;

  const gapCost = (m: MaterialRecord) =>
    boundedWindow ? Math.abs(m.bandGap - targetMid) : -m.bandGap;

  const paretoIds = new Set<string>();

  for (const a of candidates) {
    const aHull = a.energyAboveHull;
    const aAb = a.earthAbundanceScore;
    const aGap = gapCost(a);

    const dominated = candidates.some((b) => {
      if (b.id === a.id) return false;
      const bHull = b.energyAboveHull;
      const bAb = b.earthAbundanceScore;
      const bGap = gapCost(b);

      const noWorse = bHull <= aHull + 1e-9 && bAb >= aAb && bGap <= aGap + 1e-9;
      const strictlyBetter = bHull < aHull - 1e-9 || bAb > aAb || bGap < aGap - 1e-9;
      return noWorse && strictlyBetter;
    });

    if (!dominated) {
      paretoIds.add(a.id);
    }
  }

  return paretoIds;
}

function escapeCsvCell(value: string | number | boolean): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildShortlistCsv(
  materials: MaterialRecord[],
  paretoIds: Set<string>
): string {
  const headers = [
    'mp_id',
    'formula',
    'name',
    'family',
    'pareto_optimal',
    'band_gap_ev',
    'pbe_band_gap_ev',
    'band_gap_type',
    'energy_above_hull_ev_atom',
    'formation_energy_ev_atom',
    'earth_abundance_score',
    'supply_risk',
    'bottleneck_elements',
    'space_group',
    'density_g_cm3',
    'trl',
    'milestone_year',
    'commercial_status',
  ];

  const rows = materials.map((m) =>
    [
      m.mpId,
      m.formula,
      m.name,
      m.family,
      paretoIds.has(m.id) ? 'yes' : 'no',
      m.bandGap.toFixed(2),
      m.pbeBandGap.toFixed(2),
      m.bandGapType,
      m.energyAboveHull.toFixed(3),
      m.formationEnergy.toFixed(2),
      m.earthAbundanceScore,
      m.supplyRisk,
      m.bottleneckElements.join(';'),
      m.spaceGroup,
      m.density.toFixed(2),
      m.trl,
      m.milestoneYear,
      m.commercialStatus,
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

export function downloadShortlistCsv(
  materials: MaterialRecord[],
  paretoIds: Set<string>,
  filename = 'materials-pareto-shortlist.csv'
): void {
  const csv = buildShortlistCsv(materials, paretoIds);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
