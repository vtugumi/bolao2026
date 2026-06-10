/**
 * Odds calculation engine
 * 4 sources: Group predictions, Opta Supercomputer, Market (the-odds-api.com), FIFA Ranking
 */

// Opta Analyst Supercomputer - championship probability (%)
// Source: https://theanalyst.com/articles/who-will-win-2026-fifa-world-cup-predictions-opta-supercomputer
// Based on 25,000 tournament simulations
export const OPTA_CHAMPION_PROB: Record<string, number> = {
  ESP: 16.10, FRA: 13.00, ENG: 11.20, ARG: 10.40, POR: 7.00,
  BRA: 6.60, GER: 5.10, NED: 3.60, NOR: 3.50, BEL: 2.40,
  COL: 2.10, MAR: 1.90, URU: 1.70, URY: 1.70, CRO: 1.60, ECU: 1.40,
  JPN: 1.30, USA: 1.20, SUI: 1.00, MEX: 1.00, TUR: 0.80,
  SEN: 0.70, KOR: 0.65, AUT: 0.60, SWE: 0.50, AUS: 0.30,
  EGY: 0.40, UZB: 0.10, IRN: 0.25, CIV: 0.22,
  TUN: 0.20, ALG: 0.18, SCO: 0.20, CZE: 0.15, PAR: 0.12,
  GHA: 0.10, CAN: 0.10, PAN: 0.08, BIH: 0.06, RSA: 0.10,
  KSA: 0.06, NZL: 0.05, QAT: 0.04, JOR: 0.10, IRQ: 0.03,
  COD: 0.03, CPV: 0.02, HAI: 0.004, CUW: 0.002,
}

// Opta Power Ratings (0-100 scale, best team = 100)
// Source: https://theanalyst.com/articles/world-cup-groups-2026-easiest-hardest-opta-power-rankings
// Confirmed values marked, others interpolated from ranking position
const OPTA_POWER_RATING: Record<string, number> = {
  ESP: 100.0, FRA: 98.6, ENG: 97.2, ARG: 96.5, // top 4
  NED: 94.0, COL: 93.0, POR: 91.5, BRA: 92.2,  // confirmed BRA
  GER: 89.6, MAR: 88.5, CRO: 88.0, BEL: 87.5,  // confirmed GER
  URU: 87.0, URY: 87.0, ECU: 86.5, JPN: 86.0,
  NOR: 85.5, SUI: 85.0, AUT: 84.5, TUR: 84.0,   // 17th-20th
  SEN: 83.5, SWE: 83.0, IRN: 82.5, MEX: 82.0,    // 21st-24th
  KOR: 81.0, EGY: 80.5, AUS: 80.0, USA: 77.0,    // 28th/36th
  PAR: 79.0, CIV: 78.5, TUN: 78.0, ALG: 77.5,    // 30th range
  GHA: 76.5, CAN: 76.0, PAN: 75.5, CZE: 74.0,    // 37th-40th
  KSA: 72.0, NZL: 70.0, SCO: 73.0, JOR: 68.0,
  COD: 67.0, IRQ: 66.0, RSA: 65.0, BIH: 62.0,    // 62nd-77th
  QAT: 61.0, CPV: 59.0, HAI: 57.1, CUW: 49.5,    // confirmed HAI/CUW
}

// Use Opta Power Rating directly for match-level predictions
function optaPowerRating(code: string): number {
  return OPTA_POWER_RATING[code] || 60
}

/**
 * Calculate win/draw/loss probabilities from Opta power ratings
 * Same Elo formula as FIFA but using Opta-derived strength
 */
export function calcOptaOdds(
  homeCode: string,
  awayCode: string
): { homeWin: number; draw: number; awayWin: number } {
  const homeRating = optaPowerRating(homeCode)
  const awayRating = optaPowerRating(awayCode)
  const diff = homeRating - awayRating

  // Calibrated for 0-100 scale: 10pt diff ≈ 200 Elo pts
  const homeExpected = 1 / (1 + Math.pow(10, -diff / 30))
  const homeAdj = Math.min(0.95, Math.max(0.05, homeExpected + 0.03))

  const drawBase = 0.25 - Math.abs(diff) / 200
  const drawProb = Math.max(0.10, Math.min(0.30, drawBase))

  const remaining = 1 - drawProb
  const homeWin = remaining * homeAdj
  const awayWin = remaining * (1 - homeAdj)

  const total = homeWin + drawProb + awayWin
  return {
    homeWin: Math.round((homeWin / total) * 100),
    draw: Math.round((drawProb / total) * 100),
    awayWin: Math.round((awayWin / total) * 100),
  }
}

