'use client';

import { useState, FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const userId = searchParams.get('userId');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // If no token, show "forgot password" form
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmailSent(true);
        setMessage(data.message);
      } else {
        setError(data.error || 'Erro ao processar.');
      }
    } catch {
      setError('Erro ao processar.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('As senhas nao coincidem.');
      return;
    }

    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, userId, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setMessage(data.message);
      } else {
        setError(data.error || 'Erro ao resetar senha.');
      }
    } catch {
      setError('Erro ao resetar senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8 text-emerald-800">
          {token ? 'Nova Senha' : 'Recuperar Senha'}
        </h1>

        {success ? (
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 text-center">
            <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-lg mb-4">
              {message}
            </div>
            <Link href="/login" className="text-emerald-700 font-medium hover:underline">
              Ir para o Login
            </Link>
          </div>
        ) : emailSent ? (
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 text-center">
            <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-lg mb-4">
              {message}
            </div>
            <p className="text-sm text-gray-500">Verifique sua caixa de entrada e spam.</p>
          </div>
        ) : token && userId ? (
          <form onSubmit={handleResetPassword} className="bg-white rounded-xl shadow-md p-6 space-y-5 border border-gray-100">
            {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
              <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="Minimo 6 caracteres" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
              <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="Repita a senha" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-emerald-700 text-white py-3 rounded-lg font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors">
              {loading ? 'Salvando...' : 'Salvar Nova Senha'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="bg-white rounded-xl shadow-md p-6 space-y-5 border border-gray-100">
            {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">{error}</div>}
            <p className="text-sm text-gray-600">
              Digite seu email e enviaremos um link para redefinir sua senha.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="seu@email.com" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-emerald-700 text-white py-3 rounded-lg font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors">
              {loading ? 'Enviando...' : 'Enviar Link de Recuperacao'}
            </button>
            <p className="text-center text-sm text-gray-600">
              <Link href="/login" className="text-emerald-700 font-medium hover:underline">Voltar ao Login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
