import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Sync market odds from the-odds-api.com
 * Fetches odds for FIFA World Cup matches and caches them in Settings
 *
 * Called manually or via cron. Uses ~2-3 API credits per call.
 * Free tier: 500 credits/month → can call ~150-200 times
 */

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4'
const SPORT_KEY = 'soccer_fifa_world_cup' // Will be active when tournament starts

// Alternative sport keys to try
const SPORT_KEYS = [
  'soccer_fifa_world_cup',
  'soccer_fifa_world_cup_winner', // Outright winner market
]

interface OddsApiOutcome {
  name: string
  price: number
}

interface OddsApiBookmaker {
  key: string
  title: string
  markets: Array<{
    key: string
    outcomes: OddsApiOutcome[]
  }>
}

interface OddsApiEvent {
  id: string
  sport_key: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers: OddsApiBookmaker[]
}

// Map API team names to our team codes
const TEAM_NAME_TO_CODE: Record<string, string> = {
  'Mexico': 'MEX', 'South Korea': 'KOR', 'South Africa': 'RSA', 'Czech Republic': 'CZE',
  'Czechia': 'CZE', 'Canada': 'CAN', 'Switzerland': 'SUI', 'Qatar': 'QAT',
  'Bosnia and Herzegovina': 'BIH', 'Bosnia': 'BIH', 'Brazil': 'BRA', 'Morocco': 'MAR',
  'Scotland': 'SCO', 'Haiti': 'HAI', 'United States': 'USA', 'USA': 'USA',
  'Paraguay': 'PAR', 'Australia': 'AUS', 'Turkey': 'TUR', 'Türkiye': 'TUR',
  'Germany': 'GER', 'Ecuador': 'ECU', 'Ivory Coast': 'CIV', 'Côte d\'Ivoire': 'CIV',
  'Curacao': 'CUW', 'Curaçao': 'CUW', 'Netherlands': 'NED', 'Holland': 'NED',
  'Japan': 'JPN', 'Tunisia': 'TUN', 'Sweden': 'SWE', 'Belgium': 'BEL',
  'Iran': 'IRN', 'Egypt': 'EGY', 'New Zealand': 'NZL', 'Spain': 'ESP',
  'Uruguay': 'URY', 'Saudi Arabia': 'KSA', 'Cape Verde': 'CPV', 'Cabo Verde': 'CPV',
  'France': 'FRA', 'Senegal': 'SEN', 'Norway': 'NOR', 'Iraq': 'IRQ',
  'Argentina': 'ARG', 'Austria': 'AUT', 'Algeria': 'ALG', 'Jordan': 'JOR',
  'Portugal': 'POR', 'Colombia': 'COL', 'Uzbekistan': 'UZB', 'DR Congo': 'COD',
  'Congo DR': 'COD', 'England': 'ENG', 'Croatia': 'CRO', 'Panama': 'PAN', 'Ghana': 'GHA',
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  // Simple auth (same pattern as sync-results)
  if (secret !== process.env.CRON_SECRET && !process.env.ODDS_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.ODDS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ODDS_API_KEY not configured' }, { status: 500 })
  }

  try {
    // 1. Fetch match odds (h2h = 1x2 market)
    const matchOdds: Record<string, { homeWin: number; draw: number; awayWin: number }> = {}

    for (const sportKey of SPORT_KEYS) {
      try {
        const url = `${ODDS_API_BASE}/sports/${sportKey}/odds/?apiKey=${apiKey}&regions=eu&markets=h2h&oddsFormat=decimal`
        const res = await fetch(url)

        if (!res.ok) {
          console.log(`Sport ${sportKey}: ${res.status} ${res.statusText}`)
          continue
        }

        const events: OddsApiEvent[] = await res.json()
        console.log(`Sport ${sportKey}: ${events.length} events found`)

        // Get our matches for mapping
        const ourMatches = await prisma.match.findMany({
          include: { homeTeam: true, awayTeam: true },
        })

        for (const event of events) {
          const homeCode = TEAM_NAME_TO_CODE[event.home_team]
          const awayCode = TEAM_NAME_TO_CODE[event.away_team]

          if (!homeCode || !awayCode) {
            console.log(`Unknown team: ${event.home_team} vs ${event.away_team}`)
            continue
          }

          // Find matching match in our DB
          const match = ourMatches.find(m =>
            (m.homeTeam?.code === homeCode && m.awayTeam?.code === awayCode) ||
            (m.homeTeam?.code === awayCode && m.awayTeam?.code === homeCode)
          )

          if (!match) continue

          // Average odds across bookmakers
          let totalHome = 0, totalDraw = 0, totalAway = 0, count = 0

          for (const bm of event.bookmakers) {
            const h2h = bm.markets.find(m => m.key === 'h2h')
            if (!h2h) continue

            const homeOutcome = h2h.outcomes.find(o => o.name === event.home_team)
            const drawOutcome = h2h.outcomes.find(o => o.name === 'Draw')
            const awayOutcome = h2h.outcomes.find(o => o.name === event.away_team)

            if (homeOutcome && drawOutcome && awayOutcome) {
              // Check if teams are swapped vs our DB
              const isSwapped = match.homeTeam?.code === awayCode
              totalHome += isSwapped ? awayOutcome.price : homeOutcome.price
              totalDraw += drawOutcome.price
              totalAway += isSwapped ? homeOutcome.price : awayOutcome.price
              count++
            }
          }

          if (count > 0) {
            matchOdds[String(match.matchNumber)] = {
              homeWin: Math.round((totalHome / count) * 100) / 100,
              draw: Math.round((totalDraw / count) * 100) / 100,
              awayWin: Math.round((totalAway / count) * 100) / 100,
            }
          }
        }
      } catch (err) {
        console.log(`Error fetching ${sportKey}:`, err)
      }
    }

    // 2. Fetch outright winner odds (for bonus predictions)
    const bonusOdds: Record<string, Array<{ value: string; odds: number }>> = {}

    try {
      const url = `${ODDS_API_BASE}/sports/soccer_fifa_world_cup_winner/odds/?apiKey=${apiKey}&regions=eu&markets=outrights&oddsFormat=decimal`
      const res = await fetch(url)

      if (res.ok) {
        const events: OddsApiEvent[] = await res.json()

        for (const event of events) {
          for (const bm of event.bookmakers) {
            const outright = bm.markets.find(m => m.key === 'outrights')
            if (!outright) continue

            // Use first bookmaker's outrights
            if (!bonusOdds['CHAMPION']) {
              bonusOdds['CHAMPION'] = outright.outcomes
                .map(o => ({ value: o.name, odds: o.price }))
                .sort((a, b) => a.odds - b.odds)
                .slice(0, 15)
            }
            break
          }
        }
      }
    } catch (err) {
      console.log('Error fetching outrights:', err)
    }

    // 3. Save to database cache
    await prisma.setting.upsert({
      where: { key: 'market_odds_cache' },
      update: { value: JSON.stringify(matchOdds) },
      create: { key: 'market_odds_cache', value: JSON.stringify(matchOdds) },
    })

    if (Object.keys(bonusOdds).length > 0) {
      await prisma.setting.upsert({
        where: { key: 'market_odds_bonus' },
        update: { value: JSON.stringify(bonusOdds) },
        create: { key: 'market_odds_bonus', value: JSON.stringify(bonusOdds) },
      })
    }

    // Check remaining credits
    const creditsHeader = 'x-requests-remaining' // the-odds-api returns this header

    return NextResponse.json({
      message: 'Odds sincronizadas com sucesso',
      matchOddsCount: Object.keys(matchOdds).length,
      bonusMarketsCount: Object.keys(bonusOdds).length,
      matchOdds,
      bonusOdds,
    })
  } catch (error) {
    console.error('Error syncing odds:', error)
    return NextResponse.json({ error: 'Erro ao sincronizar odds.' }, { status: 500 })
  }
}
