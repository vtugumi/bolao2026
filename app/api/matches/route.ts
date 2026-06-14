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
    const view = searchParams.get('view')

    if (view === 'today') {
      // Use today's date in BRT but match window based on venue timezone (UTC-7)
      // All WC 2026 venues are in North America (UTC-7 to UTC-4)
      // Using UTC-7 ensures a 9pm Vancouver match stays on the correct FIFA matchday
      const brDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      const startOfDay = new Date(`${brDate}T07:00:00Z`) // midnight UTC-7
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
      where.dateTime = { gte: startOfDay, lt: endOfDay }
    } else if (view === 'upcoming') {
      where.homeScore = null
    } else {
      if (stage) where.stage = stage
      if (groupLabel) where.groupLabel = groupLabel
    }

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
      orderBy: { dateTime: 'asc' },
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
