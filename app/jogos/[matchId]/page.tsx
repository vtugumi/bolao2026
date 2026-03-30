'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import LoadingSpinner from '@/components/LoadingSpinner';
import MatchCard from '@/components/MatchCard';

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
  prediction?: {
    homeScore: number | null;
    awayScore: number | null;
    points?: number;
  };
}

export default function MatchDetailPage() {
  const params = useParams();
  const matchId = params.matchId as string;
  const { user } = useAuth();

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMatch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/matches/${matchId}`);
      if (res.ok) {
        const data = await res.json();
        setMatch(data.match || data);
      } else {
        setError('Jogo nao encontrado.');
      }
    } catch {
      setError('Erro ao carregar jogo.');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchMatch();
  }, [fetchMatch]);

  const handleSavePrediction = async (
    mId: number,
    data: { homeScore: number; awayScore: number; winnerId?: number }
  ) => {
    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: mId, ...data }),
      });
      if (res.ok) {
        await fetchMatch();
      }
    } catch (err) {
      console.error('Erro ao salvar palpite:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-red-600 text-lg">{error || 'Jogo nao encontrado.'}</p>
      </div>
    );
  }

  const stageLabel =
    match.stage === 'GROUP'
      ? `Grupo ${match.groupLabel || ''}`
      : match.stage.replace(/_/g, ' ');

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <p className="text-sm text-gray-500 mb-2 uppercase tracking-wide">
        {stageLabel}
      </p>
      <h1 className="text-2xl md:text-3xl font-bold text-emerald-800 mb-2">
        {match.homeTeam?.name || 'A definir'} vs {match.awayTeam?.name || 'A definir'}
      </h1>
      <p className="text-gray-500 mb-6">
        {new Date(match.dateTime).toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
        {match.venue && ` - ${match.venue}`}
      </p>

      <MatchCard
        match={match}
        showPrediction={!!user}
        onSavePrediction={handleSavePrediction}
      />

      {match.prediction && match.prediction.points !== undefined && (
        <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-sm text-emerald-600">Pontos neste jogo</p>
          <p className="text-3xl font-bold text-emerald-800">
            {match.prediction.points}
          </p>
        </div>
      )}
    </div>
  );
}
