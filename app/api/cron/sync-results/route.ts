import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getFinishedMatches, getUpcomingMatchTimes } from '@/lib/football-api'
import { scorePrediction } from '@/lib/scoring'
import { KNOCKOUT_BRACKET, THIRD_PLACE_BRACKET } from '@/lib/knockout-bracket'
import { populateR32Bracket } from '@/lib/populate-r32'

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

    // Skip outside match hours (07:00-15:00 UTC) to let Neon compute auto-suspend
    // WC 2026 matches kick off ~16:00-03:00 UTC, can end by ~05:30 UTC
    const hour = new Date().getUTCHours()
    if (hour >= 7 && hour < 15) {
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

    // Get unscored matches + recently scored knockout matches for re-verification
    // Re-verify knockout matches scored in the last 12 hours to catch premature/wrong API data
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000)
    const syncCandidates = await prisma.match.findMany({
      where: {
        OR: [
          { homeScore: null },
          {
            stage: { not: 'GROUP' },
            homeScore: { not: null },
            dateTime: { gte: twelveHoursAgo },
          },
        ],
      },
      include: {
        homeTeam: { select: { id: true, code: true } },
        awayTeam: { select: { id: true, code: true } },
      },
    })

    const unscoredCount = syncCandidates.filter(m => m.homeScore === null).length
    const reverifyCount = syncCandidates.length - unscoredCount
    const unscoredCodes = syncCandidates.map(m => `${m.homeTeam?.code}-${m.awayTeam?.code}`)
    console.log(`[sync] ${unscoredCount} unscored + ${reverifyCount} knockout re-verify candidates`)

    if (syncCandidates.length === 0) {
      return NextResponse.json({ message: 'All matches already have results', synced: 0 })
    }

    // Build a lookup: "homeCode-awayCode" → our match
    const matchLookup = new Map<string, typeof syncCandidates[0]>()
    for (const m of syncCandidates) {
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

      // Extra time detected but 90-min scores not yet populated by API.
      // Wait up to 4h for the API to fix it; after that, use fullTime as fallback.
      // The re-verification loop will correct the score later if API updates.
      if (isKnockout && fm.extraTimeIncomplete) {
        const kickoff = ourMatch.dateTime?.getTime() ?? 0
        const hoursSinceKickoff = (Date.now() - kickoff) / 3_600_000
        if (hoursSinceKickoff < 4) {
          console.log(`[sync] SKIP ${key}: ET incomplete, waiting for API (${hoursSinceKickoff.toFixed(1)}h since kickoff)`)
          continue
        }
        console.log(`[sync] FALLBACK ${key}: ET incomplete for ${hoursSinceKickoff.toFixed(1)}h, using fullTime as score`)
      }

      const isNew = ourMatch.homeScore === null

      // Pattern 3: API has NO regularTime at all for a knockout match that went to ET.
      // Detectable when: knockout, no regularTime, not extraTimeIncomplete, but penalties exist
      // (penalties prove ET happened, so fullTime includes ET goals — unusable as 90-min score).
      const noRegularTimeButETHappened = isKnockout &&
        fm.regularHomeScore === null && !fm.extraTimeIncomplete &&
        fm.penaltiesHome != null && fm.penaltiesAway != null

      // For re-verification of already-scored knockout matches:
      // Only update score if API provides valid regularTime.
      // If regularTime is absent, the existing DB score is authoritative (set by prior correct sync or manual fix).
      const skipScoreUpdate = isKnockout && !isNew && fm.regularHomeScore === null

      if (noRegularTimeButETHappened && isNew) {
        console.log(`[sync] SKIP ${key}: knockout with penalties but no regularTime — cannot determine 90-min score`)
        continue
      }

      const scoreHome = skipScoreUpdate ? ourMatch.homeScore! : (isKnockout && fm.regularHomeScore !== null ? fm.regularHomeScore : fm.homeScore)
      const scoreAway = skipScoreUpdate ? ourMatch.awayScore! : (isKnockout && fm.regularAwayScore !== null ? fm.regularAwayScore : fm.awayScore)

      // Determine winner (who advances) for knockout.
      // Each fallback runs independently — a tied penalty check must NOT
      // prevent the fullTime fallback from executing.
      let winnerId: number | null = null
      if (isKnockout) {
        if (fm.winnerSide === 'HOME') winnerId = ourMatch.homeTeamId
        else if (fm.winnerSide === 'AWAY') winnerId = ourMatch.awayTeamId

        if (!winnerId && fm.penaltiesHome != null && fm.penaltiesAway != null && fm.penaltiesHome !== fm.penaltiesAway) {
          winnerId = fm.penaltiesHome > fm.penaltiesAway ? ourMatch.homeTeamId : ourMatch.awayTeamId
        }

        if (!winnerId && fm.homeScore !== fm.awayScore) {
          winnerId = fm.homeScore > fm.awayScore ? ourMatch.homeTeamId : ourMatch.awayTeamId
        }

        if (winnerId && !fm.winnerSide) {
          const winnerCode = winnerId === ourMatch.homeTeamId ? ourMatch.homeTeam?.code : ourMatch.awayTeam?.code
          console.log(`[sync] DEDUCED winner for ${key}: ${winnerCode} (API winner field was null)`)
        }
      }

      // Knockout must have a winner — skip if we can't determine one
      if (isKnockout && !winnerId) {
        const kickoff = ourMatch.dateTime?.getTime() ?? 0
        const hoursSinceKickoff = (Date.now() - kickoff) / 3_600_000
        console.log(`[sync] STUCK ${key} (M${ourMatch.matchNumber}): knockout, no winner after ${hoursSinceKickoff.toFixed(1)}h. API: winner=${fm.winnerSide}, pen=${fm.penaltiesHome}-${fm.penaltiesAway}, ft=${fm.homeScore}-${fm.awayScore}`)
        continue
      }

      // Check if anything changed (for re-verification of recent knockout matches)
      const scoreChanged = ourMatch.homeScore !== scoreHome || ourMatch.awayScore !== scoreAway
      const winnerChanged = isKnockout && ourMatch.winnerId !== winnerId
      const penaltiesChanged = (ourMatch.homePenalties ?? null) !== (fm.penaltiesHome ?? null) ||
        (ourMatch.awayPenalties ?? null) !== (fm.penaltiesAway ?? null)

      if (skipScoreUpdate && (winnerChanged || penaltiesChanged)) {
        console.log(`[sync] PROTECT ${key}: keeping DB score ${ourMatch.homeScore}-${ourMatch.awayScore} (API has no regularTime), updating winner/penalties only`)
      }

      if (!isNew && !scoreChanged && !winnerChanged && !penaltiesChanged) {
        continue
      }

      if (!isNew) {
        const changes: string[] = []
        if (scoreChanged) changes.push(`score ${ourMatch.homeScore}-${ourMatch.awayScore} → ${scoreHome}-${scoreAway}`)
        if (winnerChanged) changes.push(`winner ${ourMatch.winnerId} → ${winnerId}`)
        if (penaltiesChanged) changes.push(`penalties ${ourMatch.homePenalties ?? '-'}-${ourMatch.awayPenalties ?? '-'} → ${fm.penaltiesHome ?? '-'}-${fm.penaltiesAway ?? '-'}`)
        console.log(`[sync] CORRECTION ${fm.homeTeamTla}-${fm.awayTeamTla}: ${changes.join(', ')}`)
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
            const currentTeamId = bracketEntry.slot === 'home' ? nextMatch.homeTeamId : nextMatch.awayTeamId
            if (currentTeamId !== winnerId) {
              await prisma.match.update({
                where: { id: nextMatch.id },
                data: bracketEntry.slot === 'home'
                  ? { homeTeamId: winnerId }
                  : { awayTeamId: winnerId },
              })
              await prisma.prediction.deleteMany({ where: { matchId: nextMatch.id } })
            }
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
              const currentTeamId = thirdEntry.slot === 'home' ? thirdMatch.homeTeamId : thirdMatch.awayTeamId
              if (currentTeamId !== loserId) {
                await prisma.match.update({
                  where: { id: thirdMatch.id },
                  data: thirdEntry.slot === 'home'
                    ? { homeTeamId: loserId }
                    : { awayTeamId: loserId },
                })
                await prisma.prediction.deleteMany({ where: { matchId: thirdMatch.id } })
              }
            }
          }
        }
      }

      synced.push(
        `${scoreChanged && !isNew ? 'CORRIGIDO: ' : ''}${fm.homeTeamTla} ${scoreHome}-${scoreAway} ${fm.awayTeamTla}` +
        (scoreChanged && !isNew ? ` (era ${ourMatch.homeScore}-${ourMatch.awayScore})` : '') +
        (fm.penaltiesHome !== null ? ` (pen ${fm.penaltiesHome}-${fm.penaltiesAway})` : '') +
        ` → ${predictions.length} palpites pontuados`
      )
    }

    if (unmatched.length > 0) {
      console.log(`[sync] Unmatched API codes (already scored or code mismatch): ${unmatched.join(', ')}`)
    }

    // Populate R32 bracket with qualified teams from group standings
    let r32Result = null
    try {
      r32Result = await populateR32Bracket()
    } catch (r32Error) {
      console.error('[sync] R32 population error:', r32Error)
    }

    // Sync dateTime for upcoming matches — runs at most once per hour
    const timeFixed: string[] = []
    let timeSyncSkipped = false
    try {
      const lastTimeSyncSetting = await prisma.setting.findUnique({ where: { key: 'last_time_sync' } })
      const lastTimeSync = lastTimeSyncSetting ? new Date(lastTimeSyncSetting.value).getTime() : 0
      const minutesSinceLastSync = (Date.now() - lastTimeSync) / 60_000

      if (minutesSinceLastSync < 55) {
        timeSyncSkipped = true
      } else {
        const upcoming = await getUpcomingMatchTimes()
        if (upcoming.length > 0) {
          const unscoredWithTeams = await prisma.match.findMany({
            where: { homeScore: null, homeTeamId: { not: null }, awayTeamId: { not: null } },
            include: {
              homeTeam: { select: { code: true } },
              awayTeam: { select: { code: true } },
            },
          })

          for (const dbMatch of unscoredWithTeams) {
            if (!dbMatch.homeTeam || !dbMatch.awayTeam) continue
            const apiMatch = upcoming.find(am =>
              (am.homeTeamTla === dbMatch.homeTeam!.code && am.awayTeamTla === dbMatch.awayTeam!.code) ||
              (am.homeTeamTla === dbMatch.awayTeam!.code && am.awayTeamTla === dbMatch.homeTeam!.code)
            )
            if (!apiMatch) continue

            const apiDate = new Date(apiMatch.utcDate)
            if (dbMatch.dateTime?.getTime() !== apiDate.getTime()) {
              await prisma.match.update({
                where: { id: dbMatch.id },
                data: { dateTime: apiDate },
              })
              timeFixed.push(`M${dbMatch.matchNumber} ${dbMatch.homeTeam.code}-${dbMatch.awayTeam.code}: ${dbMatch.dateTime?.toISOString()} → ${apiMatch.utcDate}`)
              console.log(`[sync] TIME FIX M${dbMatch.matchNumber}: ${dbMatch.dateTime?.toISOString()} → ${apiMatch.utcDate}`)
            }
          }
        }

        await prisma.setting.upsert({
          where: { key: 'last_time_sync' },
          update: { value: new Date().toISOString() },
          create: { key: 'last_time_sync', value: new Date().toISOString() },
        })
      }
    } catch (timeErr) {
      console.error('[sync] Time sync error:', timeErr)
    }

    return NextResponse.json({
      message: synced.length > 0
        ? `${synced.length} resultado(s) sincronizado(s)`
        : 'Nenhum resultado novo para sincronizar',
      synced: synced.length,
      details: synced,
      timeFixed: timeSyncSkipped ? 'skipped (< 1h since last sync)' : timeFixed,
      r32: r32Result,
      debug: { apiMatches: apiMatchCodes, unscoredInDb: unscoredCodes, unmatched },
    })
  } catch (error) {
    console.error('Erro no sync de resultados:', error)
    return NextResponse.json({ error: 'Erro interno', message: String(error) }, { status: 500 })
  }
}
