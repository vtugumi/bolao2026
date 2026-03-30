'use client';

import Link from 'next/link';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface LeaderboardTableProps {
  rankings: any[];
}

function getMedal(rank: number): string {
  if (rank === 1) return '\uD83E\uDD47';
  if (rank === 2) return '\uD83E\uDD48';
  if (rank === 3) return '\uD83E\uDD49';
  return '';
}

function getRowStyle(rank: number): string {
  if (rank === 1) return 'bg-yellow-50 border-l-4 border-l-yellow-400';
  if (rank === 2) return 'bg-gray-50 border-l-4 border-l-gray-400';
  if (rank === 3) return 'bg-orange-50 border-l-4 border-l-orange-400';
  return 'border-l-4 border-l-transparent';
}

export default function LeaderboardTable({ rankings }: LeaderboardTableProps) {
  if (rankings.length === 0) {
    return <div className="text-center py-12 text-gray-500"><p>Nenhum participante no ranking ainda</p></div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-emerald-800 text-white text-sm">
              <th className="px-4 py-3 text-left w-16">#</th>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-center">Pontos</th>
              <th className="px-4 py-3 text-center">Placares Exatos</th>
              <th className="px-4 py-3 text-center">Bonus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rankings.map((r: any) => {
              const rank = r.rank ?? r.position ?? 0;
              const id = r.id ?? r.userId;
              return (
                <tr key={id} className={`hover:bg-gray-50 transition-colors ${getRowStyle(rank)}`}>
                  <td className="px-4 py-3 font-bold text-gray-700">{getMedal(rank) || rank}</td>
                  <td className="px-4 py-3">
                    <Link href={`/ranking/${id}`} className="text-emerald-700 hover:text-emerald-900 font-medium hover:underline">
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-lg text-gray-900">{r.totalPoints}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{r.exactScores}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{r.bonusHits ?? r.bonusPoints ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden divide-y divide-gray-100">
        {rankings.map((r: any) => {
          const rank = r.rank ?? r.position ?? 0;
          const id = r.id ?? r.userId;
          return (
            <Link key={id} href={`/ranking/${id}`}
              className={`block p-4 hover:bg-gray-50 transition-colors ${getRowStyle(rank)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-700 w-8">{getMedal(rank) || rank}</span>
                  <div>
                    <p className="font-medium text-emerald-700">{r.name}</p>
                    <p className="text-xs text-gray-500">
                      {r.exactScores} placares exatos | Bonus: {r.bonusHits ?? r.bonusPoints ?? 0}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-gray-900">{r.totalPoints}</span>
                  <p className="text-xs text-gray-500">pts</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
