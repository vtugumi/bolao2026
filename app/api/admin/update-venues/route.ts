import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

// Official FIFA World Cup 2026 venue assignments
// Source: ESPN match pages + Wikipedia (verified June 2026)
// Mapped by team codes (home-away) for group matches, matchNumber for knockout

const GROUP_VENUES: Record<string, string> = {
  // GROUP A
  'MEX-RSA': 'Estadio Azteca, Cidade do Mexico',
  'KOR-CZE': 'Estadio Akron, Guadalajara',
  'CZE-RSA': 'Mercedes-Benz Stadium, Atlanta',
  'MEX-KOR': 'Estadio Akron, Guadalajara',
  'CZE-MEX': 'Estadio Azteca, Cidade do Mexico',
  'RSA-KOR': 'BBVA Stadium, Monterrey',
  // GROUP B
  'CAN-BIH': 'BMO Field, Toronto',
  'QAT-SUI': 'Levi\'s Stadium, San Francisco',
  'SUI-CAN': 'BC Place, Vancouver',
  'BIH-QAT': 'Lumen Field, Seattle',
  'SUI-BIH': 'SoFi Stadium, Los Angeles',
  'CAN-QAT': 'BC Place, Vancouver',
  // GROUP C
  'BRA-MAR': 'MetLife Stadium, Nova York',
  'HAI-SCO': 'Gillette Stadium, Boston',
  'SCO-BRA': 'Hard Rock Stadium, Miami',
  'MAR-HAI': 'Mercedes-Benz Stadium, Atlanta',
  'SCO-MAR': 'Gillette Stadium, Boston',
  'BRA-HAI': 'Lincoln Financial Field, Filadelfia',
  // GROUP D
  'USA-PAR': 'SoFi Stadium, Los Angeles',
  'AUS-TUR': 'BC Place, Vancouver',
  'TUR-USA': 'SoFi Stadium, Los Angeles',
  'PAR-AUS': 'Levi\'s Stadium, San Francisco',
  'USA-AUS': 'Lumen Field, Seattle',
  'TUR-PAR': 'Levi\'s Stadium, San Francisco',
  // GROUP E
  'GER-CUW': 'NRG Stadium, Houston',
  'CIV-ECU': 'Lincoln Financial Field, Filadelfia',
  'ECU-GER': 'MetLife Stadium, Nova York',
  'CUW-CIV': 'Lincoln Financial Field, Filadelfia',
  'GER-CIV': 'BMO Field, Toronto',
  'ECU-CUW': 'Arrowhead Stadium, Kansas City',
  // GROUP F
  'NED-JPN': 'AT&T Stadium, Dallas',
  'SWE-TUN': 'BBVA Stadium, Monterrey',
  'JPN-SWE': 'AT&T Stadium, Dallas',
  'TUN-NED': 'Arrowhead Stadium, Kansas City',
  'NED-SWE': 'NRG Stadium, Houston',
  'JPN-TUN': 'BBVA Stadium, Monterrey',
  // GROUP G
  'BEL-EGY': 'Lumen Field, Seattle',
  'IRN-NZL': 'SoFi Stadium, Los Angeles',
  'EGY-IRN': 'Lumen Field, Seattle',
  'NZL-BEL': 'BC Place, Vancouver',
  'BEL-IRN': 'SoFi Stadium, Los Angeles',
  'NZL-EGY': 'BC Place, Vancouver',
  // GROUP H
  'ESP-CPV': 'Mercedes-Benz Stadium, Atlanta',
  'KSA-URY': 'Hard Rock Stadium, Miami',
  'CPV-KSA': 'NRG Stadium, Houston',
  'URY-ESP': 'Estadio Akron, Guadalajara',
  'ESP-KSA': 'Mercedes-Benz Stadium, Atlanta',
  'URY-CPV': 'Hard Rock Stadium, Miami',
  // GROUP I
  'FRA-SEN': 'MetLife Stadium, Nova York',
  'IRQ-NOR': 'Gillette Stadium, Boston',
  'NOR-FRA': 'Gillette Stadium, Boston',
  'SEN-IRQ': 'BMO Field, Toronto',
  'FRA-IRQ': 'Lincoln Financial Field, Filadelfia',
  'NOR-SEN': 'MetLife Stadium, Nova York',
  // GROUP J
  'ARG-ALG': 'Arrowhead Stadium, Kansas City',
  'AUT-JOR': 'Levi\'s Stadium, San Francisco',
  'ALG-AUT': 'Arrowhead Stadium, Kansas City',
  'JOR-ARG': 'AT&T Stadium, Dallas',
  'ARG-AUT': 'AT&T Stadium, Dallas',
  'JOR-ALG': 'Levi\'s Stadium, San Francisco',
  // GROUP K
  'POR-UZB': 'NRG Stadium, Houston',
  'COL-COD': 'Estadio Akron, Guadalajara',
  'COL-POR': 'Hard Rock Stadium, Miami',
  'COD-UZB': 'Mercedes-Benz Stadium, Atlanta',
  'POR-COD': 'NRG Stadium, Houston',
  'UZB-COL': 'Estadio Azteca, Cidade do Mexico',
  // GROUP L
  'ENG-CRO': 'AT&T Stadium, Dallas',
  'GHA-PAN': 'BMO Field, Toronto',
  'PAN-ENG': 'MetLife Stadium, Nova York',
  'CRO-GHA': 'Lincoln Financial Field, Filadelfia',
  'ENG-GHA': 'Gillette Stadium, Boston',
  'PAN-CRO': 'BMO Field, Toronto',
}

