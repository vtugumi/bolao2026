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
    if (userId === user.id) return NextResponse.json({ error: 'Nao pode deletar a si mesmo.' }, { status: 400 })

    const target = await prisma.user.findUnique({ where: { id: userId } })
    if (!target) return NextResponse.json({ error: 'Usuario nao encontrado.' }, { status: 404 })

    const log: string[] = []

    // 1. Delete predictions
    const delPreds = await prisma.prediction.deleteMany({ where: { userId } })
    log.push(`${delPreds.count} palpites deletados`)

    // 2. Delete bonus predictions
    const delBonus = await prisma.bonusPrediction.deleteMany({ where: { userId } })
    log.push(`${delBonus.count} bonus deletados`)

    // 3. Remove from all groups
    const delMembers = await prisma.groupMember.deleteMany({ where: { userId } })
    log.push(`${delMembers.count} membros removidos`)

    // 4. Transfer ownership of groups created by this user to admin (user.id)
    const ownedGroups = await prisma.privateGroup.findMany({ where: { creatorId: userId } })
    for (const g of ownedGroups) {
      await prisma.privateGroup.update({
        where: { id: g.id },
        data: { creatorId: user.id },
      })
      log.push(`Grupo "${g.name}" transferido para admin`)
    }

    // 5. Delete user
    await prisma.user.delete({ where: { id: userId } })
    log.push(`Usuario "${target.name}" deletado`)

    return NextResponse.json({ message: 'Limpeza concluida', log })
  } catch (error) {
    console.error('Erro na limpeza:', error)
    return NextResponse.json({ error: 'Erro interno.', detail: String(error) }, { status: 500 })
  }
}
