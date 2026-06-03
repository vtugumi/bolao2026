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
        user: { select: { name: true } },
        match: {
          select: {
            matchNumber: true, groupLabel: true,
            homeTeam: { select: { name: true, code: true } },
            awayTeam: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { id: 'asc' },
    })

    return NextResponse.json({
      total: predictions.length,
      predictions: predictions.map(p => ({
        userName: p.user.name,
        match: `#${p.match.matchNumber} ${p.match.homeTeam?.code || '?'} vs ${p.match.awayTeam?.code || '?'}`,
        prediction: `${p.homeScore}-${p.awayScore}`,
        group: p.match.groupLabel,
      })),
    })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ error: 'Erro interno.', detail: String(error) }, { status: 500 })
  }
}
