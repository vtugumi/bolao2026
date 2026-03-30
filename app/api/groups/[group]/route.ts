import { NextRequest, NextResponse } from 'next/server'
import { calculateGroupStandings } from '@/lib/groups'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ group: string }> }
) {
  try {
    const { group } = await params
    const standings = await calculateGroupStandings(group)
    return NextResponse.json(standings)
  } catch (error) {
    console.error('Erro ao calcular classificação do grupo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
