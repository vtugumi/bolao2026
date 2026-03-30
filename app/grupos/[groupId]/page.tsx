'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import LeaderboardTable from '@/components/LeaderboardTable';

interface Member {
  id: number;
  name: string;
  joinedAt: string;
}

interface GroupData {
  id: number;
  name: string;
  inviteCode: string;
  creatorId: number;
  creatorName: string;
  memberCount: number;
  members: Member[];
  rankings: Array<{
    id: number;
    name: string;
    totalPoints: number;
    exactScores: number;
    bonusHits: number;
    knockoutPoints: number;
    rank: number;
  }>;
}

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const res = await fetch(`/api/groups/private/${groupId}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Erro ao carregar grupo');
          return;
        }

        setGroup(data);
      } catch {
        setError('Erro ao carregar grupo');
      } finally {
        setLoading(false);
      }
    };

    if (groupId) fetchGroup();
  }, [groupId]);

  const copyToClipboard = async () => {
    if (!group) return;
    try {
      await navigator.clipboard.writeText(group.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
        <Link href="/grupos" className="text-emerald-600 hover:underline mt-4 inline-block">
          Voltar para Meus Grupos
        </Link>
      </div>
    );
  }

  if (!group) return null;

  const rankingsForTable = group.rankings.map(r => ({
    userId: String(r.id),
    name: r.name,
    totalPoints: r.totalPoints,
    exactScores: r.exactScores,
    correctResults: r.bonusHits,
    bonusPoints: r.knockoutPoints,
    position: r.rank,
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link href="/grupos" className="text-emerald-600 hover:underline text-sm mb-4 inline-block">
        &larr; Voltar para Meus Grupos
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-emerald-800 mb-2">
          {group.name}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
          <span>{group.memberCount} {group.memberCount === 1 ? 'membro' : 'membros'}</span>
          <span className="text-gray-300">|</span>
          <span>Criado por {group.creatorName}</span>
        </div>
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
          <span className="text-sm text-emerald-700">Codigo de convite:</span>
          <span className="font-mono font-bold text-emerald-800 text-lg tracking-wider">
            {group.inviteCode}
          </span>
          <button
            onClick={copyToClipboard}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            {copied ? 'Copiado!' : 'Copiar Codigo'}
          </button>
        </div>
      </div>

      {/* Ranking do Grupo */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-emerald-700 mb-4">Ranking do Grupo</h2>
        {rankingsForTable.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            Nenhum dado de ranking disponivel ainda.
          </p>
        ) : (
          <LeaderboardTable rankings={rankingsForTable} />
        )}
      </div>

      {/* Lista de Membros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-emerald-700 mb-4">Membros</h2>
        <div className="divide-y divide-gray-100">
          {group.members.map((member) => (
            <div key={member.id} className="flex items-center justify-between py-3">
              <span className="font-medium text-gray-800">
                {member.name}
                {member.id === group.creatorId && (
                  <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    Criador
                  </span>
                )}
              </span>
              <span className="text-xs text-gray-400">
                Desde {new Date(member.joinedAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
