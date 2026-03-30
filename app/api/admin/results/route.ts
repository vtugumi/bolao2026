import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { scorePrediction } from '@/lib/scoring'
import { KNOCKOUT_BRACKET, THIRD_PLACE_BRACKET } from '@/lib/knockout-bracket'

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    if (!user.isAdmin) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

    const { matchId, homeScore, awayScore, winnerId, homePenalties, awayPenalties } = await request.json()

    if (!matchId || homeScore === undefined || awayScore === undefined) {
      return NextResponse.json({ error: 'matchId, homeScore e awayScore sao obrigatorios.' }, { status: 400 })
    }

    const match = await prisma.match.findUnique({ where: { id: matchId } })
    if (!match) return NextResponse.json({ error: 'Partida nao encontrada.' }, { status: 404 })

    // For knockout, determine winner from score if not provided
    let effectiveWinnerId = winnerId ?? null
    if (match.stage !== 'GROUP' && !effectiveWinnerId) {
      if (homeScore > awayScore) effectiveWinnerId = match.homeTeamId
      else if (awayScore > homeScore) effectiveWinnerId = match.awayTeamId
    }

    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        homeScore,
        awayScore,
        winnerId: effectiveWinnerId,
        homePenalties: homePenalties ?? null,
        awayPenalties: awayPenalties ?? null,
      },
    })

    // Score all predictions for this match
    const predictions = await prisma.prediction.findMany({ where: { matchId } })
    const result = { homeScore, awayScore, winnerId: effectiveWinnerId, stage: match.stage }

    for (const pred of predictions) {
      const points = scorePrediction(pred, result)
      await prisma.prediction.update({ where: { id: pred.id }, data: { points } })
    }

    // Propagate winner in knockout bracket
    if (match.stage !== 'GROUP' && effectiveWinnerId) {
      const bracketEntry = KNOCKOUT_BRACKET[match.matchNumber]
      if (bracketEntry) {
        const nextMatch = await prisma.match.findFirst({ where: { matchNumber: bracketEntry.nextMatch } })
        if (nextMatch) {
          await prisma.match.update({
            where: { id: nextMatch.id },
            data: bracketEntry.slot === 'home'
              ? { homeTeamId: effectiveWinnerId }
              : { awayTeamId: effectiveWinnerId },
          })
        }
      }

      // For SF, also propagate loser to 3rd place match
      const thirdEntry = THIRD_PLACE_BRACKET[match.matchNumber]
      if (thirdEntry) {
        const loserId = effectiveWinnerId === match.homeTeamId ? match.awayTeamId : match.homeTeamId
        if (loserId) {
          const thirdMatch = await prisma.match.findFirst({ where: { matchNumber: thirdEntry.nextMatch } })
          if (thirdMatch) {
            await prisma.match.update({
              where: { id: thirdMatch.id },
              data: thirdEntry.slot === 'home'
                ? { homeTeamId: loserId }
                : { awayTeamId: loserId },
            })
          }
        }
      }
    }

    return NextResponse.json({ match: updatedMatch, predictionsScored: predictions.length })
  } catch (error) {
    console.error('Erro ao registrar resultado:', error)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
