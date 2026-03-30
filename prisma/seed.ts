import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const teamsData = [
  { name: 'Mexico', code: 'MEX', flagEmoji: '🇲🇽', groupLabel: 'A' },
  { name: 'Coreia do Sul', code: 'KOR', flagEmoji: '🇰🇷', groupLabel: 'A' },
  { name: 'Africa do Sul', code: 'RSA', flagEmoji: '🇿🇦', groupLabel: 'A' },
  { name: 'Playoff UEFA D', code: 'PLD', flagEmoji: '🏳️', groupLabel: 'A' },
  { name: 'Canada', code: 'CAN', flagEmoji: '🇨🇦', groupLabel: 'B' },
  { name: 'Suica', code: 'SUI', flagEmoji: '🇨🇭', groupLabel: 'B' },
  { name: 'Catar', code: 'QAT', flagEmoji: '🇶🇦', groupLabel: 'B' },
  { name: 'Playoff UEFA A', code: 'PLA', flagEmoji: '🏳️', groupLabel: 'B' },
  { name: 'Brasil', code: 'BRA', flagEmoji: '🇧🇷', groupLabel: 'C' },
  { name: 'Marrocos', code: 'MAR', flagEmoji: '🇲🇦', groupLabel: 'C' },
  { name: 'Escocia', code: 'SCO', flagEmoji: '🏴', groupLabel: 'C' },
  { name: 'Haiti', code: 'HAI', flagEmoji: '🇭🇹', groupLabel: 'C' },
  { name: 'Estados Unidos', code: 'USA', flagEmoji: '🇺🇸', groupLabel: 'D' },
  { name: 'Paraguai', code: 'PAR', flagEmoji: '🇵🇾', groupLabel: 'D' },
  { name: 'Australia', code: 'AUS', flagEmoji: '🇦🇺', groupLabel: 'D' },
  { name: 'Playoff UEFA C', code: 'PLC', flagEmoji: '🏳️', groupLabel: 'D' },
  { name: 'Alemanha', code: 'GER', flagEmoji: '🇩🇪', groupLabel: 'E' },
  { name: 'Equador', code: 'ECU', flagEmoji: '🇪🇨', groupLabel: 'E' },
  { name: 'Costa do Marfim', code: 'CIV', flagEmoji: '🇨🇮', groupLabel: 'E' },
  { name: 'Curacao', code: 'CUW', flagEmoji: '🇨🇼', groupLabel: 'E' },
  { name: 'Holanda', code: 'NED', flagEmoji: '🇳🇱', groupLabel: 'F' },
  { name: 'Japao', code: 'JPN', flagEmoji: '🇯🇵', groupLabel: 'F' },
  { name: 'Tunisia', code: 'TUN', flagEmoji: '🇹🇳', groupLabel: 'F' },
  { name: 'Playoff UEFA B', code: 'PLB', flagEmoji: '🏳️', groupLabel: 'F' },
  { name: 'Belgica', code: 'BEL', flagEmoji: '🇧🇪', groupLabel: 'G' },
  { name: 'Ira', code: 'IRN', flagEmoji: '🇮🇷', groupLabel: 'G' },
  { name: 'Egito', code: 'EGY', flagEmoji: '🇪🇬', groupLabel: 'G' },
  { name: 'Nova Zelandia', code: 'NZL', flagEmoji: '🇳🇿', groupLabel: 'G' },
  { name: 'Espanha', code: 'ESP', flagEmoji: '🇪🇸', groupLabel: 'H' },
  { name: 'Uruguai', code: 'URU', flagEmoji: '🇺🇾', groupLabel: 'H' },
  { name: 'Arabia Saudita', code: 'KSA', flagEmoji: '🇸🇦', groupLabel: 'H' },
  { name: 'Cabo Verde', code: 'CPV', flagEmoji: '🇨🇻', groupLabel: 'H' },
  { name: 'Franca', code: 'FRA', flagEmoji: '🇫🇷', groupLabel: 'I' },
  { name: 'Senegal', code: 'SEN', flagEmoji: '🇸🇳', groupLabel: 'I' },
  { name: 'Noruega', code: 'NOR', flagEmoji: '🇳🇴', groupLabel: 'I' },
  { name: 'Playoff Interconf. 2', code: 'PI2', flagEmoji: '🏳️', groupLabel: 'I' },
  { name: 'Argentina', code: 'ARG', flagEmoji: '🇦🇷', groupLabel: 'J' },
  { name: 'Austria', code: 'AUT', flagEmoji: '🇦🇹', groupLabel: 'J' },
  { name: 'Argelia', code: 'ALG', flagEmoji: '🇩🇿', groupLabel: 'J' },
  { name: 'Jordania', code: 'JOR', flagEmoji: '🇯🇴', groupLabel: 'J' },
  { name: 'Portugal', code: 'POR', flagEmoji: '🇵🇹', groupLabel: 'K' },
  { name: 'Colombia', code: 'COL', flagEmoji: '🇨🇴', groupLabel: 'K' },
  { name: 'Uzbequistao', code: 'UZB', flagEmoji: '🇺🇿', groupLabel: 'K' },
  { name: 'Playoff Interconf. 1', code: 'PI1', flagEmoji: '🏳️', groupLabel: 'K' },
  { name: 'Inglaterra', code: 'ENG', flagEmoji: '🏴', groupLabel: 'L' },
  { name: 'Croacia', code: 'CRO', flagEmoji: '🇭🇷', groupLabel: 'L' },
  { name: 'Panama', code: 'PAN', flagEmoji: '🇵🇦', groupLabel: 'L' },
  { name: 'Gana', code: 'GHA', flagEmoji: '🇬🇭', groupLabel: 'L' },
]

