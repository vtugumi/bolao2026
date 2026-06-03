import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado.' },
        { status: 401 }
      )
    }

    const predictions = await prisma.prediction.findMany({
      where: { userId: user.id },
      include: {
        match: {
          include: {
            homeTeam: true,
            awayTeam: true,
          },
        },
      },
      orderBy: { match: { matchNumber: 'asc' } },
    })

    return NextResponse.json(predictions)
  } catch (error) {
    console.error('Erro ao listar palpites:', error)
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
    const { matchId, homeScore, awayScore, winnerId } = body

    if (!matchId || homeScore === undefined || awayScore === undefined) {
      return NextResponse.json(
        { error: 'matchId, homeScore e awayScore são obrigatórios.' },
        { status: 400 }
      )
    }

    if (
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore) ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      return NextResponse.json(
        { error: 'Os placares devem ser números inteiros não negativos.' },
        { status: 400 }
      )
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
    })

    if (!match) {
      return NextResponse.json(
        { error: 'Partida não encontrada.' },
        { status: 404 }
      )
    }

    if (new Date(match.dateTime) <= new Date()) {
      return NextResponse.json(
        { error: 'O prazo para palpites desta partida já encerrou.' },
        { status: 400 }
      )
    }

    // Para mata-mata: determinar o classificado automaticamente
    // Aceita simulatedHomeTeamId/simulatedAwayTeamId quando times oficiais nao estao definidos
    const { simulatedHomeTeamId, simulatedAwayTeamId } = body
    const effectiveHome = match.homeTeamId || simulatedHomeTeamId || null
    const effectiveAway = match.awayTeamId || simulatedAwayTeamId || null

    let effectiveWinnerId = winnerId || null
    if (match.stage !== 'GROUP') {
      if (!effectiveHome || !effectiveAway) {
        // Times nao definidos (nem reais nem simulados) - nao pode palpitar
        return NextResponse.json(
          { error: 'Os times desta partida ainda nao foram definidos.' },
          { status: 400 }
        )
      }

      if (homeScore > awayScore) {
        effectiveWinnerId = effectiveHome
      } else if (awayScore > homeScore) {
        effectiveWinnerId = effectiveAway
      } else {
        // Empate -> usuario precisa escolher quem passa nos penaltis
        if (!effectiveWinnerId) {
          return NextResponse.json(
            { error: 'Empate! Informe quem se classifica nos penaltis.' },
            { status: 400 }
          )
        }
      }
    }

    const prediction = await prisma.prediction.upsert({
      where: {
        userId_matchId: {
          userId: user.id,
          matchId,
        },
      },
      update: {
        homeScore,
        awayScore,
        winnerId: match.stage !== 'GROUP' ? effectiveWinnerId : null,
      },
      create: {
        userId: user.id,
        matchId,
        homeScore,
        awayScore,
        winnerId: match.stage !== 'GROUP' ? effectiveWinnerId : null,
      },
    })

    return NextResponse.json(prediction)
  } catch (error) {
    console.error('Erro ao salvar palpite:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
