'use client';

import { useState, useEffect } from 'react';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface BonusPredictionFormProps {
  initialData?: any;
  onSave?: (data: { champion: string; runnerUp: string; topScorer: string }) => Promise<void>;
  saving?: boolean;
  locked?: boolean;
}

export default function BonusPredictionForm({ initialData, onSave, saving, locked }: BonusPredictionFormProps) {
  const [champion, setChampion] = useState(initialData?.champion || '');
  const [runnerUp, setRunnerUp] = useState(initialData?.runnerUp || '');
  const [topScorer, setTopScorer] = useState(initialData?.topScorer || '');
  const [teams, setTeams] = useState<{ id: number; name: string; flagEmoji: string }[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/matches?stage=GROUP')
      .then(r => r.json())
      .then(data => {
        const matches = Array.isArray(data) ? data : data.matches || [];
        const teamMap = new Map<number, any>();
        for (const m of matches) {
          if (m.homeTeam) teamMap.set(m.homeTeam.id, m.homeTeam);
          if (m.awayTeam) teamMap.set(m.awayTeam.id, m.awayTeam);
        }
        const sorted = Array.from(teamMap.values()).sort((a: any, b: any) => a.name.localeCompare(b.name));
        setTeams(sorted);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (initialData) {
      setChampion(initialData.champion || '');
      setRunnerUp(initialData.runnerUp || '');
      setTopScorer(initialData.topScorer || '');
    }
  }, [initialData]);

  const handleSubmit = async () => {
    if (!champion || !runnerUp) {
      setError('Selecione campeao e vice-campeao.');
      return;
    }
    setError('');
    await onSave?.({ champion, runnerUp, topScorer });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Campeao</label>
        <select value={champion} onChange={e => setChampion(e.target.value)} disabled={locked}
          className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-emerald-500 focus:outline-none disabled:bg-gray-100">
          <option value="">Selecione...</option>
          {teams.map(t => (
            <option key={t.id} value={t.name}>{t.flagEmoji} {t.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Vice-campeao</label>
        <select value={runnerUp} onChange={e => setRunnerUp(e.target.value)} disabled={locked}
          className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-emerald-500 focus:outline-none disabled:bg-gray-100">
          <option value="">Selecione...</option>
          {teams.map(t => (
            <option key={t.id} value={t.name}>{t.flagEmoji} {t.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Artilheiro</label>
        <input type="text" value={topScorer} onChange={e => setTopScorer(e.target.value)} disabled={locked}
          placeholder="Nome do jogador"
          className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-emerald-500 focus:outline-none disabled:bg-gray-100" />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {!locked && (
        <button onClick={handleSubmit} disabled={saving}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors">
          {saving ? 'Salvando...' : 'Salvar Palpites Bonus'}
        </button>
      )}

      <div className="text-xs text-gray-400 space-y-1">
        <p>+20 pontos por acertar o campeao</p>
        <p>+15 pontos por acertar o vice-campeao</p>
        <p>+15 pontos por acertar o artilheiro</p>
      </div>
    </div>
  );
}
