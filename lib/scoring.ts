// Scoring rules:
// GROUP STAGE: 0 (no pred), 1 (wrong), 2 (right outcome, wrong score), 5 (exact)
// KNOCKOUT: 0 (no pred), 1 (wrong all), 5 (right qualifier, wrong score), 8 (exact + right qualifier)

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
    return 5
  }
  // Right outcome (win/draw/loss)
  if (getOutcome(pred.homeScore, pred.awayScore) === getOutcome(result.homeScore, result.awayScore)) {
    return 2
  }
  // Wrong
  return 1
}

export function scoreKnockoutPrediction(pred: PredictionData, result: MatchResult): number {
  const exactScore = pred.homeScore === result.homeScore && pred.awayScore === result.awayScore
  const rightQualifier = pred.winnerId != null && pred.winnerId === result.winnerId

  if (exactScore && rightQualifier) return 8
  if (rightQualifier) return 5
  // Wrong qualifier
  return 1
}

export function scorePrediction(pred: PredictionData, result: MatchResult): number {
  if (result.stage === 'GROUP') {
    return scoreGroupPrediction(pred, result)
  }
  return scoreKnockoutPrediction(pred, result)
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
    switch (type) {
      case 'CHAMPION': return 20
      case 'RUNNER_UP': return 15
      case 'TOP_SCORER': return 15
      default: return 0
    }
  }
  return 0
}
