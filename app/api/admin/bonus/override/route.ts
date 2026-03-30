import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    if (!user.isAdmin) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

    const { overrides } = await request.json()

    // overrides is Record<predictionId, points>
    if (!overrides || typeof overrides !== 'object') {
      return NextResponse.json({ error: 'Dados invalidos.' }, { status: 400 })
    }

    for (const [idStr, points] of Object.entries(overrides)) {
      const id = parseInt(idStr, 10)
      if (isNaN(id)) continue

      await prisma.bonusPrediction.update({
        where: { id },
        data: { points: points as number },
      })
    }

    return NextResponse.json({ message: 'Pontuacao atualizada com sucesso.' })
  } catch (error) {
    console.error('Erro ao atualizar pontuacao manual:', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
