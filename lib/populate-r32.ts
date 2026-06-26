import { prisma } from './prisma'
import { THIRD_PLACE_COMBINATIONS, THIRD_PLACE_MATCH_ORDER } from './third-place-combinations'

interface GroupStanding {
  teamId: number
  teamCode: string
  groupLabel: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  position: number
}

const R32_BRACKET: Array<{ matchNumber: number; home: string; away: string }> = [
  { matchNumber: 73, home: '2A', away: '2B' },
  { matchNumber: 74, home: '1E', away: '3rd' },
  { matchNumber: 75, home: '1F', away: '2C' },
  { matchNumber: 76, home: '1C', away: '2F' },
  { matchNumber: 77, home: '1I', away: '3rd' },
  { matchNumber: 78, home: '2E', away: '2I' },
  { matchNumber: 79, home: '1A', away: '3rd' },
  { matchNumber: 80, home: '1L', away: '3rd' },
  { matchNumber: 81, home: '1D', away: '3rd' },
  { matchNumber: 82, home: '1G', away: '3rd' },
  { matchNumber: 83, home: '2K', away: '2L' },
  { matchNumber: 84, home: '1H', away: '2J' },
  { matchNumber: 85, home: '1B', away: '3rd' },
  { matchNumber: 86, home: '1J', away: '2H' },
  { matchNumber: 87, home: '1K', away: '3rd' },
  { matchNumber: 88, home: '2D', away: '2G' },
]

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

function calculateStandings(
  teams: Array<{ id: number; code: string; groupLabel: string }>,
  matches: Array<{ homeTeamId: number | null; awayTeamId: number | null; homeScore: number | null; awayScore: number | null }>,
  groupLabel: string
): GroupStanding[] {
  const groupTeams = teams.filter(t => t.groupLabel === groupLabel)
  const groupMatches = matches.filter(m =>
    m.homeScore !== null && m.awayScore !== null &&
    groupTeams.some(t => t.id === m.homeTeamId)
  )

  const standings = new Map<number, GroupStanding>()
  for (const team of groupTeams) {
    standings.set(team.id, {
      teamId: team.id,
      teamCode: team.code,
      groupLabel,
      played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
      position: 0,
    })
  }

  for (const match of groupMatches) {
    if (!match.homeTeamId || !match.awayTeamId) continue
    const home = standings.get(match.homeTeamId)
    const away = standings.get(match.awayTeamId)
    if (!home || !away) continue

    home.played++
    away.played++
    home.goalsFor += match.homeScore!
    home.goalsAgainst += match.awayScore!
    away.goalsFor += match.awayScore!
    away.goalsAgainst += match.homeScore!

    if (match.homeScore! > match.awayScore!) {
      home.won++; home.points += 3; away.lost++
    } else if (match.homeScore! < match.awayScore!) {
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
    return a.teamCode.localeCompare(b.teamCode)
  })
  sorted.forEach((t, i) => { t.position = i + 1 })

  return sorted
}