// Knockout venues by match number
const KNOCKOUT_VENUES: Record<number, string> = {
  // R32 (matches 73-88)
  73: 'BC Place, Vancouver',
  74: 'Lincoln Financial Field, Filadelfia',
  75: 'MetLife Stadium, Nova York',
  76: 'AT&T Stadium, Dallas',
  77: 'NRG Stadium, Houston',
  78: 'Mercedes-Benz Stadium, Atlanta',
  79: 'Arrowhead Stadium, Kansas City',
  80: 'Lumen Field, Seattle',
  81: 'Gillette Stadium, Boston',
  82: 'SoFi Stadium, Los Angeles',
  83: 'BMO Field, Toronto',
  84: 'Hard Rock Stadium, Miami',
  85: 'BBVA Stadium, Monterrey',
  86: 'Estadio Azteca, Cidade do Mexico',
  87: 'Levi\'s Stadium, San Francisco',
  88: 'Estadio Akron, Guadalajara',
  // R16 (matches 89-96)
  89: 'MetLife Stadium, Nova York',
  90: 'SoFi Stadium, Los Angeles',
  91: 'AT&T Stadium, Dallas',
  92: 'Lincoln Financial Field, Filadelfia',
  93: 'Mercedes-Benz Stadium, Atlanta',
  94: 'Levi\'s Stadium, San Francisco',
  95: 'Estadio Azteca, Cidade do Mexico',
  96: 'BC Place, Vancouver',
  // QF (matches 97-100)
  97: 'Gillette Stadium, Boston',
  98: 'SoFi Stadium, Los Angeles',
  99: 'Levi\'s Stadium, San Francisco',
  100: 'Hard Rock Stadium, Miami',
  // SF (matches 101-102)
  101: 'AT&T Stadium, Dallas',
  102: 'Mercedes-Benz Stadium, Atlanta',
  // 3RD (match 103)
  103: 'Hard Rock Stadium, Miami',
  // FINAL (match 104)
  104: 'MetLife Stadium, Nova York',
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    if (!user.isAdmin) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

    const matches = await prisma.match.findMany({
      include: {
        homeTeam: { select: { code: true } },
        awayTeam: { select: { code: true } },
      },
    })

    let updated = 0
    let notFound = 0
    const missing: string[] = []

    for (const match of matches) {
      let venue: string | null = null

      if (match.stage === 'GROUP' && match.homeTeam && match.awayTeam) {
        const key = `${match.homeTeam.code}-${match.awayTeam.code}`
        const reverseKey = `${match.awayTeam.code}-${match.homeTeam.code}`
        venue = GROUP_VENUES[key] || GROUP_VENUES[reverseKey] || null
        if (!venue) {
          missing.push(`#${match.matchNumber} ${key}`)
        }
      } else if (match.stage !== 'GROUP') {
        venue = KNOCKOUT_VENUES[match.matchNumber] || null
      }

      if (venue) {
        await prisma.match.update({
          where: { id: match.id },
          data: { venue },
        })
        updated++
      } else {
        notFound++
      }
    }

    return NextResponse.json({
      message: `${updated} jogos com cidade/estadio atualizado`,
      updated,
      notFound,
      missing,
    })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ error: 'Erro interno.', detail: String(error) }, { status: 500 })
  }
}
