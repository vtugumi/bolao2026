import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    if (!user.isAdmin) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

    const { predictionId, userId, matchId } = await request.json()

    if (predictionId) {
      await prisma.prediction.delete({ where: { id: predictionId } })
      return NextResponse.json({ message: `Palpite ${predictionId} deletado.` })
    }

    if (userId && matchId) {
      await prisma.prediction.delete({
        where: { userId_matchId: { userId, matchId } },
      })
      return NextResponse.json({ message: `Palpite do usuario ${userId} no jogo ${matchId} deletado.` })
    }

    return NextResponse.json({ error: 'predictionId ou (userId + matchId) obrigatorio.' }, { status: 400 })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ error: 'Erro interno.', detail: String(error) }, { status: 500 })
  }
}
