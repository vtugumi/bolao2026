import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

const VALID_BONUS_TYPES = ['CHAMPION', 'RUNNER_UP', 'TOP_SCORER']

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado.' },
        { status: 401 }
      )
    }

    const bonusPredictions = await prisma.bonusPrediction.findMany({
      where: { userId: user.id },
    })

    return NextResponse.json(bonusPredictions)
  } catch (error) {
    console.error('Erro ao listar palpites bônus:', error)
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

    const body = await request.json()
    const { type, value } = body

    if (!type || !value) {
      return NextResponse.json(
        { error: 'type e value são obrigatórios.' },
        { status: 400 }
      )
    }

    if (!VALID_BONUS_TYPES.includes(type)) {
      return NextResponse.json(
        { error: 'Tipo inválido. Use: CHAMPION, RUNNER_UP ou TOP_SCORER.' },
        { status: 400 }
      )
    }

    const tournamentStartSetting = await prisma.setting.findUnique({
      where: { key: 'tournamentStartDate' },
    })

    if (tournamentStartSetting) {
      const startDate = new Date(tournamentStartSetting.value)
      if (new Date() >= startDate) {
        return NextResponse.json(
          { error: 'O torneio já começou. Não é possível alterar palpites bônus.' },
          { status: 400 }
        )
      }
    }

    const bonusPrediction = await prisma.bonusPrediction.upsert({
      where: {
        userId_type: {
          userId: user.id,
          type,
        },
      },
      update: { value },
      create: {
        userId: user.id,
        type,
        value,
      },
    })

    return NextResponse.json(bonusPrediction)
  } catch (error) {
    console.error('Erro ao salvar palpite bônus:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
