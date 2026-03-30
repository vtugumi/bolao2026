'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Group {
  id: number;
  name: string;
  inviteCode: string;
  memberCount: number;
  createdAt: string;
}

export default function GruposPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [createdGroup, setCreatedGroup] = useState<Group | null>(null);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedCode, setCopiedCode] = useState('');

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups/private');
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (err) {
      console.error('Erro ao carregar grupos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setCreating(true);
    setError('');
    setSuccess('');
    setCreatedGroup(null);

    try {
      const res = await fetch('/api/groups/private', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName.trim() })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao criar grupo');
        return;
      }

      setCreatedGroup(data);
      setGroupName('');
      setSuccess('Grupo criado com sucesso!');
      fetchGroups();
    } catch {
      setError('Erro ao criar grupo');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setJoining(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/groups/private/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim() })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao entrar no grupo');
        return;
      }

      setInviteCode('');
      setSuccess(`Voce entrou no grupo "${data.name}"!`);
      fetchGroups();
    } catch {
      setError('Erro ao entrar no grupo');
    } finally {
      setJoining(false);
    }
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(''), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl md:text-3xl font-bold text-emerald-800 mb-6">
        Meus Grupos
      </h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}

      {/* Criar Grupo */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-emerald-700 mb-4">Criar Grupo</h2>
        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Nome do grupo"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            maxLength={50}
          />
          <button
            type="submit"
            disabled={creating || !groupName.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            {creating ? 'Criando...' : 'Criar'}
          </button>
        </form>

        {createdGroup && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-sm text-emerald-700 mb-2">
              Grupo <strong>{createdGroup.name}</strong> criado! Compartilhe o codigo de convite:
            </p>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-mono font-bold text-emerald-800 tracking-wider">
                {createdGroup.inviteCode}
              </span>
              <button
                onClick={() => copyToClipboard(createdGroup.inviteCode)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                {copiedCode === createdGroup.inviteCode ? 'Copiado!' : 'Copiar Codigo'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Entrar em um Grupo */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-emerald-700 mb-4">Entrar em um Grupo</h2>
        <form onSubmit={handleJoin} className="flex gap-3">
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Codigo de convite (ex: ABC-1D2E)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
            maxLength={8}
          />
          <button
            type="submit"
            disabled={joining || !inviteCode.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            {joining ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>

      {/* Meus Grupos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-emerald-700 mb-4">Meus Grupos</h2>

        {loading ? (
          <p className="text-gray-500 text-center py-4">Carregando...</p>
        ) : groups.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            Voce ainda nao participa de nenhum grupo.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/grupos/${group.id}`}
                className="block bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg p-4 transition-colors"
              >
                <h3 className="font-semibold text-emerald-800 text-lg mb-1">{group.name}</h3>
                <div className="flex items-center justify-between text-sm text-emerald-600">
                  <span>{group.memberCount} {group.memberCount === 1 ? 'membro' : 'membros'}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-emerald-200 px-2 py-0.5 rounded">
                      {group.inviteCode}
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        copyToClipboard(group.inviteCode);
                      }}
                      className="text-emerald-700 hover:text-emerald-900 text-xs underline"
                    >
                      {copiedCode === group.inviteCode ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
