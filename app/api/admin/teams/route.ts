import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

// GET - List placeholder teams (playoffs)
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    if (!user.isAdmin) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

    // Get all teams, marking which ones are placeholders
    const teams = await prisma.team.findMany({
      orderBy: [{ groupLabel: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json({ teams })
  } catch (error) {
    console.error('Erro ao buscar times:', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

// PUT - Update a placeholder team with the real team info
export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    if (!user.isAdmin) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

    const { teamId, name, code, flagEmoji } = await request.json()

    if (!teamId || !name || !code) {
      return NextResponse.json({ error: 'teamId, name e code sao obrigatorios.' }, { status: 400 })
    }

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        name,
        code: code.toUpperCase(),
        flagEmoji: flagEmoji || '',
      },
    })

    return NextResponse.json({ team: updated })
  } catch (error) {
    console.error('Erro ao atualizar time:', error)
    return NextResponse.json({ error: 'Erro ao atualizar.' }, { status: 500 })
  }
}
