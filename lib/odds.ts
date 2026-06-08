/**
 * Odds calculation engine
 * 3 sources: Group predictions, FIFA Ranking, Market (the-odds-api.com)
 */

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