// Day1: 0v1, 2v3 | Day2: 0v2, 1v3 | Day3: 0v3, 1v2
const matchPattern: [number, number][] = [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]]

function groupMatchDate(gi: number, mi: number): Date {
  const matchDay = Math.floor(mi / 2)
  const dayOffset = gi + matchDay * 4
  const d = new Date('2026-06-11T13:00:00.000Z')
  d.setUTCDate(d.getUTCDate() + (dayOffset % 16))
  d.setUTCHours(13 + (mi % 3) * 3)
  return d
}

function knockoutDate(stage: string, i: number): Date {
  const bases: Record<string, string> = {
    R32: '2026-06-28', R16: '2026-07-02', QF: '2026-07-05',
    SF: '2026-07-08', '3RD': '2026-07-10', FINAL: '2026-07-11',
  }
  const d = new Date(bases[stage] + 'T13:00:00.000Z')
  if (stage === 'R32') d.setUTCDate(d.getUTCDate() + Math.floor(i / 4))
  else if (stage === 'R16') d.setUTCDate(d.getUTCDate() + Math.floor(i / 4))
  else if (stage === 'QF') d.setUTCDate(d.getUTCDate() + Math.floor(i / 2))
  d.setUTCHours(13 + (i % 4) * 3)
  return d
}

async function main() {
  console.log('Seeding...')
  await prisma.prediction.deleteMany()
  await prisma.bonusPrediction.deleteMany()
  await prisma.match.deleteMany()
  await prisma.team.deleteMany()
  await prisma.user.deleteMany()
  await prisma.setting.deleteMany()

  // Teams
  for (const t of teamsData) {
    await prisma.team.create({ data: t })
  }
  console.log('48 times criados.')

  const allTeams = await prisma.team.findMany({ orderBy: { id: 'asc' } })
  const byGroup: Record<string, typeof allTeams> = {}
  for (const t of allTeams) {
    if (t.groupLabel) {
      if (!byGroup[t.groupLabel]) byGroup[t.groupLabel] = []
      byGroup[t.groupLabel].push(t)
    }
  }

  // Group matches
  let mn = 1
  const groups = 'ABCDEFGHIJKL'.split('')
  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi]
    const gt = byGroup[g]
    for (let mi = 0; mi < matchPattern.length; mi++) {
      const [h, a] = matchPattern[mi]
      await prisma.match.create({
        data: {
          matchNumber: mn++,
          stage: 'GROUP',
          groupLabel: g,
          dateTime: groupMatchDate(gi, mi),
          homeTeamId: gt[h].id,
          awayTeamId: gt[a].id,
        },
      })
    }
  }
  console.log(`72 jogos de grupo criados.`)

  // Knockout matches
  const stages = [
    { stage: 'R32', count: 16 }, { stage: 'R16', count: 8 },
    { stage: 'QF', count: 4 }, { stage: 'SF', count: 2 },
    { stage: '3RD', count: 1 }, { stage: 'FINAL', count: 1 },
  ]
  for (const { stage, count } of stages) {
    for (let i = 0; i < count; i++) {
      await prisma.match.create({
        data: {
          matchNumber: mn++,
          stage,
          dateTime: knockoutDate(stage, i),
        },
      })
    }
  }
  console.log(`32 jogos mata-mata criados. Total: ${mn - 1}`)

  // Admin user
  const hash = await bcrypt.hash('admin123', 10)
  await prisma.user.create({
    data: { name: 'Administrador', email: 'admin@bolao.com', passwordHash: hash, isAdmin: true },
  })
  console.log('Admin criado: admin@bolao.com / admin123')

  // Settings
  await prisma.setting.create({
    data: { key: 'tournamentStartDate', value: '2026-06-11T00:00:00.000Z' },
  })
  console.log('Seed completo!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
