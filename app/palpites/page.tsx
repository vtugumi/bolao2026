'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import LoadingSpinner from '@/components/LoadingSpinner';
import Flag from '@/components/Flag';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Prediction {
  id: number;
  matchId: number;
  homeScore: number;
  awayScore: number;
  points?: number;
  match: {
    id: number;
    homeTeam: any;
    awayTeam: any;
    homeScore: number | null;
    awayScore: number | null;
    dateTime: string;
    stage: string;
    groupLabel?: string;
  };
}

export default function PalpitesPage() {
  const { user, loading: authLoading } = useAuth();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    const fetchPredictions = async () => {
      try {
        const res = await fetch('/api/predictions');
        if (res.ok) {
          const data = await res.json();
          setPredictions(data.predictions || data || []);
        }
      } catch (err) {
        console.error('Erro ao carregar palpites:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-600">Voce precisa estar logado para ver seus palpites.</p>
      </div>
    );
  }

  const totalPoints = predictions.reduce((sum, p) => sum + (p.points || 0), 0);
  const exactScores = predictions.filter(
    (p) =>
      p.points !== undefined &&
      p.match.homeScore !== null &&
      p.homeScore === p.match.homeScore &&
      p.awayScore === p.match.awayScore
  ).length;
  const matchesWithResult = predictions.filter(
    (p) => p.match.homeScore !== null
  ).length;

  const groupedByStage: Record<string, Prediction[]> = {};
  predictions.forEach((p) => {
    const stage = p.match.stage === 'GROUP'
      ? `Grupo ${p.match.groupLabel || ''}`
      : p.match.stage.replace(/_/g, ' ');
    if (!groupedByStage[stage]) groupedByStage[stage] = [];
    groupedByStage[stage].push(p);
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-emerald-800">
          Meus Palpites
        </h1>
        <Link
          href="/palpites/bonus"
          className="bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-600 transition-colors text-center text-sm"
        >
          Palpites Bonus
        </Link>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-sm text-gray-500">Total de Pontos</p>
          <p className="text-2xl font-bold text-emerald-700">{totalPoints}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-sm text-gray-500">Placares Exatos</p>
          <p className="text-2xl font-bold text-emerald-700">{exactScores}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-sm text-gray-500">Jogos Apurados</p>
          <p className="text-2xl font-bold text-emerald-700">{matchesWithResult}</p>
        </div>
      </div>

      {/* Palpites por fase */}
      {predictions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            Voce ainda nao fez nenhum palpite.
          </p>
          <Link
            href="/jogos"
            className="text-emerald-700 font-medium hover:underline"
          >
            Ir para os Jogos
          </Link>
        </div>
      ) : (
        Object.entries(groupedByStage).map(([stage, preds]) => (
          <div key={stage} className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-3 capitalize">
              {stage}
            </h2>
            <div className="space-y-2">
              {preds.map((p) => (
                <Link
                  key={p.id}
                  href={`/jogos/${p.matchId}`}
                  className="block bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:border-emerald-200 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Flag code={p.match.homeTeam?.code || ''} emoji={p.match.homeTeam?.flagEmoji} size={20} />
                        <span className="font-medium">{p.match.homeTeam?.name || p.match.homeTeam}</span>
                        <span className="text-emerald-700 font-bold">
                          {p.homeScore} x {p.awayScore}
                        </span>
                        <span className="font-medium">{p.match.awayTeam?.name || p.match.awayTeam}</span>
                        <Flag code={p.match.awayTeam?.code || ''} emoji={p.match.awayTeam?.flagEmoji} size={20} />
                      </div>
                      {p.match.homeScore !== null && (
                        <p className="text-xs text-gray-400 mt-1">
                          Resultado: {p.match.homeScore} x {p.match.awayScore}
                        </p>
                      )}
                    </div>
                    {p.points !== undefined && (
                      <span
                        className={`text-sm font-bold px-3 py-1 rounded-full ${
                          p.points > 0
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {p.points} pts
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
