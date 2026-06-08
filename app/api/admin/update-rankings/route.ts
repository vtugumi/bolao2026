import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { FIFA_RANKING_POINTS } from '@/lib/odds'

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin only.' }, { status: 403 })
    }

    const teams = await prisma.team.findMany()
    let updated = 0

    for (const team of teams) {
      const ranking = FIFA_RANKING_POINTS[team.code]
      if (ranking && ranking !== team.fifaRanking) {
        await prisma.team.update({
          where: { id: team.id },
          data: { fifaRanking: ranking },
        })
        updated++
      }
    }

    return NextResponse.json({
      message: `Rankings FIFA atualizados: ${updated} times.`,
      updated,
      total: teams.length,
    })
  } catch (error) {
    console.error('Erro ao atualizar rankings:', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
