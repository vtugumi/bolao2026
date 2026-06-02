// Scoring rules:
// GROUP STAGE: 0 (no pred), 0 (wrong), 2 (right outcome, wrong score), 5 (exact)
// KNOCKOUT: 0 (no pred), 0 (wrong all), 5 (right qualifier, wrong score), 8 (exact + right qualifier)
// BONUS: champion 120, runner-up 80, top scorer 80, third place 50, fourth place 50

import { SCORING } from './constants'

interface MatchResult {
  homeScore: number
  awayScore: number
  winnerId: number | null // who advanced (knockout only)
  stage: string
}

interface PredictionData {
  homeScore: number
  awayScore: number
  winnerId: number | null
}

function getOutcome(home: number, away: number): 'home' | 'draw' | 'away' {
  if (home > away) return 'home'
  if (home < away) return 'away'
  return 'draw'
}

export function scoreGroupPrediction(pred: PredictionData, result: MatchResult): number {
  // Exact score
  if (pred.homeScore === result.homeScore && pred.awayScore === result.awayScore) {
    return SCORING.GROUP.EXACT
  }
  // Right outcome (win/draw/loss)
  if (getOutcome(pred.homeScore, pred.awayScore) === getOutcome(result.homeScore, result.awayScore)) {
    return SCORING.GROUP.OUTCOME
  }
  // Wrong
  return SCORING.GROUP.WRONG
}

export function scoreKnockoutPrediction(pred: PredictionData, result: MatchResult): number {
  const exactScore = pred.homeScore === result.homeScore && pred.awayScore === result.awayScore
  const rightQualifier = pred.winnerId != null && pred.winnerId === result.winnerId

  if (exactScore && rightQualifier) return SCORING.KNOCKOUT.EXACT
  if (rightQualifier) return SCORING.KNOCKOUT.QUALIFIER
  // Wrong qualifier
  return SCORING.KNOCKOUT.WRONG
}

export function scorePrediction(pred: PredictionData, result: MatchResult): number {
  if (result.stage === 'GROUP') {
    return scoreGroupPrediction(pred, result)
  }
  return scoreKnockoutPrediction(pred, result)
}

const BONUS_POINTS: Record<string, number> = {
  CHAMPION: SCORING.BONUS.CHAMPION,
  RUNNER_UP: SCORING.BONUS.RUNNER_UP,
  TOP_SCORER: SCORING.BONUS.TOP_SCORER,
  THIRD_PLACE: SCORING.BONUS.THIRD_PLACE,
  FOURTH_PLACE: SCORING.BONUS.FOURTH_PLACE,
}

export function scoreBonusPrediction(
  type: string,
  userValue: string,
  officialValue: string | null
): number | null {
  if (!officialValue) return null // not yet resolved

  const normalizedUser = userValue.trim().toLowerCase()
  const normalizedOfficial = officialValue.trim().toLowerCase()

  if (normalizedUser === normalizedOfficial) {
    return BONUS_POINTS[type] ?? 0
  }
  return 0
}
