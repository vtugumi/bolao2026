import { NextRequest, NextResponse } from 'next/server'
import { clearAuthCookie } from '@/lib/auth'

export async function POST(_request: NextRequest) {
  try {
    const response = NextResponse.json({ message: 'Logout realizado com sucesso.' })
    clearAuthCookie(response)
    return response
  } catch (error) {
    console.error('Erro no logout:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
