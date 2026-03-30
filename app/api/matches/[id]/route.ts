import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const matchId = parseInt(id)
    if (isNaN(matchId)) {
      return NextResponse.json({ error: 'ID invalido.' }, { status: 400 })
    }
    const user = await getSessionUser(request)

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: true,
        awayTeam: true,
        winner: true,
        ...(user
          ? {
              predictions: {
                where: { userId: user.id },
                take: 1,
              },
            }
          : {}),
      },
    })

    if (!match) {
      return NextResponse.json(
        { error: 'Partida não encontrada.' },
        { status: 404 }
      )
    }

    const { predictions, ...rest } = match as typeof match & { predictions?: unknown[] }
    return NextResponse.json({
      ...rest,
      userPrediction: predictions?.[0] ?? null,
    })
  } catch (error) {
    console.error('Erro ao buscar partida:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
