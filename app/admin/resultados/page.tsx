'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

const STAGE_OPTIONS = [
  { value: 'ALL', label: 'Todos' },
  { value: 'GROUP', label: 'Grupos' },
  { value: 'R32', label: '16 avos de Final' },
  { value: 'R16', label: 'Oitavas' },
  { value: 'QF', label: 'Quartas' },
  { value: 'SF', label: 'Semifinal' },
  { value: '3RD', label: '3o Lugar' },
  { value: 'FINAL', label: 'Final' },
];

interface MatchItem {
  id: number;
  matchNumber: number;
  stage: string;
  groupLabel?: string | null;
  dateTime: string;
  homeTeam?: { name: string; flagEmoji: string } | null;
  awayTeam?: { name: string; flagEmoji: string } | null;
  homeScore: number | null;
  awayScore: number | null;
}

export default function AdminResultadosPage() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState('ALL');

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedStage !== 'ALL') params.set('stage', selectedStage);
    fetch(`/api/matches?${params.toString()}`)
      .then(r => r.json())
      .then(data => setMatches(Array.isArray(data) ? data : data.matches || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedStage]);

  const withResult = matches.filter(m => m.homeScore !== null);
  const withoutResult = matches.filter(m => m.homeScore === null);

  const teamLabel = (m: MatchItem) => {
    const h = m.homeTeam ? `${m.homeTeam.flagEmoji} ${m.homeTeam.name}` : 'A definir';
    const a = m.awayTeam ? `${m.awayTeam.flagEmoji} ${m.awayTeam.name}` : 'A definir';
    return { h, a };
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-emerald-800 mb-4">Gerenciar Resultados</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        {STAGE_OPTIONS.map(s => (
          <button key={s.value} onClick={() => { setSelectedStage(s.value); setLoading(true); }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedStage === s.value ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-12"><LoadingSpinner /></div> : (
        <div>
          {withoutResult.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-amber-700 mb-3">Aguardando Resultado ({withoutResult.length})</h2>
              <div className="space-y-2">
                {withoutResult.map(m => {
                  const { h, a } = teamLabel(m);
                  return (
                    <Link key={m.id} href={`/admin/resultados/${m.id}`}
                      className="block bg-white rounded-lg p-4 shadow-sm border border-amber-100 hover:border-amber-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{h} vs {a}</span>
                          <span className="block text-xs text-gray-400 mt-1">
                            Jogo #{m.matchNumber} | {new Date(m.dateTime).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            {m.stage === 'GROUP' ? ` | Grupo ${m.groupLabel}` : ` | ${m.stage}`}
                          </span>
                        </div>
                        <span className="text-amber-600 text-sm font-medium">Inserir</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {withResult.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-emerald-700 mb-3">Com Resultado ({withResult.length})</h2>
              <div className="space-y-2">
                {withResult.map(m => {
                  const { h, a } = teamLabel(m);
                  return (
                    <Link key={m.id} href={`/admin/resultados/${m.id}`}
                      className="block bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:border-emerald-200 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{h} <span className="text-emerald-700 font-bold">{m.homeScore} x {m.awayScore}</span> {a}</span>
                          <span className="block text-xs text-gray-400 mt-1">
                            {m.stage === 'GROUP' ? `Grupo ${m.groupLabel}` : m.stage}
                          </span>
                        </div>
                        <span className="text-gray-400 text-sm">Editar</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {matches.length === 0 && <p className="text-center text-gray-500 py-12">Nenhum jogo encontrado.</p>}
        </div>
      )}
    </div>
  );
}
