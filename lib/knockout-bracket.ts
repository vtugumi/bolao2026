// Maps matchNumber -> { nextMatch, slot }
// R32: matches 73-88, R16: 89-96, QF: 97-100, SF: 101-102, 3RD: 103, FINAL: 104

export const KNOCKOUT_BRACKET: Record<number, { nextMatch: number; slot: 'home' | 'away' }> = {
  // R32 -> R16
  73: { nextMatch: 89, slot: 'home' },
  74: { nextMatch: 89, slot: 'away' },
  75: { nextMatch: 90, slot: 'home' },
  76: { nextMatch: 90, slot: 'away' },
  77: { nextMatch: 91, slot: 'home' },
  78: { nextMatch: 91, slot: 'away' },
  79: { nextMatch: 92, slot: 'home' },
  80: { nextMatch: 92, slot: 'away' },
  81: { nextMatch: 93, slot: 'home' },
  82: { nextMatch: 93, slot: 'away' },
  83: { nextMatch: 94, slot: 'home' },
  84: { nextMatch: 94, slot: 'away' },
  85: { nextMatch: 95, slot: 'home' },
  86: { nextMatch: 95, slot: 'away' },
  87: { nextMatch: 96, slot: 'home' },
  88: { nextMatch: 96, slot: 'away' },
  // R16 -> QF
  89: { nextMatch: 97, slot: 'home' },
  90: { nextMatch: 97, slot: 'away' },
  91: { nextMatch: 98, slot: 'home' },
  92: { nextMatch: 98, slot: 'away' },
  93: { nextMatch: 99, slot: 'home' },
  94: { nextMatch: 99, slot: 'away' },
  95: { nextMatch: 100, slot: 'home' },
  96: { nextMatch: 100, slot: 'away' },
  // QF -> SF
  97: { nextMatch: 101, slot: 'home' },
  98: { nextMatch: 101, slot: 'away' },
  99: { nextMatch: 102, slot: 'home' },
  100: { nextMatch: 102, slot: 'away' },
  // SF -> Final (winners) and 3RD (losers)
  101: { nextMatch: 104, slot: 'home' },
  102: { nextMatch: 104, slot: 'away' },
}

// SF losers go to 3rd place match
export const THIRD_PLACE_BRACKET: Record<number, { nextMatch: number; slot: 'home' | 'away' }> = {
  101: { nextMatch: 103, slot: 'home' },
  102: { nextMatch: 103, slot: 'away' },
}
