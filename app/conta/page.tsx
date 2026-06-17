'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/components/AuthProvider';

export default function ContaPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        setError(data.error || 'Erro ao trocar senha.');
      }
    } catch {
      setError('Erro ao trocar senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl md:text-3xl font-bold text-emerald-800 mb-2">Minha Conta</h1>
      {user && (
        <p className="text-gray-500 text-sm mb-8">{user.name} &middot; {user.email}</p>
      )}

      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Trocar Senha</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">{error}</div>
          )}
          {success && (
            <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-lg text-sm border border-emerald-200">{success}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha atual</label>
            <input type="password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
            <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="Minimo 6 caracteres" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
            <input type="password" required value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-emerald-700 text-white py-3 rounded-lg font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors">
            {loading ? 'Salvando...' : 'Trocar Senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
