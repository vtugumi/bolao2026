// Maps matchNumber -> { nextMatch, slot }
// R32: matches 73-88, R16: 89-96, QF: 97-100, SF: 101-102, 3RD: 103, FINAL: 104
// Official FIFA R16 pairings: W74vsW77(M89), W73vsW75(M90), W76vsW78(M91), W79vsW80(M92),
//   W83vsW84(M93), W81vsW82(M94), W86vsW88(M95), W85vsW87(M96)

export const KNOCKOUT_BRACKET: Record<number, { nextMatch: number; slot: 'home' | 'away' }> = {
  // R32 -> R16 (official FIFA match number assignments)
  74: { nextMatch: 89, slot: 'home' },
  77: { nextMatch: 89, slot: 'away' },
  73: { nextMatch: 90, slot: 'home' },
  75: { nextMatch: 90, slot: 'away' },
  76: { nextMatch: 91, slot: 'home' },
  78: { nextMatch: 91, slot: 'away' },
  79: { nextMatch: 92, slot: 'home' },
  80: { nextMatch: 92, slot: 'away' },
  83: { nextMatch: 93, slot: 'home' },
  84: { nextMatch: 93, slot: 'away' },
  81: { nextMatch: 94, slot: 'home' },
  82: { nextMatch: 94, slot: 'away' },
  86: { nextMatch: 95, slot: 'home' },
  88: { nextMatch: 95, slot: 'away' },
  85: { nextMatch: 96, slot: 'home' },
  87: { nextMatch: 96, slot: 'away' },
  // R16 -> QF (official FIFA: M98 crosses to right side, M99 crosses to left)
  89: { nextMatch: 97, slot: 'home' },
  90: { nextMatch: 97, slot: 'away' },
  93: { nextMatch: 98, slot: 'home' },
  94: { nextMatch: 98, slot: 'away' },
  91: { nextMatch: 99, slot: 'home' },
  92: { nextMatch: 99, slot: 'away' },
  95: { nextMatch: 100, slot: 'home' },
  96: { nextMatch: 100, slot: 'away' },
  // QF -> SF
  97: { nextMatch: 101, slot: 'home' },
  98: { nextMatch: 101, slot: 'away' },
  99: { nextMatch: 102, slot: 'home' },
  100: { nextMatch: 102, slot: 'away' },
  // SF -> Final
  101: { nextMatch: 104, slot: 'home' },
  102: { nextMatch: 104, slot: 'away' },
}

// SF losers go to 3rd place match
export const THIRD_PLACE_BRACKET: Record<number, { nextMatch: number; slot: 'home' | 'away' }> = {
  101: { nextMatch: 103, slot: 'home' },
  102: { nextMatch: 103, slot: 'away' },
}
