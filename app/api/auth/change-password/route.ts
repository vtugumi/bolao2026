import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUser, comparePassword, hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    }

    const { currentPassword, newPassword, confirmNewPassword } = await request.json()

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return NextResponse.json(
        { error: 'Todos os campos sao obrigatorios.' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'A nova senha deve ter pelo menos 6 caracteres.' },
        { status: 400 }
      )
    }

    if (newPassword !== confirmNewPassword) {
      return NextResponse.json(
        { error: 'As senhas nao coincidem.' },
        { status: 400 }
      )
    }

    // Verify current password
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser) {
      return NextResponse.json({ error: 'Usuario nao encontrado.' }, { status: 404 })
    }

    const valid = await comparePassword(currentPassword, dbUser.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 401 })
    }

    // Update password
    const newHash = await hashPassword(newPassword)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    })

    return NextResponse.json({ message: 'Senha alterada com sucesso!' })
  } catch (error) {
    console.error('Erro ao trocar senha:', error)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
