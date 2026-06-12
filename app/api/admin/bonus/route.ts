import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { scoreBonusPrediction } from '@/lib/scoring'

const BONUS_KEYS: Record<string, string> = {
  champion: 'CHAMPION',
  runnerUp: 'RUNNER_UP',
  topScorer: 'TOP_SCORER',
  thirdPlace: 'THIRD_PLACE',
  fourthPlace: 'FOURTH_PLACE',
  brazilFirstGoal: 'BRAZIL_FIRST_GOAL',
}

const SETTING_KEYS: Record<string, string> = {
  champion: 'officialChampion',
  runnerUp: 'officialRunnerUp',
  topScorer: 'officialTopScorer',
  thirdPlace: 'officialThirdPlace',
  fourthPlace: 'officialFourthPlace',
  brazilFirstGoal: 'officialBrazilFirstGoal',
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Nao autenticado.' },
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
        key: { in: Object.values(SETTING_KEYS) },
      },
    })

    const result: Record<string, string | null> = {
      champion: null,
      runnerUp: null,
      topScorer: null,
      thirdPlace: null,
      fourthPlace: null,
      brazilFirstGoal: null,
    }

    for (const setting of settings) {
      for (const [field, settingKey] of Object.entries(SETTING_KEYS)) {
        if (setting.key === settingKey) {
          result[field] = setting.value
        }
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao buscar resultados bonus:', error)
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
        { error: 'Nao autenticado.' },
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

    const updates: { key: string; value: string; type: string }[] = []

    for (const [field, type] of Object.entries(BONUS_KEYS)) {
      if (body[field] !== undefined) {
        updates.push({
          key: SETTING_KEYS[field],
          value: body[field],
          type,
        })
      }
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

    return NextResponse.json({ message: 'Resultados bonus atualizados com sucesso.' })
  } catch (error) {
    console.error('Erro ao salvar resultados bonus:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
