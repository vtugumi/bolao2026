import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const { inviteCode } = body

  if (!inviteCode || typeof inviteCode !== 'string') {
    return NextResponse.json({ error: 'Codigo de convite e obrigatorio' }, { status: 400 })
  }

  const group = await prisma.privateGroup.findUnique({
    where: { inviteCode: inviteCode.trim().toUpperCase() },
    include: {
      _count: {
        select: { members: true }
      }
    }
  })

  if (!group) {
    return NextResponse.json({ error: 'Grupo nao encontrado com este codigo' }, { status: 404 })
  }

  const existingMember = await prisma.groupMember.findUnique({
    where: {
      userId_groupId: {
        userId: user.id,
        groupId: group.id
      }
    }
  })

  if (existingMember) {
    return NextResponse.json({ error: 'Voce ja e membro deste grupo' }, { status: 409 })
  }

  await prisma.groupMember.create({
    data: {
      userId: user.id,
      groupId: group.id
    }
  })

  const updatedGroup = await prisma.privateGroup.findUnique({
    where: { id: group.id },
    include: {
      _count: {
        select: { members: true }
      }
    }
  })

  return NextResponse.json({
    id: group.id,
    name: group.name,
    inviteCode: group.inviteCode,
    memberCount: updatedGroup!._count.members,
    createdAt: group.createdAt
  })
}
