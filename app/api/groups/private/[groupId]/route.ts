import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { calculateRankings } from '@/lib/rankings'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const user = await getSessionUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  }

  const { groupId } = await params
  const groupIdNum = parseInt(groupId, 10)

  if (isNaN(groupIdNum)) {
    return NextResponse.json({ error: 'ID de grupo invalido' }, { status: 400 })
  }

  const group = await prisma.privateGroup.findUnique({
    where: { id: groupIdNum },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { joinedAt: 'asc' }
      },
      creator: {
        select: { id: true, name: true }
      }
    }
  })

  if (!group) {
    return NextResponse.json({ error: 'Grupo nao encontrado' }, { status: 404 })
  }

  const isMember = group.members.some(m => m.user.id === user.id)
  if (!isMember) {
    return NextResponse.json({ error: 'Voce nao e membro deste grupo' }, { status: 403 })
  }

  const memberUserIds = group.members.map(m => m.user.id)
  const rankings = await calculateRankings(memberUserIds)

  return NextResponse.json({
    id: group.id,
    name: group.name,
    inviteCode: group.inviteCode,
    creatorId: group.creatorId,
    creatorName: group.creator.name,
    memberCount: group.members.length,
    members: group.members.map(m => ({
      id: m.user.id,
      name: m.user.name,
      joinedAt: m.joinedAt
    })),
    rankings
  })
}
