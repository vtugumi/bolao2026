import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

// These are the 33 matches where home/away were swapped during schedule sync.
// For any prediction made BEFORE the swap, homeScore and awayScore are inverted.
const SWAPPED_MATCH_NUMBERS = [
  2, 5, 6, 7, 8, 12, 14, 15, 18, 22, 23, 25, 26, 30,
  32, 33, 36, 38, 41, 42, 44, 50, 51, 54, 56, 59, 60,
  61, 62, 66, 68, 69, 72
]

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    if (!user.isAdmin) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

    // Find all predictions on swapped matches
    const swappedMatches = await prisma.match.findMany({
      where: { matchNumber: { in: SWAPPED_MATCH_NUMBERS } },
      select: { id: true, matchNumber: true },
    })

    const matchIds = swappedMatches.map(m => m.id)

    const predictions = await prisma.prediction.findMany({
      where: { matchId: { in: matchIds } },
      include: {
        user: { select: { name: true } },
        match: {
          select: {
            matchNumber: true,
            homeTeam: { select: { code: true } },
            awayTeam: { select: { code: true } },
          },
        },
      },
    })

    return NextResponse.json({
      swappedMatchCount: swappedMatches.length,
      affectedPredictions: predictions.length,
      predictions: predictions.map(p => ({
        id: p.id,
        userName: p.user.name,
        match: `#${p.match.matchNumber} ${p.match.homeTeam?.code} vs ${p.match.awayTeam?.code}`,
        currentPrediction: `${p.homeScore}-${p.awayScore}`,
        wouldBecome: `${p.awayScore}-${p.homeScore}`,
      })),
    })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ error: 'Erro interno.', detail: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    if (!user.isAdmin) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

    const swappedMatches = await prisma.match.findMany({
      where: { matchNumber: { in: SWAPPED_MATCH_NUMBERS } },
      select: { id: true },
    })

    const matchIds = swappedMatches.map(m => m.id)

    const predictions = await prisma.prediction.findMany({
      where: { matchId: { in: matchIds } },
    })

    let fixed = 0
    for (const pred of predictions) {
      await prisma.prediction.update({
        where: { id: pred.id },
        data: {
          homeScore: pred.awayScore,
          awayScore: pred.homeScore,
        },
      })
      fixed++
    }

    return NextResponse.json({
      message: `${fixed} palpites corrigidos (home/away invertidos)`,
      fixed,
    })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ error: 'Erro interno.', detail: String(error) }, { status: 500 })
  }
}
