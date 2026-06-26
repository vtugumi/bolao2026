import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { populateR32Bracket } from '@/lib/populate-r32'

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    }
    if (!user.isAdmin) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
    }

    const result = await populateR32Bracket()

    return NextResponse.json({
      message: result.updated.length > 0
        ? `${result.updated.length} jogo(s) R32 atualizado(s)`
        : 'R32 já está atualizado',
      ...result,
    })
  } catch (error) {
    console.error('Erro ao popular R32:', error)
    return NextResponse.json({ error: 'Erro interno', message: String(error) }, { status: 500 })
  }
}
