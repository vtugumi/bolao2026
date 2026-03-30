'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import GroupStandingsTable from '@/components/GroupStandingsTable';
import Flag from '@/components/Flag';

/* eslint-disable @typescript-eslint/no-explicit-any */

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export default function ClassificacaoPage() {
  const [allStandings, setAllStandings] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const results: Record<string, any[]> = {};
        await Promise.all(
          GROUPS.map(async (g) => {
            const res = await fetch(`/api/groups/${g}`);
            if (res.ok) {
              const data = await res.json();
              results[g] = data.standings || data || [];
            }
          })
        );
        setAllStandings(results);
      } catch (err) {
        console.error('Erro ao carregar classificacao:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-2xl md:text-3xl font-bold text-emerald-800 mb-6">Classificacao</h1>
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      </div>
    );
  }

  // Collect 3rd placed teams
  const thirdPlaced: any[] = [];
  for (const g of GROUPS) {
    const standings = allStandings[g] || [];
    if (standings.length >= 3) {
      thirdPlaced.push({ ...standings[2], group: g });
    }
  }
  // Sort: points desc, goal difference desc, goals for desc
  thirdPlaced.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl md:text-3xl font-bold text-emerald-800 mb-6">Classificacao dos Grupos</h1>

      {/* All 12 groups in grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
        {GROUPS.map((g) => (
          <GroupStandingsTable key={g} standings={allStandings[g] || []} groupLabel={g} />
        ))}
      </div>

      {/* 3rd place ranking */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 bg-yellow-500 text-white font-semibold flex items-center gap-2">
          <span>Ranking dos 3os Colocados</span>
          <span className="text-xs font-normal opacity-80">— Os 8 melhores se classificam</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 uppercase text-xs">
                <th className="text-left px-4 py-3 w-8">#</th>
                <th className="text-center px-2 py-3 w-12">Grupo</th>
                <th className="text-left px-4 py-3">Selecao</th>
                <th className="text-center px-2 py-3">J</th>
                <th className="text-center px-2 py-3">V</th>
                <th className="text-center px-2 py-3">E</th>
                <th className="text-center px-2 py-3">D</th>
                <th className="text-center px-2 py-3">GP</th>
                <th className="text-center px-2 py-3">GC</th>
                <th className="text-center px-2 py-3">SG</th>
                <th className="text-center px-2 py-3 font-bold">Pts</th>
              </tr>
            </thead>
            <tbody>
              {thirdPlaced.map((s, i) => (
                <tr
                  key={s.teamId}
                  className={`border-t border-gray-100 ${
                    i < 8
                      ? 'bg-emerald-50 border-l-4 border-l-emerald-500'
                      : 'bg-red-50 border-l-4 border-l-red-300'
                  }`}
                >
                  <td className="px-4 py-3 text-gray-400 font-medium">{i + 1}</td>
                  <td className="text-center px-2 py-3">
                    <span className="inline-block bg-gray-200 text-gray-700 text-xs font-bold px-2 py-0.5 rounded">{s.group}</span>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <Flag code={s.teamCode} emoji={s.flagEmoji} size={20} className="mr-2" />
                    {s.teamName}
                  </td>
                  <td className="text-center px-2 py-3">{s.played}</td>
                  <td className="text-center px-2 py-3">{s.won}</td>
                  <td className="text-center px-2 py-3">{s.drawn}</td>
                  <td className="text-center px-2 py-3">{s.lost}</td>
                  <td className="text-center px-2 py-3">{s.goalsFor}</td>
                  <td className="text-center px-2 py-3">{s.goalsAgainst}</td>
                  <td className="text-center px-2 py-3">{s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}</td>
                  <td className="text-center px-2 py-3 font-bold text-emerald-700">{s.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2 bg-gray-50 flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Classificados (top 8)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-300 inline-block" /> Eliminados
          </span>
        </div>
      </div>
    </div>
  );
}
