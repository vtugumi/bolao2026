import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { calcBonusOdds, calcChampionshipOdds, OPTA_CHAMPION_PROB } from '@/lib/odds'

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    }

    // Get user's group members
    const memberships = await prisma.groupMember.findMany({
      where: { userId: user.id },
      select: { groupId: true },
    })

    let groupMemberIds: number[] = []
    if (memberships.length > 0) {
      const groupIds = memberships.map(m => m.groupId)
      const members = await prisma.groupMember.findMany({
        where: { groupId: { in: groupIds } },
        select: { userId: true },
      })
      groupMemberIds = [...new Set(members.map(m => m.userId))]
    }

    // Get all bonus predictions from group members
    const bonusPredictions = groupMemberIds.length > 0
      ? await prisma.bonusPrediction.findMany({
          where: { userId: { in: groupMemberIds } },
          select: { type: true, value: true },
        })
      : []

    // Group by type
    const byType: Record<string, Array<{ value: string }>> = {}
    for (const bp of bonusPredictions) {
      if (!byType[bp.type]) byType[bp.type] = []
      byType[bp.type].push({ value: bp.value })
    }

    // Get all teams for ranking odds
    const teams = await prisma.team.findMany({
      select: { code: true, name: true, flagEmoji: true },
      orderBy: { name: 'asc' },
    })

    // Calculate ranking-based championship odds
    const rankingOdds = calcChampionshipOdds(teams)

    // Opta championship probabilities (top 10)
    const optaOdds = teams
      .filter(t => OPTA_CHAMPION_PROB[t.code])
      .map(t => ({
        code: t.code,
        name: t.name,
        flagEmoji: t.flagEmoji,
        probability: OPTA_CHAMPION_PROB[t.code],
      }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 10)

    // Check if user already submitted bonus predictions
    const userBonus = await prisma.bonusPrediction.findMany({
      where: { userId: user.id },
      select: { type: true },
    })
    const userHasPredicted = userBonus.length > 0

    // Market odds cache for bonus markets
    const marketCache = await prisma.setting.findUnique({
      where: { key: 'market_odds_bonus' },
    })
    const marketOdds: Record<string, Array<{ value: string; odds: number }>> =
      marketCache ? JSON.parse(marketCache.value) : {}

    const result = {
      group: {
        CHAMPION: calcBonusOdds(byType['CHAMPION'] || []),
        RUNNER_UP: calcBonusOdds(byType['RUNNER_UP'] || []),
        THIRD_PLACE: calcBonusOdds(byType['THIRD_PLACE'] || []),
        FOURTH_PLACE: calcBonusOdds(byType['FOURTH_PLACE'] || []),
        TOP_SCORER: calcBonusOdds(byType['TOP_SCORER'] || []),
        BRAZIL_FIRST_GOAL: calcBonusOdds(byType['BRAZIL_FIRST_GOAL'] || []),
      },
      ranking: {
        CHAMPION: rankingOdds.slice(0, 10),
      },
      opta: {
        CHAMPION: optaOdds,
      },
      market: {
        CHAMPION: marketOdds['CHAMPION'] || [],
        TOP_SCORER: marketOdds['TOP_SCORER'] || [],
      },
      totalMembers: groupMemberIds.length,
      userHasPredicted,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching bonus odds:', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
