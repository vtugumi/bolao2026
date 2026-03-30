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
      select: { id: true, name: true, email: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado.' },
        { status: 404 }
      )
    }

    const predictions = await prisma.prediction.findMany({
      where: { userId },
      include: {
        match: {
          include: {
            homeTeam: true,
            awayTeam: true,
          },
        },
      },
      orderBy: { match: { matchNumber: 'asc' } },
    })

    const bonusPredictions = await prisma.bonusPrediction.findMany({
      where: { userId },
    })

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
