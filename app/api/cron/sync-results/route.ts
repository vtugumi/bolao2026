import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getFinishedMatches } from '@/lib/football-api'
import { scorePrediction } from '@/lib/scoring'
import { KNOCKOUT_BRACKET, THIRD_PLACE_BRACKET } from '@/lib/knockout-bracket'

const CRON_SECRET = process.env.CRON_SECRET || ''

/**
 * Sync match results from football-data.org
 *
 * Called by external cron (cron-job.org) every 3 minutes during match days.
 * Protected by CRON_SECRET query parameter.
 *
 * Flow:
 * 1. Fetch all FINISHED matches from football-data.org
 * 2. For each, find the corresponding match in our DB by team codes
 * 3. If our match has no result yet, save the score and calculate all prediction points
 * 4. Propagate knockout bracket winners
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('key')

    if (!CRON_SECRET || secret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Skip outside match hours (04:00-15:00 UTC) to let Neon compute auto-suspend
    // WC 2026 matches kick off ~16:00-01:00 UTC, can end by ~03:30 UTC
    const hour = new Date().getUTCHours()
    if (hour >= 4 && hour < 15) {
      return NextResponse.json({ message: 'Outside match window, skipping sync', skipped: true })
    }

    // Fetch finished matches from external API
    let finishedMatches
    try {
      finishedMatches = await getFinishedMatches()
    } catch (apiError) {
      console.error('football-data.org API failed:', apiError)
      return NextResponse.json({
        error: 'External API unavailable',
        message: String(apiError),
      }, { status: 502 })
    }

    const apiMatchCodes = finishedMatches.map(m => `${m.homeTeamTla}-${m.awayTeamTla}`)
    console.log(`[sync] API returned ${finishedMatches.length} finished matches: ${apiMatchCodes.join(', ')}`)

    if (finishedMatches.length === 0) {
      return NextResponse.json({ message: 'No finished matches found', synced: 0 })
    }

    // Get all our matches that DON'T have a result yet
    const unscoredMatches = await prisma.match.findMany({
      where: { homeScore: null },
      include: {
        homeTeam: { select: { id: true, code: true } },
        awayTeam: { select: { id: true, code: true } },
      },
    })

    const unscoredCodes = unscoredMatches.map(m => `${m.homeTeam?.code}-${m.awayTeam?.code}`)
    console.log(`[sync] ${unscoredMatches.length} unscored matches in DB: ${unscoredCodes.slice(0, 10).join(', ')}`)

    if (unscoredMatches.length === 0) {
      return NextResponse.json({ message: 'All matches already have results', synced: 0 })
    }

    // Build a lookup: "homeCode-awayCode" → our match
    const matchLookup = new Map<string, typeof unscoredMatches[0]>()
    for (const m of unscoredMatches) {
      if (m.homeTeam && m.awayTeam) {
        matchLookup.set(`${m.homeTeam.code}-${m.awayTeam.code}`, m)
      }
    }

    const synced: string[] = []
    const unmatched: string[] = []

    for (const fm of finishedMatches) {
      // Find our match by team codes
      const key = `${fm.homeTeamTla}-${fm.awayTeamTla}`
      const ourMatch = matchLookup.get(key)
      if (!ourMatch) {
        unmatched.push(key)
        continue
      }

      // For knockout: use regularTime score (90 min) for prediction comparison
      // The prediction system scores based on 90-min result
      const isKnockout = ourMatch.stage !== 'GROUP'
      const scoreHome = isKnockout && fm.regularHomeScore !== null ? fm.regularHomeScore : fm.homeScore
      const scoreAway = isKnockout && fm.regularAwayScore !== null ? fm.regularAwayScore : fm.awayScore

      // Determine winner (who advances) for knockout
      let winnerId: number | null = null
      if (isKnockout) {
        if (fm.winnerSide === 'HOME') winnerId = ourMatch.homeTeamId
        else if (fm.winnerSide === 'AWAY') winnerId = ourMatch.awayTeamId
        // If draw in regular time but someone won on penalties, check penalties
        else if (fm.penaltiesHome !== null && fm.penaltiesAway !== null) {
          if (fm.penaltiesHome > fm.penaltiesAway) winnerId = ourMatch.homeTeamId
          else if (fm.penaltiesAway > fm.penaltiesHome) winnerId = ourMatch.awayTeamId
        }
        // Fallback: if fullTime score has a winner
        else if (fm.homeScore > fm.awayScore) winnerId = ourMatch.homeTeamId
        else if (fm.awayScore > fm.homeScore) winnerId = ourMatch.awayTeamId
      }

      // Update match with result
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

      // Score all predictions for this match
      const predictions = await prisma.prediction.findMany({
        where: { matchId: ourMatch.id },
      })

      const result = {
        homeScore: scoreHome,
        awayScore: scoreAway,
        winnerId,
        stage: ourMatch.stage,
      }

      for (const pred of predictions) {
        const points = scorePrediction(pred, result)
        await prisma.prediction.update({
          where: { id: pred.id },
          data: { points },
        })
      }

      // Propagate winner in knockout bracket
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

        // SF: propagate loser to 3rd place match
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
        `${fm.homeTeamTla} ${scoreHome}-${scoreAway} ${fm.awayTeamTla}` +
        (fm.penaltiesHome !== null ? ` (pen ${fm.penaltiesHome}-${fm.penaltiesAway})` : '') +
        ` → ${predictions.length} palpites pontuados`
      )
    }

    if (unmatched.length > 0) {
      console.log(`[sync] Unmatched API codes (already scored or code mismatch): ${unmatched.join(', ')}`)
    }

    return NextResponse.json({
      message: synced.length > 0
        ? `${synced.length} resultado(s) sincronizado(s)`
        : 'Nenhum resultado novo para sincronizar',
      synced: synced.length,
      details: synced,
      debug: { apiMatches: apiMatchCodes, unscoredInDb: unscoredCodes, unmatched },
    })
  } catch (error) {
    console.error('Erro no sync de resultados:', error)
    return NextResponse.json({ error: 'Erro interno', message: String(error) }, { status: 500 })
  }
}
