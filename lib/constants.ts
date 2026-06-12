export const STAGES = {
  GROUP: 'Fase de Grupos',
  R32: '16 avos de Final',
  R16: 'Oitavas de Final',
  QF: 'Quartas de Final',
  SF: 'Semifinal',
  '3RD': 'Disputa de 3o Lugar',
  FINAL: 'Final',
} as const

export const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const

export const SCORING = {
  GROUP: { NONE: 0, WRONG: 0, OUTCOME: 2, EXACT: 5 },
  KNOCKOUT: { NONE: 0, WRONG: 0, QUALIFIER: 5, EXACT: 8 },
  BONUS: {
    CHAMPION: 60,
    RUNNER_UP: 40,
    TOP_SCORER: 40,
    THIRD_PLACE: 25,
    FOURTH_PLACE: 25,
    BRAZIL_FIRST_GOAL: 25,
  },
} as const

export const KNOCKOUT_STAGES = ['R32', 'R16', 'QF', 'SF', '3RD', 'FINAL'] as const
