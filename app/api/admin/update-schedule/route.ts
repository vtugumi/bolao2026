import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

const API_BASE = 'https://api.football-data.org/v4'

interface ApiMatch {
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

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    if (!user.isAdmin) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

    const apiKey = process.env.FOOTBALL_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'FOOTBALL_API_KEY nao configurada.' }, { status: 500 })

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
        homeTeam: { select: { id: true, code: true } },
        awayTeam: { select: { id: true, code: true } },
      },
      orderBy: { matchNumber: 'asc' },
    })

    // Build team code → ID mapping
    const allTeams = await prisma.team.findMany()
    const teamByCode = new Map(allTeams.map(t => [t.code, t.id]))

    const updated: string[] = []
    const swapped: string[] = []
    const notFound: string[] = []

    // GROUP MATCHES: match by team pair (regardless of home/away order)
    const groupApiMatches = apiMatches.filter(m => m.stage === 'GROUP_STAGE')
    const ourGroupMatches = ourMatches.filter(m => m.stage === 'GROUP')
    const usedApiIds = new Set<number>()

    for (const ourMatch of ourGroupMatches) {
      if (!ourMatch.homeTeam || !ourMatch.awayTeam) continue
      const ourHome = ourMatch.homeTeam.code
      const ourAway = ourMatch.awayTeam.code

      // Try exact match first
      let apiMatch = groupApiMatches.find((am, idx) =>
        !usedApiIds.has(idx) &&
        am.homeTeam?.tla === ourHome &&
        am.awayTeam?.tla === ourAway
      )
      let apiIdx = apiMatch ? groupApiMatches.indexOf(apiMatch) : -1
      let needSwap = false

      // Try reversed match
      if (!apiMatch) {
        apiMatch = groupApiMatches.find((am, idx) =>
          !usedApiIds.has(idx) &&
          am.homeTeam?.tla === ourAway &&
          am.awayTeam?.tla === ourHome
        )
        apiIdx = apiMatch ? groupApiMatches.indexOf(apiMatch) : -1
        needSwap = !!apiMatch
      }

      if (apiMatch && apiIdx >= 0) {
        usedApiIds.add(apiIdx)

        const updateData: Record<string, unknown> = {
          dateTime: new Date(apiMatch.utcDate),
        }

        // Swap home/away to match FIFA schedule
        if (needSwap) {
          const apiHomeId = teamByCode.get(apiMatch.homeTeam!.tla)
          const apiAwayId = teamByCode.get(apiMatch.awayTeam!.tla)
          if (apiHomeId && apiAwayId) {
            updateData.homeTeamId = apiHomeId
            updateData.awayTeamId = apiAwayId
            swapped.push(`#${ourMatch.matchNumber} ${ourHome}↔${ourAway} → ${apiMatch.homeTeam!.tla} vs ${apiMatch.awayTeam!.tla}`)
          }
        }

        await prisma.match.update({
          where: { id: ourMatch.id },
          data: updateData,
        })
        updated.push(`#${ourMatch.matchNumber} ${apiMatch.homeTeam?.tla} vs ${apiMatch.awayTeam?.tla} → ${apiMatch.utcDate}`)
      } else {
        notFound.push(`#${ourMatch.matchNumber} ${ourHome} vs ${ourAway}`)
      }
    }

    // KNOCKOUT MATCHES: match by stage + chronological order
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
        updated.push(`#${ourStageMatches[i].matchNumber} ${stage}[${i + 1}] → ${apiStageMatches[i].utcDate}`)
      }
    }

    return NextResponse.json({
      message: `${updated.length} jogos atualizados, ${swapped.length} invertidos (home/away)`,
      updated: updated.length,
      swapped: swapped.length,
      notFound: notFound.length,
      swappedDetails: swapped,
      missing: notFound,
    })
  } catch (error) {
    console.error('Erro ao atualizar calendario:', error)
    return NextResponse.json({ error: 'Erro interno.', detail: String(error) }, { status: 500 })
  }
}
