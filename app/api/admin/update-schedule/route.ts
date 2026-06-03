import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

const API_BASE = 'https://api.football-data.org/v4'

interface ApiMatch {
  id: number
  utcDate: string
  stage: string
  group: string | null
  homeTeam: { tla: string } | null
  awayTeam: { tla: string } | null
}

const STAGE_MAP: Record<string, string> = {
  'GROUP_STAGE': 'GROUP',
  'LAST_32': 'R32', 'ROUND_OF_32': 'R32',
  'LAST_16': 'R16', 'ROUND_OF_16': 'R16',
  'QUARTER_FINALS': 'QF',
  'SEMI_FINALS': 'SF',
  'THIRD_PLACE': '3RD',
  'FINAL': 'FINAL',
}

// Venue mapping based on official FIFA schedule
// Mapped by UTC date to city/stadium
const VENUE_MAP: Record<string, string> = {
  // We'll match by the combination of stage + order within stage
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    if (!user.isAdmin) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

    const apiKey = process.env.FOOTBALL_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'FOOTBALL_API_KEY nao configurada.' }, { status: 500 })

    // Fetch all matches from API
    const res = await fetch(`${API_BASE}/competitions/WC/matches?season=2026`, {
      headers: { 'X-Auth-Token': apiKey },
    })

    if (!res.ok) {
      return NextResponse.json({ error: `API error: ${res.status}` }, { status: 502 })
    }

    const data = await res.json()
    const apiMatches: ApiMatch[] = data.matches

    // Get all our matches with teams
    const ourMatches = await prisma.match.findMany({
      include: {
        homeTeam: { select: { code: true } },
        awayTeam: { select: { code: true } },
      },
      orderBy: { matchNumber: 'asc' },
    })

    const updated: string[] = []
    const notFound: string[] = []

    // For group matches: match by home team code + away team code
    const groupApiMatches = apiMatches.filter(m => m.stage === 'GROUP_STAGE')
    const ourGroupMatches = ourMatches.filter(m => m.stage === 'GROUP')

    for (const ourMatch of ourGroupMatches) {
      if (!ourMatch.homeTeam || !ourMatch.awayTeam) continue

      const apiMatch = groupApiMatches.find(am =>
        am.homeTeam?.tla === ourMatch.homeTeam!.code &&
        am.awayTeam?.tla === ourMatch.awayTeam!.code
      )

      if (apiMatch) {
        await prisma.match.update({
          where: { id: ourMatch.id },
          data: {
            dateTime: new Date(apiMatch.utcDate),
          },
        })
        updated.push(`#${ourMatch.matchNumber} ${ourMatch.homeTeam.code} vs ${ourMatch.awayTeam.code} → ${apiMatch.utcDate}`)
      } else {
        notFound.push(`#${ourMatch.matchNumber} ${ourMatch.homeTeam.code} vs ${ourMatch.awayTeam.code}`)
      }
    }

    // For knockout matches: match by stage + order within stage
    const knockoutStages = ['R32', 'R16', 'QF', 'SF', '3RD', 'FINAL']

    for (const stage of knockoutStages) {
      const apiStageMatches = apiMatches
        .filter(am => (STAGE_MAP[am.stage] || am.stage) === stage)
        .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())

      const ourStageMatches = ourMatches
        .filter(m => m.stage === stage)
        .sort((a, b) => a.matchNumber - b.matchNumber)

      for (let i = 0; i < Math.min(apiStageMatches.length, ourStageMatches.length); i++) {
        await prisma.match.update({
          where: { id: ourStageMatches[i].id },
          data: {
            dateTime: new Date(apiStageMatches[i].utcDate),
          },
        })
        updated.push(`#${ourStageMatches[i].matchNumber} ${stage}[${i+1}] → ${apiStageMatches[i].utcDate}`)
      }
    }

    return NextResponse.json({
      message: `${updated.length} jogos atualizados`,
      updated: updated.length,
      notFound: notFound.length,
      details: updated.slice(0, 20),
      missing: notFound,
    })
  } catch (error) {
    console.error('Erro ao atualizar calendario:', error)
    return NextResponse.json({ error: 'Erro interno.', detail: String(error) }, { status: 500 })
  }
}
