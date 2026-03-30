import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    if (!user.isAdmin) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

    const predictions = await prisma.bonusPrediction.findMany({
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: [{ type: 'asc' }, { user: { name: 'asc' } }],
    })

    return NextResponse.json({
      predictions: predictions.map(p => ({
        id: p.id,
        userId: p.user.id,
        userName: p.user.name,
        type: p.type,
        value: p.value,
        points: p.points,
      })),
    })
  } catch (error) {
    console.error('Erro ao buscar palpites bonus:', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
