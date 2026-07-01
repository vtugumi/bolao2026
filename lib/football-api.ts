// Client for football-data.org API (free tier)
// Docs: https://www.football-data.org/documentation/api
// Competition code for FIFA World Cup: WC

const API_BASE = 'https://api.football-data.org/v4'
const API_KEY = process.env.FOOTBALL_API_KEY || ''

interface ApiMatch {
  id: number
  matchday: number
  stage: string           // "GROUP_STAGE", "ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINALS", "SEMI_FINALS", "THIRD_PLACE", "FINAL"
  group: string | null    // "GROUP_A", "GROUP_B", etc.
  status: string          // "SCHEDULED", "TIMED", "IN_PLAY", "PAUSED", "FINISHED", "POSTPONED", "CANCELLED"
  utcDate: string
  homeTeam: { id: number; name: string; tla: string }
  awayTeam: { id: number; name: string; tla: string }
  score: {
    winner: string | null  // "HOME_TEAM", "AWAY_TEAM", "DRAW"
    fullTime: { home: number | null; away: number | null }
    halfTime: { home: number | null; away: number | null }
    regularTime?: { home: number | null; away: number | null }
    penalties?: { home: number | null; away: number | null }
  }
}

interface ApiStanding {
  stage: string
  type: string
  group: string
  table: Array<{
    position: number
    team: { id: number; name: string; tla: string }
    playedGames: number
    won: number
    draw: number
    lost: number
    points: number
    goalsFor: number
    goalsAgainst: number
    goalDifference: number
  }>
}

export interface FinishedMatch {
  externalId: number
  stage: string              // Our internal stage: GROUP, R32, R16, QF, SF, 3RD, FINAL
  groupLabel: string | null  // A, B, C, ... L
  homeTeamTla: string        // 3-letter code: BRA, ARG, etc.
  awayTeamTla: string
  homeScore: number
  awayScore: number
  regularHomeScore: number | null  // Score at 90 min (for knockout with extra time)
  regularAwayScore: number | null
  penaltiesHome: number | null
  penaltiesAway: number | null
  winnerSide: 'HOME' | 'AWAY' | 'DRAW' | null
  extraTimeIncomplete: boolean     // API has regularTime object but values are null
}

// Map football-data.org stage names to our internal stage codes
function mapStage(apiStage: string): string {
  const stageMap: Record<string, string> = {
    'GROUP_STAGE': 'GROUP',
    'ROUND_OF_32': 'R32',
    'LAST_32': 'R32',
    'ROUND_OF_16': 'R16',
    'LAST_16': 'R16',
    'QUARTER_FINALS': 'QF',
    'SEMI_FINALS': 'SF',
    'THIRD_PLACE': '3RD',
    'FINAL': 'FINAL',
  }
  return stageMap[apiStage] || apiStage
}

// Map "GROUP_A" → "A"
function mapGroup(apiGroup: string | null): string | null {
  if (!apiGroup) return null
  return apiGroup.replace('GROUP_', '')
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'X-Auth-Token': API_KEY,
    },
    next: { revalidate: 0 },  // No caching
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`football-data.org API error ${res.status}: ${text}`)
  }

  return res.json()
}

/**
 * Get all finished World Cup matches (status=FINISHED)
 */
export async function getFinishedMatches(): Promise<FinishedMatch[]> {
  const data = await apiFetch<{ matches: ApiMatch[] }>(
    '/competitions/WC/matches?status=FINISHED'
  )

  return data.matches.map(m => {
    // For knockout: regularTime has the 90-min score, fullTime includes extra time
    const hasRegularTime = m.score.regularTime &&
      m.score.regularTime.home !== null && m.score.regularTime.away !== null

    // API returns regularTime object with null values when extra time happened
    // but scores aren't populated yet — we must not fall back to fullTime in that case
    const extraTimeIncomplete = !!(m.score.regularTime &&
      m.score.regularTime.home === null && m.score.regularTime.away === null)

    let winnerSide: 'HOME' | 'AWAY' | 'DRAW' | null = null
    if (m.score.winner === 'HOME_TEAM') winnerSide = 'HOME'
    else if (m.score.winner === 'AWAY_TEAM') winnerSide = 'AWAY'
    else if (m.score.winner === 'DRAW') winnerSide = 'DRAW'

    return {
      externalId: m.id,
      stage: mapStage(m.stage),
      groupLabel: mapGroup(m.group),
      homeTeamTla: m.homeTeam.tla,
      awayTeamTla: m.awayTeam.tla,
      homeScore: m.score.fullTime.home ?? 0,
      awayScore: m.score.fullTime.away ?? 0,
      regularHomeScore: hasRegularTime ? m.score.regularTime!.home : null,
      regularAwayScore: hasRegularTime ? m.score.regularTime!.away : null,
      penaltiesHome: m.score.penalties?.home ?? null,
      penaltiesAway: m.score.penalties?.away ?? null,
      winnerSide,
      extraTimeIncomplete,
    }
  })
}

/**
 * Get all matches for today (any status)
 */
export async function getTodayMatches(): Promise<ApiMatch[]> {
  const today = new Date().toISOString().split('T')[0]
  const data = await apiFetch<{ matches: ApiMatch[] }>(
    `/competitions/WC/matches?dateFrom=${today}&dateTo=${today}`
  )
  return data.matches
}

/**
 * Get live/in-play matches
 */
export async function getLiveMatches(): Promise<ApiMatch[]> {
  const data = await apiFetch<{ matches: ApiMatch[] }>(
    '/competitions/WC/matches?status=LIVE,IN_PLAY,PAUSED'
  )
  return data.matches
}

/**
 * Get official FIFA group standings
 */
export async function getGroupStandings(): Promise<ApiStanding[]> {
  const data = await apiFetch<{ standings: ApiStanding[] }>(
    '/competitions/WC/standings'
  )
  return data.standings
}
