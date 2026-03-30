import { NextRequest, NextResponse } from 'next/server'
import { calculateRankings } from '@/lib/rankings'

export async function GET(_request: NextRequest) {
  try {
    const rankings = await calculateRankings()
    return NextResponse.json(rankings)
  } catch (error) {
    console.error('Erro ao calcular rankings:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
