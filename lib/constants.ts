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
  GROUP: { NONE: 0, WRONG: 1, OUTCOME: 2, EXACT: 5 },
  KNOCKOUT: { NONE: 0, WRONG: 1, QUALIFIER: 5, EXACT: 8 },
  BONUS: { CHAMPION: 20, RUNNER_UP: 15, TOP_SCORER: 15 },
} as const

export const KNOCKOUT_STAGES = ['R32', 'R16', 'QF', 'SF', '3RD', 'FINAL'] as const
