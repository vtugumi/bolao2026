import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    if (!user.isAdmin) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

    const { oldCode, newCode } = await request.json()
    if (!oldCode || !newCode) return NextResponse.json({ error: 'oldCode e newCode obrigatorios.' }, { status: 400 })

    const team = await prisma.team.findUnique({ where: { code: oldCode } })
    if (!team) return NextResponse.json({ error: `Time com codigo ${oldCode} nao encontrado.` }, { status: 404 })

    await prisma.team.update({
      where: { code: oldCode },
      data: { code: newCode },
    })

    return NextResponse.json({ message: `${team.name}: ${oldCode} → ${newCode}` })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ error: 'Erro interno.', detail: String(error) }, { status: 500 })
  }
}
