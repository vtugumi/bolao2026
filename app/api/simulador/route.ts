import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { SCORING } from '@/lib/constants'

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  }

  const groupIdParam = request.nextUrl.searchParams.get('groupId')
  if (!groupIdParam) {
    return NextResponse.json({ error: 'groupId obrigatorio' }, { status: 400 })
  }

  const groupId = parseInt(groupIdParam, 10)
  if (isNaN(groupId)) {
    return NextResponse.json({ error: 'groupId invalido' }, { status: 400 })
  }

  const group = await prisma.privateGroup.findUnique({
    where: { id: groupId },
    include: { members: true }
  })
  if (!group) {
    return NextResponse.json({ error: 'Grupo nao encontrado' }, { status: 404 })
  }

  const isMember = group.members.some(m => m.userId === user.userId)
  if (!isMember) {
    return NextResponse.json({ error: 'Voce nao e membro deste grupo' }, { status: 403 })
  }

  const memberUserIds = group.members.map(m => m.userId)

  // Get semifinal matches to determine the bracket
  const sfMatches = await prisma.match.findMany({
    where: { stage: { in: ['SF', '3RD', 'FINAL'] } },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { matchNumber: 'asc' },
  })

  const semifinalists: { code: string; name: string; id: number }[] = []
  const sf1 = sfMatches.find(m => m.matchNumber === 101)
  const sf2 = sfMatches.find(m => m.matchNumber === 102)

  if (sf1?.homeTeam) semifinalists.push({ code: sf1.homeTeam.code, name: sf1.homeTeam.name, id: sf1.homeTeamId! })
  if (sf1?.awayTeam) semifinalists.push({ code: sf1.awayTeam.code, name: sf1.awayTeam.name, id: sf1.awayTeamId! })
  if (sf2?.homeTeam) semifinalists.push({ code: sf2.homeTeam.code, name: sf2.homeTeam.name, id: sf2.homeTeamId! })
  if (sf2?.awayTeam) semifinalists.push({ code: sf2.awayTeam.code, name: sf2.awayTeam.name, id: sf2.awayTeamId! })

  const sfCodes = semifinalists.map(t => t.code)

  // Get all users with predictions and bonus
  const users = await prisma.user.findMany({
    where: { id: { in: memberUserIds } },
    include: {
      predictions: {
        where: { match: { homeScore: { not: null } } },
        select: { points: true, match: { select: { stage: true } } },
      },
      bonusPredictions: true,
    },
  })

  // Normalize team name to code
  const nameToCode: Record<string, string> = {}
  const allTeams = await prisma.team.findMany({ select: { code: true, name: true } })
  for (const t of allTeams) {
    nameToCode[t.name.toLowerCase()] = t.code
    nameToCode[t.code.toLowerCase()] = t.code
  }

  function normalizeTeam(value: string): string | null {
    const lower = value.trim().toLowerCase()
    if (nameToCode[lower]) return nameToCode[lower]
    // Fuzzy match for common Portuguese names
    for (const [name, code] of Object.entries(nameToCode)) {
      if (lower.includes(name) || name.includes(lower)) return code
    }
    return value.toUpperCase()
  }

  const members = users.map(u => {
    const totalPoints = u.predictions
      .filter(p => p.points !== null)
      .reduce((sum, p) => sum + (p.points || 0), 0)

    const bonuses: Record<string, string> = {}
    for (const bp of u.bonusPredictions) {
      if (['CHAMPION', 'RUNNER_UP', 'THIRD_PLACE', 'FOURTH_PLACE'].includes(bp.type)) {
        bonuses[bp.type] = normalizeTeam(bp.value) || bp.value
      } else {
        bonuses[bp.type] = bp.value
      }
    }

    return {
      name: u.name,
      pts: totalPoints,
      c: bonuses['CHAMPION'] || null,
      v: bonuses['RUNNER_UP'] || null,
      t: bonuses['THIRD_PLACE'] || null,
      f: bonuses['FOURTH_PLACE'] || null,
      s: bonuses['TOP_SCORER'] || null,
    }
  }).sort((a, b) => b.pts - a.pts)

  // Top scorer candidates (from actual tournament data)
  // This could come from the API but for now we'll compute from settings or return empty
  // The page will handle scorer selection UI

  return NextResponse.json({
    group: { id: group.id, name: group.name },
    semifinalists,
    sf1: { home: sf1?.homeTeam?.code, away: sf1?.awayTeam?.code },
    sf2: { home: sf2?.homeTeam?.code, away: sf2?.awayTeam?.code },
    bonusPoints: SCORING.BONUS,
    members,
  })
}
