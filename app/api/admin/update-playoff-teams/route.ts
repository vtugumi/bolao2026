import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

const PLAYOFF_UPDATES = [
  { oldCode: 'PLD', newName: 'Tchequia',              newCode: 'CZE', flagEmoji: '\u{1F1E8}\u{1F1FF}' },
  { oldCode: 'PLA', newName: 'Bosnia e Herzegovina',   newCode: 'BIH', flagEmoji: '\u{1F1E7}\u{1F1E6}' },
  { oldCode: 'PLC', newName: 'Turquia',                newCode: 'TUR', flagEmoji: '\u{1F1F9}\u{1F1F7}' },
  { oldCode: 'PLB', newName: 'Suecia',                 newCode: 'SWE', flagEmoji: '\u{1F1F8}\u{1F1EA}' },
  { oldCode: 'PI2', newName: 'Iraque',                 newCode: 'IRQ', flagEmoji: '\u{1F1EE}\u{1F1F6}' },
  { oldCode: 'PI1', newName: 'RD Congo',               newCode: 'COD', flagEmoji: '\u{1F1E8}\u{1F1E9}' },
]

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    }
    if (!user.isAdmin) {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 })
    }

    const results: string[] = []

    for (const u of PLAYOFF_UPDATES) {
      const team = await prisma.team.findUnique({ where: { code: u.oldCode } })
      if (!team) {
        results.push(`AVISO: ${u.oldCode} nao encontrado (ja atualizado?)`)
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

      results.push(`${team.name} → ${u.newName} (${u.newCode}) ${u.flagEmoji}`)
    }

    return NextResponse.json({ message: 'Times atualizados!', results })
  } catch (error) {
    console.error('Erro ao atualizar times:', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
