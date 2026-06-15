'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import LeaderboardTable from '@/components/LeaderboardTable';

interface RankingEntry {
  userId: string;
  name: string;
  totalPoints: number;
  exactScores: number;
  bonusHits: number;
  knockoutPoints: number;
  position: number;
}

interface Group {
  id: number;
  name: string;
}

export default function RankingPage() {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [groupsLoaded, setGroupsLoaded] = useState(false);

  // Load user's groups first
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch('/api/groups/private');
        if (res.ok) {
          const data = await res.json();
          setGroups(data);
          // Auto-select first group
          if (data.length > 0) {
            setSelectedGroup(String(data[0].id));
          }
        }
      } catch {
        // user might not be logged in
      } finally {
        setGroupsLoaded(true);
      }
    };
    fetchGroups();
  }, []);

  // Load rankings when group is selected
  useEffect(() => {
    if (!groupsLoaded) return;

    if (!selectedGroup) {
      setLoading(false);
      return;
    }

    const fetchRankings = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/groups/private/${selectedGroup}`);
        if (res.ok) {
          const data = await res.json();
          const mapped = (data.rankings || []).map((r: { id: number; name: string; totalPoints: number; exactScores: number; bonusHits: number; knockoutPoints: number; rank: number }) => ({
            userId: String(r.id),
            name: r.name,
            totalPoints: r.totalPoints,
            exactScores: r.exactScores,
            bonusHits: r.bonusHits,
            knockoutPoints: r.knockoutPoints,
            position: r.rank,
          }));
          setRankings(mapped);
        }
      } catch (err) {
        console.error('Erro ao carregar ranking do grupo:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, [selectedGroup, groupsLoaded]);

  // No groups yet
  if (groupsLoaded && groups.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-emerald-800 mb-4">Ranking</h1>
        <p className="text-gray-500 mb-6">
          Voce precisa entrar em um grupo para ver o ranking.
        </p>
        <Link
          href="/grupos"
          className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
        >
          Ir para Grupos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-emerald-800">
          Ranking
        </h1>
        {groups.length > 1 && (
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm"
          >
            {groups.map((g) => (
              <option key={g.id} value={String(g.id)}>
                {g.name}
              </option>
            ))}
          </select>
        )}
        {groups.length === 1 && (
          <span className="text-sm text-gray-500">{groups[0].name}</span>
        )}
      </div>

      {loading ? (
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
