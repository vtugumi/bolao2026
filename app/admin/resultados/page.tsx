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
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ message: string; details?: string[] } | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/admin/sync', { method: 'POST' });
      const data = await res.json();
      setSyncResult({ message: data.message || data.error, details: data.details });
      if (data.synced > 0) {
        setLoading(true);
        const params = new URLSearchParams();
        if (selectedStage !== 'ALL') params.set('stage', selectedStage);
        const r = await fetch(`/api/matches?${params.toString()}`);
        const refreshed = await r.json();
        setMatches(Array.isArray(refreshed) ? refreshed : refreshed.matches || []);
        setLoading(false);
      }
    } catch {
      setSyncResult({ message: 'Erro de conexao ao sincronizar.' });
    } finally {
      setSyncing(false);
    }
  };

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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-emerald-800">Gerenciar Resultados</h1>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {syncing ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Sincronizando...
            </>
          ) : 'Sincronizar agora'}
        </button>
      </div>

      {syncResult && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${syncResult.details && syncResult.details.length > 0 ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-blue-50 border border-blue-200 text-blue-800'}`}>
          <p className="font-medium">{syncResult.message}</p>
          {syncResult.details && syncResult.details.length > 0 && (
            <ul className="mt-1 text-xs space-y-0.5">
              {syncResult.details.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          )}
        </div>
      )}

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
