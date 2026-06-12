import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { getFinishedMatches } from '@/lib/football-api'
import { scorePrediction } from '@/lib/scoring'
import { KNOCKOUT_BRACKET, THIRD_PLACE_BRACKET } from '@/lib/knockout-bracket'

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    if (!user.isAdmin) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

    let finishedMatches
    try {
      finishedMatches = await getFinishedMatches()
    } catch (apiError) {
      return NextResponse.json({
        error: 'API football-data.org indisponivel',
        message: String(apiError),
      }, { status: 502 })
    }

    if (finishedMatches.length === 0) {
      return NextResponse.json({ message: 'Nenhum jogo finalizado encontrado na API.', synced: 0 })
    }

    const unscoredMatches = await prisma.match.findMany({
      where: { homeScore: null },
      include: {
        homeTeam: { select: { id: true, code: true, name: true } },
        awayTeam: { select: { id: true, code: true, name: true } },
      },
    })

    if (unscoredMatches.length === 0) {
      return NextResponse.json({ message: 'Todos os jogos ja possuem resultado.', synced: 0 })
    }

    const matchLookup = new Map<string, typeof unscoredMatches[0]>()
    for (const m of unscoredMatches) {
      if (m.homeTeam && m.awayTeam) {
        matchLookup.set(`${m.homeTeam.code}-${m.awayTeam.code}`, m)
      }
    }

    const synced: string[] = []

    for (const fm of finishedMatches) {
      const key = `${fm.homeTeamTla}-${fm.awayTeamTla}`
      const ourMatch = matchLookup.get(key)
      if (!ourMatch) continue

      const isKnockout = ourMatch.stage !== 'GROUP'
      const scoreHome = isKnockout && fm.regularHomeScore !== null ? fm.regularHomeScore : fm.homeScore
      const scoreAway = isKnockout && fm.regularAwayScore !== null ? fm.regularAwayScore : fm.awayScore

      let winnerId: number | null = null
      if (isKnockout) {
        if (fm.winnerSide === 'HOME') winnerId = ourMatch.homeTeamId
        else if (fm.winnerSide === 'AWAY') winnerId = ourMatch.awayTeamId
        else if (fm.penaltiesHome !== null && fm.penaltiesAway !== null) {
          if (fm.penaltiesHome > fm.penaltiesAway) winnerId = ourMatch.homeTeamId
          else if (fm.penaltiesAway > fm.penaltiesHome) winnerId = ourMatch.awayTeamId
        } else if (fm.homeScore > fm.awayScore) winnerId = ourMatch.homeTeamId
        else if (fm.awayScore > fm.homeScore) winnerId = ourMatch.awayTeamId
      }

      await prisma.match.update({
        where: { id: ourMatch.id },
        data: {
          homeScore: scoreHome,
          awayScore: scoreAway,
          winnerId,
          homePenalties: fm.penaltiesHome,
          awayPenalties: fm.penaltiesAway,
        },
      })

      const predictions = await prisma.prediction.findMany({
        where: { matchId: ourMatch.id },
      })

      const result = { homeScore: scoreHome, awayScore: scoreAway, winnerId, stage: ourMatch.stage }

      for (const pred of predictions) {
        const points = scorePrediction(pred, result)
        await prisma.prediction.update({ where: { id: pred.id }, data: { points } })
      }

      if (isKnockout && winnerId) {
        const bracketEntry = KNOCKOUT_BRACKET[ourMatch.matchNumber]
        if (bracketEntry) {
          const nextMatch = await prisma.match.findFirst({
            where: { matchNumber: bracketEntry.nextMatch },
          })
          if (nextMatch) {
            await prisma.match.update({
              where: { id: nextMatch.id },
              data: bracketEntry.slot === 'home'
                ? { homeTeamId: winnerId }
                : { awayTeamId: winnerId },
            })
          }
        }

        const thirdEntry = THIRD_PLACE_BRACKET[ourMatch.matchNumber]
        if (thirdEntry) {
          const loserId = winnerId === ourMatch.homeTeamId
            ? ourMatch.awayTeamId
            : ourMatch.homeTeamId
          if (loserId) {
            const thirdMatch = await prisma.match.findFirst({
              where: { matchNumber: thirdEntry.nextMatch },
            })
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

      synced.push(
        `${ourMatch.homeTeam?.name} ${scoreHome}-${scoreAway} ${ourMatch.awayTeam?.name}` +
        (fm.penaltiesHome !== null ? ` (pen ${fm.penaltiesHome}-${fm.penaltiesAway})` : '') +
        ` → ${predictions.length} palpites pontuados`
      )
    }

    return NextResponse.json({
      message: synced.length > 0
        ? `${synced.length} resultado(s) sincronizado(s)!`
        : 'Nenhum resultado novo para sincronizar.',
      synced: synced.length,
      details: synced,
    })
  } catch (error) {
    console.error('Erro no sync manual:', error)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
