import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    if (!user.isAdmin) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const matchId = searchParams.get('matchId')
    const type = searchParams.get('type')
    const groupId = searchParams.get('groupId')

    // Get member user IDs if filtering by group
    let memberUserIds: number[] | null = null
    let groupName: string | null = null
    if (groupId) {
      const group = await prisma.privateGroup.findUnique({
        where: { id: parseInt(groupId, 10) },
        include: { members: { select: { userId: true } } },
      })
      if (!group) return NextResponse.json({ error: 'Grupo nao encontrado.' }, { status: 404 })
      memberUserIds = group.members.map(m => m.userId)
      groupName = group.name
    }

    if (type === 'bonus') {
      return await handleBonusPredictions(memberUserIds, groupName)
    }

    if (matchId) {
      return await handleMatchPredictions(parseInt(matchId, 10), memberUserIds, groupName)
    }

    return NextResponse.json({ error: 'Informe matchId ou type=bonus.' }, { status: 400 })
  } catch (error) {
    console.error('Erro ao gerar mensagem de compartilhamento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}

async function handleMatchPredictions(matchId: number, memberUserIds: number[] | null, groupName: string | null) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: true,
      awayTeam: true,
      predictions: {
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { user: { name: 'asc' } },
      },
    },
  })

  if (!match) {
    return NextResponse.json({ error: 'Partida nao encontrada.' }, { status: 404 })
  }

  // Filter predictions by group members
  let predictions = match.predictions
  if (memberUserIds) {
    predictions = predictions.filter(p => memberUserIds.includes(p.user.id))
  }

  const homeName = match.homeTeam?.name ?? 'A definir'
  const awayName = match.awayTeam?.name ?? 'A definir'

  const dateFormatted = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(match.dateTime))

  const lines: string[] = []
  lines.push(`⚽ PALPITES - Jogo #${match.matchNumber}`)
  if (groupName) lines.push(`📋 Grupo: ${groupName}`)
  lines.push(`${homeName} vs ${awayName}`)
  lines.push(dateFormatted)
  lines.push('')

  if (predictions.length === 0) {
    lines.push('Nenhum palpite registrado.')
  } else {
    const winnerIds = predictions
      .map((p) => p.winnerId)
      .filter((id): id is number => id !== null)

    const winnerTeams =
      winnerIds.length > 0
        ? await prisma.team.findMany({ where: { id: { in: winnerIds } } })
        : []
    const winnerMap = new Map(winnerTeams.map((t) => [t.id, t.name]))

    for (const pred of predictions) {
      let line = `👤 ${pred.user.name}: ${pred.homeScore}-${pred.awayScore}`
      if (pred.winnerId) {
        const winnerName = winnerMap.get(pred.winnerId) ?? '?'
        line += ` (classifica: ${winnerName})`
      }
      lines.push(line)
    }
  }

  lines.push('')
  lines.push('Boa sorte a todos! 🍀')

  return NextResponse.json({ message: lines.join('\n') })
}

async function handleBonusPredictions(memberUserIds: number[] | null, groupName: string | null) {
  const where = memberUserIds ? { userId: { in: memberUserIds } } : {}
  const bonusPredictions = await prisma.bonusPrediction.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: [{ user: { name: 'asc' } }, { type: 'asc' }],
  })

  const title = groupName
    ? `🏆 PALPITES BONUS - ${groupName}`
    : '🏆 PALPITES BONUS - Copa 2026'

  if (bonusPredictions.length === 0) {
    return NextResponse.json({
      message: `${title}\n\nNenhum palpite bonus registrado.\n\nBoa sorte a todos! 🍀`,
    })
  }

  const byUser = new Map<string, { type: string; value: string }[]>()
  for (const bp of bonusPredictions) {
    const name = bp.user.name
    if (!byUser.has(name)) byUser.set(name, [])
    byUser.get(name)!.push({ type: bp.type, value: bp.value })
  }

  const typeLabels: Record<string, string> = {
    CHAMPION: '🥇 Campeao',
    RUNNER_UP: '🥈 Vice',
    TOP_SCORER: '⚽ Artilheiro',
  }

  const lines: string[] = []
  lines.push(title)
  lines.push('')

  for (const [userName, preds] of byUser) {
    lines.push(`👤 ${userName}:`)
    for (const pred of preds) {
      const label = typeLabels[pred.type] ?? pred.type
      lines.push(`  ${label}: ${pred.value}`)
    }
    lines.push('')
  }

  lines.push('Boa sorte a todos! 🍀')

  return NextResponse.json({ message: lines.join('\n') })
}
