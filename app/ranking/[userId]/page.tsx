'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function UserRankingPage() {
  const params = useParams();
  const userId = params.userId as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/rankings/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
  if (!data || !data.user) return <div className="text-center py-12"><p className="text-red-600">Usuario nao encontrado.</p></div>;

  const { user, predictions, bonusPredictions, totalPoints } = data;
  const exactScores = predictions.filter((p: any) =>
    (p.match.stage === 'GROUP' && p.points === 5) || (p.match.stage !== 'GROUP' && p.points === 8)
  ).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link href="/ranking" className="text-emerald-700 text-sm hover:underline mb-4 inline-block">
        &larr; Voltar ao Ranking
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-2">
        <h1 className="text-2xl md:text-3xl font-bold text-emerald-800">{user.name}</h1>
        <div className="bg-emerald-700 text-white px-6 py-3 rounded-xl text-center">
          <p className="text-sm opacity-80">Total</p>
          <p className="text-2xl font-bold">{totalPoints} pts</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-xs text-gray-500">Placares Exatos</p>
          <p className="text-xl font-bold text-emerald-700">{exactScores}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-xs text-gray-500">Palpites</p>
          <p className="text-xl font-bold text-emerald-700">{predictions.length}</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-gray-700 mb-3">Palpites</h2>
      {predictions.length === 0 ? (
        <p className="text-gray-500 py-4">Nenhum palpite registrado.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Jogo</th>
                  <th className="px-4 py-3 text-center">Palpite</th>
                  <th className="px-4 py-3 text-center">Resultado</th>
                  <th className="px-4 py-3 text-center">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {predictions.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium">
                        {p.match.homeTeam?.name || '?'} x {p.match.awayTeam?.name || '?'}
                      </span>
                      <span className="block text-xs text-gray-400">
                        {p.match.stage === 'GROUP' ? `Grupo ${p.match.groupLabel || ''}` : p.match.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-emerald-700">
                      {p.homeScore} x {p.awayScore}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">
                      {p.match.homeScore != null ? `${p.match.homeScore} x ${p.match.awayScore}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${(p.points || 0) > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
                        {p.points ?? '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {bonusPredictions && bonusPredictions.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Palpites Bonus</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
            {bonusPredictions.map((b: any) => (
              <div key={b.type} className="flex justify-between items-center">
                <span className="text-gray-600">
                  {b.type === 'CHAMPION' ? 'Campeao' : b.type === 'RUNNER_UP' ? 'Vice-campeao' : 'Artilheiro'}
                </span>
                <div className="text-right">
                  <span className="font-medium">{b.value}</span>
                  {b.points != null && (
                    <span className={`ml-2 text-sm font-bold ${b.points > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {b.points > 0 ? `+${b.points}` : '0'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
