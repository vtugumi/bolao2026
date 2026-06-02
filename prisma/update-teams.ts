import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const updates = [
  { oldCode: 'PLD', newName: 'Tchequia',              newCode: 'CZE', flagEmoji: '🇨🇿' }, // UEFA Playoff D → Group A
  { oldCode: 'PLA', newName: 'Bosnia e Herzegovina',   newCode: 'BIH', flagEmoji: '🇧🇦' }, // UEFA Playoff A → Group B
  { oldCode: 'PLC', newName: 'Turquia',                newCode: 'TUR', flagEmoji: '🇹🇷' }, // UEFA Playoff C → Group D
  { oldCode: 'PLB', newName: 'Suecia',                 newCode: 'SWE', flagEmoji: '🇸🇪' }, // UEFA Playoff B → Group F
  { oldCode: 'PI2', newName: 'Iraque',                 newCode: 'IRQ', flagEmoji: '🇮🇶' }, // Interconf. 2  → Group I
  { oldCode: 'PI1', newName: 'RD Congo',               newCode: 'COD', flagEmoji: '🇨🇩' }, // Interconf. 1  → Group K
]

async function main() {
  console.log('Atualizando times dos playoffs...\n')

  for (const u of updates) {
    const team = await prisma.team.findUnique({ where: { code: u.oldCode } })
    if (!team) {
      console.log(`  AVISO: Time com codigo ${u.oldCode} nao encontrado, pulando.`)
      continue
    }

    await prisma.team.update({
      where: { code: u.oldCode },
      data: {
        name: u.newName,
        code: u.newCode,
        flagEmoji: u.flagEmoji,
      },
    })

    console.log(`  ✅ ${team.name} (${u.oldCode}) → ${u.newName} (${u.newCode}) ${u.flagEmoji}`)
  }

  console.log('\nTodos os times atualizados!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
