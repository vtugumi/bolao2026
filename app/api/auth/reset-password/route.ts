import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { token, userId, newPassword } = await request.json()

    if (!token || !userId || !newPassword) {
      return NextResponse.json({ error: 'Token, userId e newPassword obrigatorios.' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter pelo menos 6 caracteres.' }, { status: 400 })
    }

    // Verify token
    const setting = await prisma.setting.findUnique({
      where: { key: `reset_${userId}` },
    })

    if (!setting) {
      return NextResponse.json({ error: 'Link invalido ou expirado.' }, { status: 400 })
    }

    const data = JSON.parse(setting.value)
    if (data.token !== token) {
      return NextResponse.json({ error: 'Link invalido ou expirado.' }, { status: 400 })
    }

    if (new Date(data.expires) < new Date()) {
      // Clean up expired token
      await prisma.setting.delete({ where: { key: `reset_${userId}` } })
      return NextResponse.json({ error: 'Link expirado. Solicite novamente.' }, { status: 400 })
    }

    // Update password
    const hash = await hashPassword(newPassword)
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { passwordHash: hash },
    })

    // Clean up token
    await prisma.setting.delete({ where: { key: `reset_${userId}` } })

    return NextResponse.json({ message: 'Senha alterada com sucesso!' })
  } catch (error) {
    console.error('Erro ao resetar senha:', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