export async function populateR32Bracket(): Promise<{
  updated: string[]
  thirdPlaceKey: string | null
  completedGroups: string[]
  skipped: string[]
}> {
  const allTeamsRaw = await prisma.team.findMany({
    select: { id: true, code: true, name: true, groupLabel: true },
  })
  const allTeams = allTeamsRaw.filter((t): t is typeof t & { groupLabel: string } => t.groupLabel !== null)

  const groupMatches = await prisma.match.findMany({
    where: { stage: 'GROUP' },
    select: { homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true, groupLabel: true },
  })

  const r32Matches = await prisma.match.findMany({
    where: { stage: 'R32' },
    orderBy: { matchNumber: 'asc' },
    select: { id: true, matchNumber: true, homeTeamId: true, awayTeamId: true },
  })

  const r32ByNumber = new Map(r32Matches.map(m => [m.matchNumber, m]))

  const groupWinners = new Map<string, number>()
  const groupRunners = new Map<string, number>()
  const thirdPlaceTeams: GroupStanding[] = []
  const completedGroups: string[] = []

  for (const group of GROUPS) {
    const matchesInGroup = groupMatches.filter(m => m.groupLabel === group)
    const finishedCount = matchesInGroup.filter(m => m.homeScore !== null).length

    if (finishedCount === 0) continue

    const standings = calculateStandings(allTeams, matchesInGroup, group)
    if (standings.length < 3) continue

    if (finishedCount === 6) {
      completedGroups.push(group)
      groupWinners.set(group, standings[0].teamId)
      groupRunners.set(group, standings[1].teamId)
    } else if (finishedCount >= 4) {
      // Incomplete group but has enough data for provisional standings
      groupWinners.set(group, standings[0].teamId)
      groupRunners.set(group, standings[1].teamId)
    }

    if (standings[2].played > 0) {
      thirdPlaceTeams.push(standings[2])
    }
  }

  // Rank third-place teams
  thirdPlaceTeams.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
    return a.teamCode.localeCompare(b.teamCode)
  })

  const qualifiedThirds = thirdPlaceTeams.slice(0, 8)
  const qualifiedGroupKey = qualifiedThirds.map(t => t.groupLabel).sort().join('')

  // Look up third-place assignment from FIFA combination table
  const combinationValue = THIRD_PLACE_COMBINATIONS[qualifiedGroupKey]
  const thirdPlaceForMatch = new Map<number, string>()
  if (combinationValue) {
    THIRD_PLACE_MATCH_ORDER.forEach((matchNum, i) => {
      thirdPlaceForMatch.set(matchNum, combinationValue[i])
    })
  }

  const thirdByGroup = new Map<string, number>()
  for (const t of qualifiedThirds) {
    thirdByGroup.set(t.groupLabel, t.teamId)
  }

  const updated: string[] = []
  const skipped: string[] = []

  for (const bracket of R32_BRACKET) {
    const r32Match = r32ByNumber.get(bracket.matchNumber)
    if (!r32Match) continue

    let newHomeTeamId: number | null = null
    let newAwayTeamId: number | null = null

    // Resolve home team
    if (bracket.home.startsWith('1')) {
      const group = bracket.home[1]
      newHomeTeamId = groupWinners.get(group) ?? null
    } else if (bracket.home.startsWith('2')) {
      const group = bracket.home[1]
      newHomeTeamId = groupRunners.get(group) ?? null
    }

    // Resolve away team
    if (bracket.away === '3rd') {
      const assignedGroup = thirdPlaceForMatch.get(bracket.matchNumber)
      if (assignedGroup) {
        newAwayTeamId = thirdByGroup.get(assignedGroup) ?? null
      }
    } else if (bracket.away.startsWith('2')) {
      const group = bracket.away[1]
      newAwayTeamId = groupRunners.get(group) ?? null
    }

    // Only update if we have new data
    const needsUpdate =
      (newHomeTeamId && r32Match.homeTeamId !== newHomeTeamId) ||
      (newAwayTeamId && r32Match.awayTeamId !== newAwayTeamId)

    if (!needsUpdate) {
      if (newHomeTeamId || newAwayTeamId) {
        skipped.push(`M${bracket.matchNumber}: already up-to-date`)
      }
      continue
    }

    const updateData: Record<string, number> = {}
    if (newHomeTeamId) updateData.homeTeamId = newHomeTeamId
    if (newAwayTeamId) updateData.awayTeamId = newAwayTeamId

    await prisma.match.update({
      where: { id: r32Match.id },
      data: updateData,
    })

    const homeTeam = allTeams.find(t => t.id === newHomeTeamId)
    const awayTeam = allTeams.find(t => t.id === newAwayTeamId)
    const homeName = homeTeam?.name ?? (r32Match.homeTeamId ? 'kept' : 'TBD')
    const awayName = awayTeam?.name ?? (r32Match.awayTeamId ? 'kept' : 'TBD')
    updated.push(`M${bracket.matchNumber}: ${bracket.home}=${homeName} vs ${bracket.away}=${awayName}`)
  }

  return {
    updated,
    thirdPlaceKey: combinationValue ? qualifiedGroupKey : null,
    completedGroups,
    skipped,
  }
}
