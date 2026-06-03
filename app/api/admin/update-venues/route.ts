import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

// Official FIFA World Cup 2026 venue assignments
// Source: fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026
// Mapped by team codes (home-away) for group matches, matchNumber for knockout

const GROUP_VENUES: Record<string, string> = {
  // GROUP A
  'MEX-RSA': 'Estadio Azteca, Cidade do Mexico',
  'KOR-CZE': 'SoFi Stadium, Los Angeles',
  'MEX-KOR': 'AT&T Stadium, Dallas',
  'CZE-RSA': 'Gillette Stadium, Boston',
  'RSA-KOR': 'Lincoln Financial Field, Filadelfia',
  'CZE-MEX': 'NRG Stadium, Houston',
  // GROUP B
  'CAN-BIH': 'BMO Field, Toronto',
  'SUI-QAT': 'Gillette Stadium, Boston',
  'QAT-CAN': 'BMO Field, Toronto',
  'BIH-SUI': 'AT&T Stadium, Dallas',
  'SUI-CAN': 'Mercedes-Benz Stadium, Atlanta',
  'QAT-BIH': 'MetLife Stadium, Nova York',
  // GROUP C
  'BRA-MAR': 'Hard Rock Stadium, Miami',
  'HAI-SCO': 'Mercedes-Benz Stadium, Atlanta',
  'SCO-BRA': 'MetLife Stadium, Nova York',
  'MAR-HAI': 'Hard Rock Stadium, Miami',
  'BRA-HAI': 'NRG Stadium, Houston',
  'SCO-MAR': 'Lincoln Financial Field, Filadelfia',
  // GROUP D
  'USA-PAR': 'AT&T Stadium, Dallas',
  'TUR-AUS': 'BC Place, Vancouver',
  'USA-AUS': 'SoFi Stadium, Los Angeles',
  'TUR-PAR': 'Lumen Field, Seattle',
  'AUS-PAR': 'BBVA Stadium, Monterrey',
  'TUR-USA': 'Levi\'s Stadium, San Francisco',
  // GROUP E
  'GER-CUW': 'Lincoln Financial Field, Filadelfia',
  'CIV-ECU': 'Estadio Akron, Guadalajara',
  'GER-CIV': 'Mercedes-Benz Stadium, Atlanta',
  'ECU-CUW': 'Estadio Akron, Guadalajara',
  'ECU-GER': 'MetLife Stadium, Nova York',
  'CUW-CIV': 'Arrowhead Stadium, Kansas City',
  // GROUP F
  'NED-JPN': 'Hard Rock Stadium, Miami',
  'SWE-TUN': 'Arrowhead Stadium, Kansas City',
  'NED-SWE': 'NRG Stadium, Houston',
  'TUN-JPN': 'Lumen Field, Seattle',
  'JPN-NED': 'Levi\'s Stadium, San Francisco',
  'TUN-SWE': 'BBVA Stadium, Monterrey',
  // GROUP G
  'BEL-IRN': 'Estadio Azteca, Cidade do Mexico',
  'NZL-EGY': 'BC Place, Vancouver',
  'BEL-NZL': 'BMO Field, Toronto',
  'EGY-IRN': 'Estadio Azteca, Cidade do Mexico',
  'IRN-NZL': 'Lumen Field, Seattle',
  'EGY-BEL': 'Arrowhead Stadium, Kansas City',
  // GROUP H
  'ESP-CPV': 'SoFi Stadium, Los Angeles',
  'KSA-URY': 'BBVA Stadium, Monterrey',
  'ESP-KSA': 'AT&T Stadium, Dallas',
  'URY-CPV': 'Estadio Akron, Guadalajara',
  'URY-ESP': 'Gillette Stadium, Boston',
  'CPV-KSA': 'Levi\'s Stadium, San Francisco',
  // GROUP I
  'FRA-SEN': 'MetLife Stadium, Nova York',
  'IRQ-NOR': 'BC Place, Vancouver',
  'NOR-FRA': 'Hard Rock Stadium, Miami',
  'SEN-IRQ': 'Lincoln Financial Field, Filadelfia',
  'FRA-IRQ': 'SoFi Stadium, Los Angeles',
  'NOR-SEN': 'BMO Field, Toronto',
  // GROUP J
  'ARG-AUT': 'Mercedes-Benz Stadium, Atlanta',
  'JOR-ALG': 'Estadio Akron, Guadalajara',
  'ARG-ALG': 'NRG Stadium, Houston',
  'AUT-JOR': 'Arrowhead Stadium, Kansas City',
  'JOR-ARG': 'Gillette Stadium, Boston',
  'ALG-AUT': 'AT&T Stadium, Dallas',
  // GROUP K
  'COL-POR': 'Lumen Field, Seattle',
  'COD-UZB': 'Estadio Azteca, Cidade do Mexico',
  'POR-COD': 'Lincoln Financial Field, Filadelfia',
  'UZB-COL': 'BBVA Stadium, Monterrey',
  'POR-UZB': 'Hard Rock Stadium, Miami',
  'COL-COD': 'BMO Field, Toronto',
  // GROUP L
  'ENG-CRO': 'MetLife Stadium, Nova York',
  'GHA-PAN': 'BC Place, Vancouver',
  'PAN-ENG': 'Mercedes-Benz Stadium, Atlanta',
  'CRO-GHA': 'SoFi Stadium, Los Angeles',
  'ENG-GHA': 'NRG Stadium, Houston',
  'PAN-CRO': 'Levi\'s Stadium, San Francisco',
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
