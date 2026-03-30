import { prisma } from './prisma'
import crypto from 'crypto'

interface RankedUser {
  id: number
  name: string
  totalPoints: number
  exactScores: number
  bonusHits: number
  knockoutPoints: number
  tiebreakHash: string
  rank: number
}

export async function calculateRankings(userIds?: number[]): Promise<RankedUser[]> {
  const users = await prisma.user.findMany({
    where: userIds ? { id: { in: userIds } } : undefined,
    include: {
      predictions: {
        where: { points: { not: null } },
        include: { match: { select: { stage: true } } }
      },
      bonusPredictions: {
        where: { points: { not: null } }
      }
    }
  })

  const ranked: RankedUser[] = users.map(user => {
    const predPoints = user.predictions.reduce((sum, p) => sum + (p.points || 0), 0)
    const bonusPoints = user.bonusPredictions.reduce((sum, b) => sum + (b.points || 0), 0)
    const totalPoints = predPoints + bonusPoints

    const exactScores = user.predictions.filter(p => {
      if (p.match.stage === 'GROUP') return p.points === 5
      return p.points === 8
    }).length

    const bonusHits = user.bonusPredictions.filter(b => (b.points || 0) > 0).length

    const knockoutStages = ['R32', 'R16', 'QF', 'SF', '3RD', 'FINAL']
    const knockoutPoints = user.predictions
      .filter(p => knockoutStages.includes(p.match.stage))
      .reduce((sum, p) => sum + (p.points || 0), 0)

    const tiebreakHash = crypto
      .createHash('sha256')
      .update(`${user.id}-bolao2026`)
      .digest('hex')

    return {
      id: user.id,
      name: user.name,
      totalPoints,
      exactScores,
      bonusHits,
      knockoutPoints,
      tiebreakHash,
      rank: 0
    }
  })

  // Sort by tiebreaker criteria
  ranked.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
    if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores
    if (b.bonusHits !== a.bonusHits) return b.bonusHits - a.bonusHits
    if (b.knockoutPoints !== a.knockoutPoints) return b.knockoutPoints - a.knockoutPoints
    return a.tiebreakHash.localeCompare(b.tiebreakHash)
  })

  // Assign ranks
  ranked.forEach((user, index) => {
    user.rank = index + 1
  })

  return ranked
}
