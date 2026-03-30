import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage')
    const groupLabel = searchParams.get('groupLabel')
    const search = searchParams.get('search')

    const user = await getSessionUser(request)

    const where: Record<string, unknown> = {}
    if (stage) where.stage = stage
    if (groupLabel) where.groupLabel = groupLabel
    if (search) {
      where.OR = [
        { homeTeam: { name: { contains: search, mode: 'insensitive' } } },
        { awayTeam: { name: { contains: search, mode: 'insensitive' } } },
        { venue: { contains: search, mode: 'insensitive' } },
      ]
    }

    const matches = await prisma.match.findMany({
      where,
      include: {
        homeTeam: true,
        awayTeam: true,
        ...(user
          ? {
              predictions: {
                where: { userId: user.id },
                take: 1,
              },
            }
          : {}),
      },
      orderBy: { matchNumber: 'asc' },
    })

    const result = matches.map((match) => {
      const { predictions, ...rest } = match as typeof match & { predictions?: unknown[] }
      return {
        ...rest,
        userPrediction: predictions?.[0] ?? null,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao listar partidas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
