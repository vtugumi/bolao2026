import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { calcGroupOdds, calcRankingOdds } from '@/lib/odds'

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    const { searchParams } = new URL(request.url)
    const matchId = searchParams.get('matchId')
    const stage = searchParams.get('stage')
    const groupLabel = searchParams.get('groupLabel')

    // Build match filter
    const where: Record<string, unknown> = {}
    if (matchId) {
      where.id = parseInt(matchId)
    } else {
      if (stage) where.stage = stage
      if (groupLabel) where.groupLabel = groupLabel
    }

    const matches = await prisma.match.findMany({
      where,
      include: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: { dateTime: 'asc' },
    })

    // Get user's group members for group odds
    let groupMemberIds: number[] = []
    if (user) {
      const memberships = await prisma.groupMember.findMany({
        where: { userId: user.id },
        select: { groupId: true },
      })
      if (memberships.length > 0) {
        const groupIds = memberships.map(m => m.groupId)
        const members = await prisma.groupMember.findMany({
          where: { groupId: { in: groupIds } },
          select: { userId: true },
        })
        groupMemberIds = [...new Set(members.map(m => m.userId))]
      }
    }

    // Get all predictions for these matches (from group members only)
    const matchIds = matches.map(m => m.id)
    const predictions = groupMemberIds.length > 0
      ? await prisma.prediction.findMany({
          where: {
            matchId: { in: matchIds },
            userId: { in: groupMemberIds },
          },
          select: { matchId: true, userId: true, homeScore: true, awayScore: true },
        })
      : []

    // Group predictions by match
    const predsByMatch: Record<number, Array<{ userId: number; homeScore: number; awayScore: number }>> = {}
    for (const p of predictions) {
      if (!predsByMatch[p.matchId]) predsByMatch[p.matchId] = []
      predsByMatch[p.matchId].push({ userId: p.userId, homeScore: p.homeScore, awayScore: p.awayScore })
    }

    // Check for cached market odds
    const marketOddsCache = await prisma.setting.findUnique({
      where: { key: 'market_odds_cache' },
    })
    const marketOdds: Record<string, { homeWin: number; draw: number; awayWin: number }> =
      marketOddsCache ? JSON.parse(marketOddsCache.value) : {}

    // Build response
    const result = matches.map(m => {
      const homeCode = m.homeTeam?.code || ''
      const awayCode = m.awayTeam?.code || ''
      const matchPreds = predsByMatch[m.id] || []

      // Real teams = both homeTeamId and awayTeamId set in DB (not simulated)
      const hasRealTeams = m.homeTeamId !== null && m.awayTeamId !== null

      // Group & Market odds: ONLY when real teams are defined
      // (simulated knockout matches have different teams per user → stats are meaningless)
      // Group odds: always show (helps user decide before predicting)
      const showGroupOdds = hasRealTeams
      const showMarketOdds = hasRealTeams

      return {
        matchId: m.id,
        matchNumber: m.matchNumber,
        group: showGroupOdds ? calcGroupOdds(matchPreds) : null,
        ranking: homeCode && awayCode ? calcRankingOdds(homeCode, awayCode) : null,
        market: showMarketOdds ? (marketOdds[String(m.matchNumber)] || null) : null,
        totalGroupMembers: groupMemberIds.length,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching odds:', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
