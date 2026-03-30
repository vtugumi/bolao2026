'use client';

import { useState, useEffect } from 'react';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function BonusSection() {
  const [open, setOpen] = useState(false);
  const [champion, setChampion] = useState('');
  const [runnerUp, setRunnerUp] = useState('');
  const [topScorer, setTopScorer] = useState('');
  const [teams, setTeams] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hasPredictions, setHasPredictions] = useState(false);
  const [cupStarted, setCupStarted] = useState(false);

  // Load existing bonus predictions + teams list
  useEffect(() => {
    Promise.all([
      fetch('/api/predictions/bonus').then(r => r.ok ? r.json() : []),
      fetch('/api/matches?stage=GROUP&groupLabel=A').then(r => r.ok ? r.json() : []),
    ]).then(([bonusData, matchData]) => {
      // Parse bonus
      const bonusArr = Array.isArray(bonusData) ? bonusData : bonusData.predictions || [];
      for (const b of bonusArr) {
        if (b.type === 'CHAMPION') setChampion(b.value || '');
        if (b.type === 'RUNNER_UP') setRunnerUp(b.value || '');
        if (b.type === 'TOP_SCORER') setTopScorer(b.value || '');
      }
      if (bonusArr.length > 0) setHasPredictions(true);

      // Parse teams from all groups + check if cup started
      fetch('/api/matches?stage=GROUP').then(r => r.json()).then(allData => {
        const arr = Array.isArray(allData) ? allData : allData.matches || [];
        const teamMap = new Map<number, any>();
        let earliestDate: Date | null = null;
        for (const m of arr) {
          if (m.homeTeam) teamMap.set(m.homeTeam.id, m.homeTeam);
          if (m.awayTeam) teamMap.set(m.awayTeam.id, m.awayTeam);
          const d = new Date(m.dateTime);
          if (!earliestDate || d < earliestDate) earliestDate = d;
        }
        setTeams(Array.from(teamMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
        if (earliestDate && earliestDate <= new Date()) {
          setCupStarted(true);
        }
      });

      setLoaded(true);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const promises = [];
      if (champion) promises.push(fetch('/api/predictions/bonus', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'CHAMPION', value: champion }),
      }));
      if (runnerUp) promises.push(fetch('/api/predictions/bonus', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'RUNNER_UP', value: runnerUp }),
      }));
      if (topScorer) promises.push(fetch('/api/predictions/bonus', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'TOP_SCORER', value: topScorer }),
      }));
      await Promise.all(promises);
      setSaved(true);
      setHasPredictions(true);
      setOpen(false);
      setTimeout(() => setSaved(false), 4000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  // Summary line when collapsed
  const summaryParts = [];
  if (champion) summaryParts.push(`Campeao: ${champion}`);
  if (runnerUp) summaryParts.push(`Vice: ${runnerUp}`);
  if (topScorer) summaryParts.push(`Artilheiro: ${topScorer}`);

  // If already saved and collapsed, show minimal line
  if (hasPredictions && !open) {
    return (
      <div className="mb-4 flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
        <p className="text-xs text-gray-500">
          <span className="text-amber-600 font-medium">Bonus:</span> {summaryParts.join(' | ')}
        </p>
        {cupStarted ? (
          <span className="text-xs text-red-400">🔒 Bloqueado</span>
        ) : (
          <button onClick={() => setOpen(true)} className="text-xs text-amber-600 hover:text-amber-800 underline">
            editar
          </button>
        )}
      </div>
    );
  }

  // If cup started and no predictions, show locked message
  if (cupStarted && !hasPredictions) {
    return (
      <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
        <p className="text-xs text-red-500">🔒 Palpites bonus bloqueados - a Copa ja comecou</p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {!hasPredictions && !cupStarted && (
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300 hover:from-amber-100 hover:to-yellow-100 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <div className="text-left">
              <span className="font-bold text-amber-800 text-sm">Palpites Bonus</span>
              {!open && (
                <p className="text-xs text-amber-600 mt-0.5">Palpite campeao (+20pts), vice (+15pts) e artilheiro (+15pts)!</p>
              )}
            </div>
          </div>
          <span className={`text-amber-600 transition-transform ${open ? 'rotate-180' : ''}`}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>
      )}

      {open && (
        <div className="mt-2 bg-white border border-amber-200 rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-amber-800 mb-1">🥇 Campeao (+20pts)</label>
              <select value={champion} onChange={e => setChampion(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400 focus:outline-none">
                <option value="">Selecione...</option>
                {teams.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-800 mb-1">🥈 Vice-campeao (+15pts)</label>
              <select value={runnerUp} onChange={e => setRunnerUp(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400 focus:outline-none">
                <option value="">Selecione...</option>
                {teams.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-800 mb-1">⚽ Artilheiro (+15pts)</label>
              <input type="text" value={topScorer} onChange={e => setTopScorer(e.target.value)}
                placeholder="Nome do jogador"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400 focus:outline-none" />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button onClick={handleSave} disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold py-2 px-6 rounded-lg transition-colors text-sm">
              {saving ? 'Salvando...' : 'Salvar Bonus'}
            </button>
            {saved && <span className="text-emerald-600 text-sm font-medium">Salvo!</span>}
          </div>
        </div>
      )}
    </div>
  );
}
