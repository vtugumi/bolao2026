import { prisma } from './prisma'

interface TeamStanding {
  teamId: number
  teamName: string
  teamCode: string
  flagEmoji: string
  groupLabel: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  position: number // 1, 2, 3, 4 within the group
}

interface SimulatedQualifier {
  matchNumber: number
  homeTeam: { id: number; name: string; code: string; flagEmoji: string; source: string } | null
  awayTeam: { id: number; name: string; code: string; flagEmoji: string; source: string } | null
}

// R32 bracket: 16 matches mapped to group positions
// Format: [homeSource, awaySource]
// 1A = winner of group A, 2B = runner-up of group B, 3X = third-place from possible groups
const R32_BRACKET: Array<{ matchIndex: number; home: string; away: string }> = [
  { matchIndex: 0,  home: '1A', away: '3rd' },    // 1A vs best 3rd
  { matchIndex: 1,  home: '2A', away: '2B' },      // 2A vs 2B
  { matchIndex: 2,  home: '1C', away: '2F' },      // 1C vs 2F
  { matchIndex: 3,  home: '1E', away: '3rd' },     // 1E vs best 3rd
  { matchIndex: 4,  home: '1D', away: '3rd' },     // 1D vs best 3rd
  { matchIndex: 5,  home: '2D', away: '2G' },      // 2D vs 2G
  { matchIndex: 6,  home: '1F', away: '2C' },      // 1F vs 2C
  { matchIndex: 7,  home: '1I', away: '3rd' },     // 1I vs best 3rd
  { matchIndex: 8,  home: '1G', away: '3rd' },     // 1G vs best 3rd
  { matchIndex: 9,  home: '2E', away: '2I' },      // 2E vs 2I
  { matchIndex: 10, home: '1H', away: '2J' },     // 1H vs 2J
  { matchIndex: 11, home: '1J', away: '2H' },     // 1J vs 2H
  { matchIndex: 12, home: '1B', away: '3rd' },    // 1B vs best 3rd
  { matchIndex: 13, home: '2K', away: '2L' },     // 2K vs 2L
  { matchIndex: 14, home: '1K', away: '3rd' },    // 1K vs best 3rd
  { matchIndex: 15, home: '1L', away: '3rd' },    // 1L vs best 3rd
]

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

/**
 * Calculate simulated group standings for all 12 groups based on user predictions.
 * Returns standings + qualifiers for R32.
 */
