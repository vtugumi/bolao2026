import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

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

/**
 * Calculate group standings based on the user's predictions.
 * For matches with real results, uses the real result.
 * For matches without results, uses the user's prediction.
 * This gives a "simulated" standings that blends reality + predictions.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ group: string }> }
) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    }

    const { group: groupLabel } = await params

    // Get all teams in this group
    const teams = await prisma.team.findMany({
      where: { groupLabel },
    })

    // Get all matches in this group with user's predictions
    const matches = await prisma.match.findMany({
      where: { groupLabel, stage: 'GROUP' },
      include: {
        predictions: {
          where: { userId: user.id },
          take: 1,
        },
      },
    })

    // Initialize standings
    const standings = new Map<number, TeamStanding>()
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
        points: 0,
      })
    }

    let predictedCount = 0

    for (const match of matches) {
      if (!match.homeTeamId || !match.awayTeamId) continue

      let homeScore: number | null = null
      let awayScore: number | null = null

      // Priority: real result > user prediction
      if (match.homeScore !== null && match.awayScore !== null) {
        homeScore = match.homeScore
        awayScore = match.awayScore
      } else if (match.predictions && match.predictions.length > 0) {
        const pred = match.predictions[0]
        homeScore = pred.homeScore
        awayScore = pred.awayScore
        predictedCount++
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
        home.won++
        home.points += 3
        away.lost++
      } else if (homeScore < awayScore) {
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

    // Sort: points desc, goal diff desc, goals for desc, name asc
    result.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
      return a.teamName.localeCompare(b.teamName)
    })

    return NextResponse.json({
      standings: result,
      predictedCount,
      totalMatches: matches.length,
      isSimulated: predictedCount > 0,
    })
  } catch (error) {
    console.error('Erro ao calcular classificacao simulada:', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
