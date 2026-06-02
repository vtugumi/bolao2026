import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    if (!user.isAdmin) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: 'userId obrigatorio.' }, { status: 400 })

    // Prevent deleting yourself
    if (userId === user.id) {
      return NextResponse.json({ error: 'Nao pode deletar a si mesmo.' }, { status: 400 })
    }

    const target = await prisma.user.findUnique({ where: { id: userId } })
    if (!target) return NextResponse.json({ error: 'Usuario nao encontrado.' }, { status: 404 })

    // Delete in order: predictions, bonus, group members, then user
    await prisma.prediction.deleteMany({ where: { userId } })
    await prisma.bonusPrediction.deleteMany({ where: { userId } })
    await prisma.groupMember.deleteMany({ where: { userId } })
    await prisma.user.delete({ where: { id: userId } })

    return NextResponse.json({ message: `Usuario "${target.name}" deletado com sucesso.` })
  } catch (error) {
    console.error('Erro ao deletar usuario:', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