// FIFA Ranking points (June 2026 estimates based on current trajectory)
// Source: FIFA World Ranking as of late 2025 / early 2026
export const FIFA_RANKING_POINTS: Record<string, number> = {
  ARG: 1867, FRA: 1859, BRA: 1840, ENG: 1798, BEL: 1780,
  ESP: 1775, NED: 1761, POR: 1756, GER: 1740, COL: 1735,
  URU: 1720, URY: 1720, CRO: 1710, USA: 1690, MEX: 1680, MAR: 1670,
  SUI: 1660, JPN: 1655, SEN: 1645, TUR: 1630, AUT: 1620,
  KOR: 1610, AUS: 1595, EGY: 1590, UZB: 1580, ECU: 1575,
  SWE: 1570, NOR: 1565, CIV: 1555, IRN: 1550, TUN: 1540,
  ALG: 1535, CZE: 1530, SCO: 1520, PAR: 1510, GHA: 1505,
  PAN: 1500, CAN: 1495, BIH: 1480, RSA: 1470, QAT: 1460,
  JOR: 1445, IRQ: 1440, KSA: 1435, COD: 1420, NZL: 1400,
  CPV: 1380, HAI: 1350, CUW: 1250,
}

/**
 * Calculate win/draw/loss probabilities from FIFA ranking points
 * Uses Elo-based formula adapted for football (with draw probability)
 */
export function calcRankingOdds(
  homeCode: string,
  awayCode: string
): { homeWin: number; draw: number; awayWin: number } {
  const homeRating = FIFA_RANKING_POINTS[homeCode] || 1400
  const awayRating = FIFA_RANKING_POINTS[awayCode] || 1400
  const diff = homeRating - awayRating

  // Elo expected score (home perspective)
  // Using 600 as denominator (FIFA uses ~600 for their calc)
  const homeExpected = 1 / (1 + Math.pow(10, -diff / 600))

  // Add home advantage (~5%)
  const homeAdj = Math.min(0.95, Math.max(0.05, homeExpected + 0.03))

  // Split into Win/Draw/Loss
  // Draw probability: base ~25%, decreases as rating gap increases
  const drawBase = 0.25 - Math.abs(diff) / 4000
  const drawProb = Math.max(0.10, Math.min(0.30, drawBase))

  // Remaining probability split by Elo
  const remaining = 1 - drawProb
  const homeWin = remaining * homeAdj
  const awayWin = remaining * (1 - homeAdj)

  // Normalize to ensure sum = 100%
  const total = homeWin + drawProb + awayWin
  return {
    homeWin: Math.round((homeWin / total) * 100),
    draw: Math.round((drawProb / total) * 100),
    awayWin: Math.round((awayWin / total) * 100),
  }
}

/**
 * Calculate group prediction odds from existing predictions
 */
export function calcGroupOdds(
  predictions: Array<{ homeScore: number; awayScore: number }>
): { homeWin: number; draw: number; awayWin: number; total: number } {
  if (predictions.length === 0) {
    return { homeWin: 0, draw: 0, awayWin: 0, total: 0 }
  }

  let homeWins = 0
  let draws = 0
  let awayWins = 0

  for (const p of predictions) {
    if (p.homeScore > p.awayScore) homeWins++
    else if (p.homeScore === p.awayScore) draws++
    else awayWins++
  }

  const total = predictions.length
  return {
    homeWin: Math.round((homeWins / total) * 100),
    draw: Math.round((draws / total) * 100),
    awayWin: Math.round((awayWins / total) * 100),
    total,
  }
}

/**
 * Calculate bonus prediction odds (which teams/players were most chosen)
 */
export function calcBonusOdds(
  predictions: Array<{ value: string }>
): Array<{ value: string; count: number; percentage: number }> {
  const counts: Record<string, number> = {}
  for (const p of predictions) {
    const v = p.value.trim()
    if (v) {
      counts[v] = (counts[v] || 0) + 1
    }
  }

  const total = predictions.length
  return Object.entries(counts)
    .map(([value, count]) => ({
      value,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Calculate championship probability from FIFA ranking
 * Simplified: higher ranking = higher chance, exponential weighting
 */
export function calcChampionshipOdds(
  teams: Array<{ code: string; name: string; flagEmoji: string }>
): Array<{ code: string; name: string; flagEmoji: string; probability: number }> {
  const rated = teams.map(t => ({
    ...t,
    rating: FIFA_RANKING_POINTS[t.code] || 1400,
  }))

  // Exponential weighting based on rating
  const base = 1200 // baseline
  const weights = rated.map(t => Math.pow(2, (t.rating - base) / 150))
  const totalWeight = weights.reduce((a, b) => a + b, 0)

  return rated
    .map((t, i) => ({
      code: t.code,
      name: t.name,
      flagEmoji: t.flagEmoji,
      probability: Math.round((weights[i] / totalWeight) * 1000) / 10, // 1 decimal
    }))
    .sort((a, b) => b.probability - a.probability)
}
