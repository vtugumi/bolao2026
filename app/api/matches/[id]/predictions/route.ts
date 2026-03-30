import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request)
    if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

    const { id } = await params
    const matchId = parseInt(id)
    if (isNaN(matchId)) {
      return NextResponse.json({ error: 'ID invalido.' }, { status: 400 })
    }

    // Check match exists and has started
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, dateTime: true, homeScore: true },
    })
    if (!match) {
      return NextResponse.json({ error: 'Partida nao encontrada.' }, { status: 404 })
    }

    const matchStarted = new Date(match.dateTime) <= new Date()
    const hasResult = match.homeScore !== null
    if (!matchStarted && !hasResult) {
      return NextResponse.json({ error: 'Palpites so ficam visiveis apos o inicio do jogo.' }, { status: 403 })
    }

    // Find all groups the user is a member of
    const userGroups = await prisma.groupMember.findMany({
      where: { userId: user.id },
      select: { groupId: true },
    })

    if (userGroups.length === 0) {
      // User is not in any group - show only their own prediction
      const ownPred = await prisma.prediction.findUnique({
        where: { userId_matchId: { userId: user.id, matchId } },
        include: { user: { select: { id: true, name: true } } },
      })
      return NextResponse.json({
        predictions: ownPred ? [formatPrediction(ownPred, match.homeScore !== null)] : [],
        groups: [],
      })
    }

    // Get all member user IDs from all user's groups (deduplicated)
    const groupIds = userGroups.map(g => g.groupId)
    const groupMembers = await prisma.groupMember.findMany({
      where: { groupId: { in: groupIds } },
      select: { userId: true, group: { select: { id: true, name: true } } },
    })

    const memberUserIds = [...new Set(groupMembers.map(m => m.userId))]
    const groupNames = [...new Map(groupMembers.map(m => [m.group.id, m.group.name])).values()]

    // Fetch predictions from all group members for this match
    const predictions = await prisma.prediction.findMany({
      where: {
        matchId,
        userId: { in: memberUserIds },
      },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { user: { name: 'asc' } },
    })

    // Get winner team names for knockout predictions
    const winnerIds = predictions
      .map(p => p.winnerId)
      .filter((id): id is number => id !== null)

    const winnerTeams = winnerIds.length > 0
      ? await prisma.team.findMany({ where: { id: { in: winnerIds } } })
      : []
    const winnerMap = new Map(winnerTeams.map(t => [t.id, t.name]))

    return NextResponse.json({
      predictions: predictions.map(p => formatPrediction(p, hasResult, winnerMap)),
      groups: groupNames,
    })
  } catch (error) {
    console.error('Erro ao buscar palpites do jogo:', error)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function formatPrediction(
  p: any,
  hasResult: boolean,
  winnerMap?: Map<number, string>
) {
  return {
    userName: p.user.name,
    userId: p.user.id,
    homeScore: p.homeScore,
    awayScore: p.awayScore,
    winnerId: p.winnerId,
    winnerName: p.winnerId && winnerMap ? winnerMap.get(p.winnerId) ?? null : null,
    points: hasResult ? (p.points ?? 0) : null,
  }
}
