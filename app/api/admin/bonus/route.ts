import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { scoreBonusPrediction } from '@/lib/scoring'

const BONUS_KEYS: Record<string, string> = {
  champion: 'CHAMPION',
  runnerUp: 'RUNNER_UP',
  topScorer: 'TOP_SCORER',
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado.' },
        { status: 401 }
      )
    }
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores.' },
        { status: 403 }
      )
    }

    const settings = await prisma.setting.findMany({
      where: {
        key: { in: ['officialChampion', 'officialRunnerUp', 'officialTopScorer'] },
      },
    })

    const result: Record<string, string | null> = {
      champion: null,
      runnerUp: null,
      topScorer: null,
    }

    for (const setting of settings) {
      if (setting.key === 'officialChampion') result.champion = setting.value
      if (setting.key === 'officialRunnerUp') result.runnerUp = setting.value
      if (setting.key === 'officialTopScorer') result.topScorer = setting.value
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao buscar resultados bônus:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado.' },
        { status: 401 }
      )
    }
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { champion, runnerUp, topScorer } = body

    const updates: { key: string; value: string; type: string }[] = []

    if (champion !== undefined) {
      updates.push({ key: 'officialChampion', value: champion, type: 'CHAMPION' })
    }
    if (runnerUp !== undefined) {
      updates.push({ key: 'officialRunnerUp', value: runnerUp, type: 'RUNNER_UP' })
    }
    if (topScorer !== undefined) {
      updates.push({ key: 'officialTopScorer', value: topScorer, type: 'TOP_SCORER' })
    }

    // Save to settings
    for (const update of updates) {
      await prisma.setting.upsert({
        where: { key: update.key },
        update: { value: update.value },
        create: { key: update.key, value: update.value },
      })
    }

    // Recalculate all bonus prediction points
    for (const update of updates) {
      const bonusPredictions = await prisma.bonusPrediction.findMany({
        where: { type: update.type },
      })

      for (const bp of bonusPredictions) {
        const points = scoreBonusPrediction(update.type, bp.value, update.value)
        await prisma.bonusPrediction.update({
          where: { id: bp.id },
          data: { points },
        })
      }
    }

    return NextResponse.json({ message: 'Resultados bônus atualizados com sucesso.' })
  } catch (error) {
    console.error('Erro ao salvar resultados bônus:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
