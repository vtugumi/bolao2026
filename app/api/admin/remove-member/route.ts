import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    if (!user.isAdmin) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

    const { userId, groupId } = await request.json()
    if (!userId || !groupId) {
      return NextResponse.json({ error: 'userId e groupId obrigatorios.' }, { status: 400 })
    }

    const member = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    })

    if (!member) {
      return NextResponse.json({ error: 'Membro nao encontrado.' }, { status: 404 })
    }

    await prisma.groupMember.delete({
      where: { id: member.id },
    })

    return NextResponse.json({ message: 'Membro removido com sucesso.' })
  } catch (error) {
    console.error('Erro ao remover membro:', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
