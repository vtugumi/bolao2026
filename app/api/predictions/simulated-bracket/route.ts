import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { calculateSimulatedBracket } from '@/lib/simulated-bracket'

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    }

    const result = await calculateSimulatedBracket(user.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao calcular bracket simulado:', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
