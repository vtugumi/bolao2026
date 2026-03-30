import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

function generateInviteCode(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const alphanumeric = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 3; i++) {
    code += letters[Math.floor(Math.random() * letters.length)]
  }
  code += '-'
  for (let i = 0; i < 4; i++) {
    code += alphanumeric[Math.floor(Math.random() * alphanumeric.length)]
  }
  return code
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  }

  const groups = await prisma.privateGroup.findMany({
    where: {
      members: {
        some: { userId: user.id }
      }
    },
    include: {
      _count: {
        select: { members: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  const result = groups.map(g => ({
    id: g.id,
    name: g.name,
    inviteCode: g.inviteCode,
    memberCount: g._count.members,
    createdAt: g.createdAt
  }))

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const { name } = body

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Nome do grupo e obrigatorio' }, { status: 400 })
  }

  let inviteCode = generateInviteCode()
  let attempts = 0
  while (attempts < 10) {
    const existing = await prisma.privateGroup.findUnique({ where: { inviteCode } })
    if (!existing) break
    inviteCode = generateInviteCode()
    attempts++
  }

  const group = await prisma.privateGroup.create({
    data: {
      name: name.trim(),
      inviteCode,
      creatorId: user.id,
      members: {
        create: {
          userId: user.id
        }
      }
    },
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
    memberCount: group._count.members,
    createdAt: group.createdAt
  }, { status: 201 })
}
