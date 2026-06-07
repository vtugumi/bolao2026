import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email obrigatorio.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    // Always return success (don't reveal if email exists)
    if (!user) {
      return NextResponse.json({ message: 'Se o email existir, voce recebera um link de recuperacao.' })
    }

    // Generate reset token (valid for 1 hour)
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 3600000) // 1 hour

    // Store token in settings (simple approach)
    await prisma.setting.upsert({
      where: { key: `reset_${user.id}` },
      update: { value: JSON.stringify({ token, expires: expires.toISOString() }) },
      create: { key: `reset_${user.id}`, value: JSON.stringify({ token, expires: expires.toISOString() }) },
    })

    // Send email
    const resetUrl = `https://bolao2026-omega.vercel.app/reset-password?token=${token}&userId=${user.id}`

    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const { Resend } = await import('resend')
      const resend = new Resend(resendKey)

      await resend.emails.send({
        from: 'Bolao Copa 2026 <onboarding@resend.dev>',
        to: email,
        subject: 'Recuperar senha - Bolao Copa 2026',
        html: `
          <h2>Recuperacao de senha</h2>
          <p>Ola ${user.name},</p>
          <p>Voce solicitou a recuperacao de senha do Bolao Copa 2026.</p>
          <p><a href="${resetUrl}" style="background:#059669;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Redefinir minha senha</a></p>
          <p>Este link expira em 1 hora.</p>
          <p>Se voce nao solicitou, ignore este email.</p>
        `,
      })
    }

    return NextResponse.json({ message: 'Se o email existir, voce recebera um link de recuperacao.' })
  } catch (error) {
    console.error('Erro ao processar recuperacao:', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
