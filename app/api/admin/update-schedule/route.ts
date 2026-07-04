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

    // KNOCKOUT MATCHES: match by team codes (not ordinal position!)
    // Match numbers follow bracket topology, NOT chronological order,
    // so positional mapping assigns wrong times to wrong matches.
    const ourKnockoutMatches = ourMatches.filter(m => m.stage !== 'GROUP')
    const apiKnockoutMatches = apiMatches.filter(m => m.stage !== 'GROUP_STAGE')

    for (const ourMatch of ourKnockoutMatches) {
      if (!ourMatch.homeTeam || !ourMatch.awayTeam) continue
      const ourHome = ourMatch.homeTeam.code
      const ourAway = ourMatch.awayTeam.code

      const apiMatch = apiKnockoutMatches.find(am =>
        (am.homeTeam?.tla === ourHome && am.awayTeam?.tla === ourAway) ||
        (am.homeTeam?.tla === ourAway && am.awayTeam?.tla === ourHome)
      )

      if (apiMatch) {
        const newDate = new Date(apiMatch.utcDate)
        if (ourMatch.dateTime?.getTime() !== newDate.getTime()) {
          await prisma.match.update({
            where: { id: ourMatch.id },
            data: { dateTime: newDate },
          })
          updated.push(`#${ourMatch.matchNumber} ${ourHome}-${ourAway} → ${apiMatch.utcDate}`)
        }
      } else {
        notFound.push(`#${ourMatch.matchNumber} ${ourHome} vs ${ourAway}`)
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
