'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import LoadingSpinner from '@/components/LoadingSpinner';
import MatchCard from '@/components/MatchCard';
import GroupNav from '@/components/GroupNav';
import GroupStandingsTable from '@/components/GroupStandingsTable';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Match {
  id: number;
  homeTeam: any;
  awayTeam: any;
  homeScore: number | null;
  awayScore: number | null;
  dateTime: string;
  stage: string;
  groupLabel?: string;
  venue?: string;
  userPrediction?: any;
}

type Standing = any;

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export default function GroupPage() {
  const params = useParams();
  const group = (params.group as string)?.toUpperCase() || 'A';
  const { user } = useAuth();

  const [matches, setMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [matchesRes, standingsRes] = await Promise.all([
        fetch(`/api/matches?stage=GROUP&groupLabel=${group}`),
        fetch(`/api/groups/${group}`),
      ]);

      if (matchesRes.ok) {
        const matchesData = await matchesRes.json();
        setMatches(matchesData.matches || matchesData || []);
      }

      if (standingsRes.ok) {
        const standingsData = await standingsRes.json();
        setStandings(standingsData.standings || standingsData || []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do grupo:', err);
    } finally {
      setLoading(false);
    }
  }, [group]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSavePrediction = async (
    matchId: number,
    data: { homeScore: number; awayScore: number; winnerId?: number }
  ) => {
    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, ...data }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Erro ao salvar palpite:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl md:text-3xl font-bold text-emerald-800 mb-6">
        Grupo {group}
      </h1>

      <GroupNav
        activeGroup={group}
        onGroupChange={(g) => {
          window.location.href = `/jogos/grupo/${g}`;
        }}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {/* Tabela de classificacao */}
          {standings.length > 0 && (
            <div className="mt-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-700 mb-3">
                Classificacao
              </h2>
              <GroupStandingsTable standings={standings} />
            </div>
          )}

          {/* Jogos */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-700">Jogos</h2>
            {matches.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                Nenhum jogo encontrado para o Grupo {group}.
              </p>
            ) : (
              matches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  showPrediction={!!user}
                  onSavePrediction={handleSavePrediction}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
