import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    if (!user.isAdmin) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

    const predictions = await prisma.prediction.findMany({
      include: {
        user: { select: { id: true, name: true } },
        match: {
          select: { matchNumber: true, stage: true, groupLabel: true },
          include: { homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } },
        },
      },
      orderBy: [{ userId: 'asc' }, { matchId: 'asc' }],
    })

    return NextResponse.json({
      total: predictions.length,
      predictions: predictions.map(p => ({
        id: p.id,
        userName: p.user.name,
        matchNumber: p.match.matchNumber,
        group: p.match.groupLabel,
        home: p.match.homeTeam?.name,
        away: p.match.awayTeam?.name,
        homeScore: p.homeScore,
        awayScore: p.awayScore,
      })),
    })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
