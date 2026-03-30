import { prisma } from './prisma'

interface TeamStanding {
  teamId: number
  teamName: string
  teamCode: string
  flagEmoji: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

export async function calculateGroupStandings(groupLabel: string): Promise<TeamStanding[]> {
  const teams = await prisma.team.findMany({
    where: { groupLabel }
  })

  const matches = await prisma.match.findMany({
    where: {
      groupLabel,
      stage: 'GROUP',
      homeScore: { not: null },
      awayScore: { not: null }
    }
  })

  const standings: Map<number, TeamStanding> = new Map()

  for (const team of teams) {
    standings.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      teamCode: team.code,
      flagEmoji: team.flagEmoji,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    })
  }

  for (const match of matches) {
    if (match.homeTeamId == null || match.awayTeamId == null) continue
    if (match.homeScore == null || match.awayScore == null) continue

    const home = standings.get(match.homeTeamId)
    const away = standings.get(match.awayTeamId)
    if (!home || !away) continue

    home.played++
    away.played++
    home.goalsFor += match.homeScore
    home.goalsAgainst += match.awayScore
    away.goalsFor += match.awayScore
    away.goalsAgainst += match.homeScore

    if (match.homeScore > match.awayScore) {
      home.won++
      home.points += 3
      away.lost++
    } else if (match.homeScore < match.awayScore) {
      away.won++
      away.points += 3
      home.lost++
    } else {
      home.drawn++
      away.drawn++
      home.points += 1
      away.points += 1
    }
  }

  const result = Array.from(standings.values())
  result.forEach(t => {
    t.goalDifference = t.goalsFor - t.goalsAgainst
  })

  // Sort: points desc, goal diff desc, goals for desc
  result.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
    // Head-to-head would go here for full FIFA rules
    return a.teamName.localeCompare(b.teamName)
  })

  return result
}
