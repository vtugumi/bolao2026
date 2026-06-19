import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: rawId } = await params
    const userId = parseInt(rawId)
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'ID invalido.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario nao encontrado.' },
        { status: 404 }
      )
    }

    const now = new Date()

    // Only return predictions for matches that have already started
    const predictions = await prisma.prediction.findMany({
      where: {
        userId,
        match: {
          dateTime: { lte: now },
        },
      },
      include: {
        match: {
          include: {
            homeTeam: true,
            awayTeam: true,
          },
        },
      },
      orderBy: { match: { dateTime: 'asc' } },
    })

    // Only show bonus predictions after tournament starts
    const tournamentStart = await prisma.setting.findUnique({
      where: { key: 'tournamentStartDate' },
    })

    let bonusPredictions: { type: string; value: string; points: number | null }[] = []
    if (tournamentStart && new Date(tournamentStart.value) <= now) {
      bonusPredictions = await prisma.bonusPrediction.findMany({
        where: { userId },
        select: { type: true, value: true, points: true },
      })
    }

    const totalPoints =
      predictions.reduce((sum, p) => sum + (p.points ?? 0), 0) +
      bonusPredictions.reduce((sum, bp) => sum + (bp.points ?? 0), 0)

    return NextResponse.json({
      user,
      predictions,
      bonusPredictions,
      totalPoints,
    })
  } catch (error) {
    console.error('Erro ao buscar detalhes do ranking:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
