import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

// R32 bracket: matchNumber → { home source, away source }
const R32_SOURCES: Record<number, { home: string; away: string }> = {
  73: { home: '2A', away: '2B' },
  74: { home: '1E', away: '3rd' },
  75: { home: '1F', away: '2C' },
  76: { home: '1C', away: '2F' },
  77: { home: '1I', away: '3rd' },
  78: { home: '2E', away: '2I' },
  79: { home: '1A', away: '3rd' },
  80: { home: '1L', away: '3rd' },
  81: { home: '1D', away: '3rd' },
  82: { home: '1G', away: '3rd' },
  83: { home: '2K', away: '2L' },
  84: { home: '1H', away: '2J' },
  85: { home: '1B', away: '3rd' },
  86: { home: '1J', away: '2H' },
  87: { home: '1K', away: '3rd' },
  88: { home: '2D', away: '2G' },
}

async function getCompletedGroups(): Promise<Set<string>> {
  const groupCounts = await prisma.match.groupBy({
    by: ['groupLabel'],
    where: { stage: 'GROUP', homeScore: { not: null } },
    _count: true,
  })
  const completed = new Set<string>()
  for (const g of groupCounts) {
    if (g.groupLabel && g._count === 6) completed.add(g.groupLabel)
  }
  return completed
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage')
    const groupLabel = searchParams.get('groupLabel')
    const search = searchParams.get('search')

    const user = await getSessionUser(request)

    const where: Record<string, unknown> = {}
    const view = searchParams.get('view')

    let orderOverride: Record<string, string> | null = null

    if (view === 'today') {
      const brDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      const startOfDay = new Date(`${brDate}T07:00:00Z`)
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
      where.dateTime = { gte: startOfDay, lt: endOfDay }
    } else if (view === 'upcoming') {
      where.homeScore = null
    } else if (view === 'recent') {
      where.homeScore = { not: null }
      orderOverride = { dateTime: 'desc' }
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
      orderBy: orderOverride || { dateTime: 'asc' },
    })

    const hasR32 = matches.some(m => m.stage === 'R32')
    let completedGroups: Set<string> | null = null
    if (hasR32) {
      completedGroups = await getCompletedGroups()
    }

    const result = matches.map((match) => {
      const { predictions, ...rest } = match as typeof match & { predictions?: unknown[] }
      const base: Record<string, unknown> = {
        ...rest,
        userPrediction: predictions?.[0] ?? null,
      }

      if (match.stage === 'R32' && completedGroups) {
        const src = R32_SOURCES[match.matchNumber]
        if (src) {
          const homeGroup = src.home.length === 2 ? src.home[1] : null
          const awayGroup = src.away === '3rd' ? null : (src.away.length === 2 ? src.away[1] : null)
          // 3rd-place is always provisional; group teams are provisional if group is incomplete
          base._provisionalHome = homeGroup ? !completedGroups.has(homeGroup) : true
          base._provisionalAway = awayGroup ? !completedGroups.has(awayGroup) : true
        }
      }

      return base
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
