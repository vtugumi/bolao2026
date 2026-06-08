import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { calcBonusOdds, calcChampionshipOdds } from '@/lib/odds'

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
        CHAMPION: userHasPredicted ? calcBonusOdds(byType['CHAMPION'] || []) : [],
        RUNNER_UP: userHasPredicted ? calcBonusOdds(byType['RUNNER_UP'] || []) : [],
        THIRD_PLACE: userHasPredicted ? calcBonusOdds(byType['THIRD_PLACE'] || []) : [],
        FOURTH_PLACE: userHasPredicted ? calcBonusOdds(byType['FOURTH_PLACE'] || []) : [],
        TOP_SCORER: userHasPredicted ? calcBonusOdds(byType['TOP_SCORER'] || []) : [],
      },
      ranking: {
        // Top 10 teams by championship probability
        CHAMPION: rankingOdds.slice(0, 10),
        RUNNER_UP: rankingOdds.slice(0, 10),
        THIRD_PLACE: rankingOdds.slice(0, 10),
        FOURTH_PLACE: rankingOdds.slice(0, 10),
      },
      market: marketOdds,
      totalMembers: groupMemberIds.length,
      userHasPredicted,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching bonus odds:', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
