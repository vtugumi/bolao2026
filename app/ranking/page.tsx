'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import LeaderboardTable from '@/components/LeaderboardTable';

interface RankingEntry {
  userId: string;
  name: string;
  totalPoints: number;
  exactScores: number;
  correctResults: number;
  bonusPoints: number;
  position: number;
}

interface Group {
  id: number;
  name: string;
}

export default function RankingPage() {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [loadingGroup, setLoadingGroup] = useState(false);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch('/api/groups/private');
        if (res.ok) {
          const data = await res.json();
          setGroups(data);
        }
      } catch {
        // user might not be logged in
      }
    };
    fetchGroups();
  }, []);

  useEffect(() => {
    const fetchRankings = async () => {
      if (selectedGroup) {
        setLoadingGroup(true);
        try {
          const res = await fetch(`/api/groups/private/${selectedGroup}`);
          if (res.ok) {
            const data = await res.json();
            const mapped = (data.rankings || []).map((r: { id: number; name: string; totalPoints: number; exactScores: number; bonusHits: number; knockoutPoints: number; rank: number }) => ({
              userId: String(r.id),
              name: r.name,
              totalPoints: r.totalPoints,
              exactScores: r.exactScores,
              correctResults: r.bonusHits,
              bonusPoints: r.knockoutPoints,
              position: r.rank,
            }));
            setRankings(mapped);
            setUpdatedAt(null);
          }
        } catch (err) {
          console.error('Erro ao carregar ranking do grupo:', err);
        } finally {
          setLoadingGroup(false);
          setLoading(false);
        }
      } else {
        setLoading(true);
        try {
          const res = await fetch('/api/rankings');
          if (res.ok) {
            const data = await res.json();
            setRankings(data.rankings || data || []);
            if (data.updatedAt) {
              setUpdatedAt(data.updatedAt);
            }
          }
        } catch (err) {
          console.error('Erro ao carregar ranking:', err);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchRankings();
  }, [selectedGroup]);

  const isLoading = loading || loadingGroup;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <h1 className="text-2xl md:text-3xl font-bold text-emerald-800">
          Ranking
        </h1>
        {groups.length > 0 && (
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm"
          >
            <option value="">Ranking Geral</option>
            {groups.map((g) => (
              <option key={g.id} value={String(g.id)}>
                {g.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {updatedAt && (
        <p className="text-sm text-gray-400 mb-6">
          Atualizado em{' '}
          {new Date(updatedAt).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      )}

      {!updatedAt && <div className="mb-6" />}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : rankings.length === 0 ? (
        <p className="text-center text-gray-500 py-12">
          Nenhum dado de ranking disponivel ainda.
        </p>
      ) : (
        <LeaderboardTable rankings={rankings} />
      )}
    </div>
  );
}