export async function calculateSimulatedBracket(userId: number) {
  // Get all teams
  const allTeams = await prisma.team.findMany()

  // Get all group matches with user's predictions
  const groupMatches = await prisma.match.findMany({
    where: { stage: 'GROUP' },
    include: {
      predictions: {
        where: { userId },
        take: 1,
      },
    },
  })

  // Calculate standings for each group
  const allStandings: Map<string, TeamStanding[]> = new Map()

  for (const groupLabel of GROUPS) {
    const teams = allTeams.filter(t => t.groupLabel === groupLabel)
    const matches = groupMatches.filter(m => m.groupLabel === groupLabel)

    const standings = new Map<number, TeamStanding>()
    for (const team of teams) {
      standings.set(team.id, {
        teamId: team.id,
        teamName: team.name,
        teamCode: team.code,
        flagEmoji: team.flagEmoji,
        groupLabel,
        played: 0, won: 0, drawn: 0, lost: 0,
        goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
        position: 0,
      })
    }

    for (const match of matches) {
      if (!match.homeTeamId || !match.awayTeamId) continue

      let homeScore: number | null = null
      let awayScore: number | null = null

      // Real result > prediction
      if (match.homeScore !== null && match.awayScore !== null) {
        homeScore = match.homeScore
        awayScore = match.awayScore
      } else if (match.predictions && match.predictions.length > 0) {
        homeScore = match.predictions[0].homeScore
        awayScore = match.predictions[0].awayScore
      }

      if (homeScore === null || awayScore === null) continue

      const home = standings.get(match.homeTeamId)
      const away = standings.get(match.awayTeamId)
      if (!home || !away) continue

      home.played++
      away.played++
      home.goalsFor += homeScore
      home.goalsAgainst += awayScore
      away.goalsFor += awayScore
      away.goalsAgainst += homeScore

      if (homeScore > awayScore) {
        home.won++; home.points += 3; away.lost++
      } else if (homeScore < awayScore) {
        away.won++; away.points += 3; home.lost++
      } else {
        home.drawn++; away.drawn++; home.points += 1; away.points += 1
      }
    }

    const sorted = Array.from(standings.values())
    sorted.forEach(t => { t.goalDifference = t.goalsFor - t.goalsAgainst })
    sorted.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
      return a.teamName.localeCompare(b.teamName)
    })
    sorted.forEach((t, i) => { t.position = i + 1 })

    allStandings.set(groupLabel, sorted)
  }

  // Collect qualifiers: 1st, 2nd from each group + best 8 third-place teams
  const groupWinners: Map<string, TeamStanding> = new Map()
  const groupRunners: Map<string, TeamStanding> = new Map()
  const thirdPlace: TeamStanding[] = []

  for (const groupLabel of GROUPS) {
    const standings = allStandings.get(groupLabel) || []
    if (standings.length >= 1 && standings[0].played > 0) groupWinners.set(groupLabel, standings[0])
    if (standings.length >= 2 && standings[1].played > 0) groupRunners.set(groupLabel, standings[1])
    if (standings.length >= 3 && standings[2].played > 0) thirdPlace.push(standings[2])
  }

  // Sort third-place teams (best 8 qualify)
  thirdPlace.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
    return a.teamName.localeCompare(b.teamName)
  })

  const qualifiedThirds = thirdPlace.slice(0, 8)
  // Track which 3rd-place teams qualified, assign to R32 matches in order
  let thirdIdx = 0

  // Get our R32 match numbers (73-88)
  const r32Matches = await prisma.match.findMany({
    where: { stage: 'R32' },
    orderBy: { matchNumber: 'asc' },
    select: { id: true, matchNumber: true },
  })

  // Build the simulated R32 bracket
  const simulatedR32: SimulatedQualifier[] = []

  for (let i = 0; i < R32_BRACKET.length && i < r32Matches.length; i++) {
    const bracket = R32_BRACKET[i]
    const match = r32Matches[i]

    let homeTeam: SimulatedQualifier['homeTeam'] = null
    let awayTeam: SimulatedQualifier['awayTeam'] = null

    // Resolve home team
    if (bracket.home.startsWith('1')) {
      const group = bracket.home[1]
      const winner = groupWinners.get(group)
      if (winner) {
        homeTeam = { id: winner.teamId, name: winner.teamName, code: winner.teamCode, flagEmoji: winner.flagEmoji, source: `1o ${group}` }
      }
    } else if (bracket.home.startsWith('2')) {
      const group = bracket.home[1]
      const runner = groupRunners.get(group)
      if (runner) {
        homeTeam = { id: runner.teamId, name: runner.teamName, code: runner.teamCode, flagEmoji: runner.flagEmoji, source: `2o ${group}` }
      }
    }

    // Resolve away team
    if (bracket.away === '3rd') {
      if (thirdIdx < qualifiedThirds.length) {
        const third = qualifiedThirds[thirdIdx]
        awayTeam = { id: third.teamId, name: third.teamName, code: third.teamCode, flagEmoji: third.flagEmoji, source: `3o ${third.groupLabel}` }
        thirdIdx++
      }
    } else if (bracket.away.startsWith('2')) {
      const group = bracket.away[1]
      const runner = groupRunners.get(group)
      if (runner) {
        awayTeam = { id: runner.teamId, name: runner.teamName, code: runner.teamCode, flagEmoji: runner.flagEmoji, source: `2o ${group}` }
      }
    }

    simulatedR32.push({
      matchNumber: match.matchNumber,
      homeTeam,
      awayTeam,
    })
  }

  return {
    standings: Object.fromEntries(allStandings),
    qualifiedThirds: qualifiedThirds.map(t => ({
      teamId: t.teamId, teamName: t.teamName, teamCode: t.teamCode,
      flagEmoji: t.flagEmoji, groupLabel: t.groupLabel,
      points: t.points, goalDifference: t.goalDifference, goalsFor: t.goalsFor,
    })),
    simulatedR32,
    totalPredictions: groupMatches.reduce((sum, m) => sum + (m.predictions?.length || 0), 0),
    totalGroupMatches: groupMatches.length,
  }
}
