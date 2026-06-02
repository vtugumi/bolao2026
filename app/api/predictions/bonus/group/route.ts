import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    }

    // Check if tournament has started
    const tournamentStart = await prisma.setting.findUnique({
      where: { key: 'tournamentStartDate' },
    })

    if (tournamentStart) {
      const startDate = new Date(tournamentStart.value)
      if (new Date() < startDate) {
        return NextResponse.json({
          locked: false,
          message: 'Os palpites bonus serao revelados apos o inicio da Copa.',
        })
      }
    }

    // Get user's group IDs
    const memberships = await prisma.groupMember.findMany({
      where: { userId: user.id },
      select: { groupId: true },
    })

    if (memberships.length === 0) {
      return NextResponse.json({ locked: true, predictions: [] })
    }

    const groupIds = memberships.map(m => m.groupId)

    // Get all user IDs in those groups
    const groupMembers = await prisma.groupMember.findMany({
      where: { groupId: { in: groupIds } },
      select: { userId: true },
    })

    const memberUserIds = [...new Set(groupMembers.map(m => m.userId))]

    // Get all bonus predictions from those users
    const predictions = await prisma.bonusPrediction.findMany({
      where: { userId: { in: memberUserIds } },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: [{ type: 'asc' }, { user: { name: 'asc' } }],
    })

    // Group by type
    const byType: Record<string, Array<{ userName: string; value: string; points: number | null }>> = {}

    for (const p of predictions) {
      if (!byType[p.type]) byType[p.type] = []
      byType[p.type].push({
        userName: p.user.name,
        value: p.value,
        points: p.points,
      })
    }

    // Also get users who didn't make predictions
    const usersWithPredictions = new Set(predictions.map(p => p.userId))
    const allMembers = await prisma.user.findMany({
      where: { id: { in: memberUserIds }, isAdmin: false },
      select: { id: true, name: true },
    })
    const missingUsers = allMembers.filter(u => !usersWithPredictions.has(u.id)).map(u => u.name)

    return NextResponse.json({
      locked: true,
      byType,
      missingUsers,
      totalMembers: allMembers.length,
    })
  } catch (error) {
    console.error('Erro ao buscar bonus do grupo:', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
