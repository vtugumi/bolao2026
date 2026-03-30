import { NextRequest, NextResponse } from 'next/server'
import { calculateGroupStandings } from '@/lib/groups'
import { GROUPS } from '@/lib/constants'

export async function GET(_request: NextRequest) {
  try {
    const allStandings: Record<string, Awaited<ReturnType<typeof calculateGroupStandings>>> = {}

    for (const group of GROUPS) {
      allStandings[group] = await calculateGroupStandings(group)
    }

    return NextResponse.json(allStandings)
  } catch (error) {
    console.error('Erro ao calcular classificações dos grupos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
