'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { BonusOddsPanel } from './OddsPanel';

/* eslint-disable @typescript-eslint/no-explicit-any */

const TOP_SCORERS = [
  'Mbappé', 'Harry Kane', 'Haaland', 'Lamine Yamal', 'Vini Jr',
  'Cristiano Ronaldo', 'Endrick', 'Dembélé', 'Olise', 'Ferran Torres',
  'Salah', 'Julián Álvarez', 'Darwin Núñez', 'Isak',
];

const BRAZIL_PLAYERS = [
  // Atacantes
  'Vinícius Júnior', 'Raphinha', 'Neymar', 'Endrick', 'Martinelli',
  'Luiz Henrique', 'Matheus Cunha', 'Igor Thiago', 'Rayan',
  // Meio-campistas
  'Bruno Guimarães', 'Casemiro', 'Lucas Paquetá', 'Éderson', 'Fabinho', 'Danilo Santos',
  // Defensores
  'Marquinhos', 'Gabriel Magalhães', 'Bremer', 'Danilo', 'Alex Sandro',
  'Léo Pereira', 'Douglas Santos', 'Ibañez',
  // Goleiros
  'Alisson', 'Ederson', 'Weverton',
];

export default function BonusSection() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [champion, setChampion] = useState('');
  const [runnerUp, setRunnerUp] = useState('');
  const [topScorer, setTopScorer] = useState('');
  const [isCustomScorer, setIsCustomScorer] = useState(false);
  const [thirdPlace, setThirdPlace] = useState('');
  const [fourthPlace, setFourthPlace] = useState('');
  const [brazilFirstGoal, setBrazilFirstGoal] = useState('');
  const [isCustomBrazilPlayer, setIsCustomBrazilPlayer] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hasPredictions, setHasPredictions] = useState(false);
  const [cupStarted, setCupStarted] = useState<boolean | null>(null);
  const [bonusOdds, setBonusOdds] = useState<any>(null);

  // Load existing bonus predictions + teams list — re-runs when user changes (re-login)
  useEffect(() => {
    // Reset state for new user
    setChampion('');
    setRunnerUp('');
    setTopScorer('');
    setIsCustomScorer(false);
    setThirdPlace('');
    setFourthPlace('');
    setBrazilFirstGoal('');
    setIsCustomBrazilPlayer(false);
    setHasPredictions(false);
    setLoaded(false);
    setOpen(false);
    setSaved(false);
    setSaveError('');

    if (!user) return;

    // Fetch bonus odds
    fetch('/api/predictions/bonus/odds', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setBonusOdds(data); })
      .catch(() => {});

    Promise.all([
      fetch('/api/predictions/bonus', { cache: 'no-store' }).then(r => r.ok ? r.json() : []),
      fetch('/api/matches?stage=GROUP&groupLabel=A', { cache: 'no-store' }).then(r => r.ok ? r.json() : []),
    ]).then(([bonusData]) => {
      // Parse bonus
      const bonusArr = Array.isArray(bonusData) ? bonusData : bonusData.predictions || [];
      for (const b of bonusArr) {
        if (b.type === 'CHAMPION') setChampion(b.value || '');
        if (b.type === 'RUNNER_UP') setRunnerUp(b.value || '');
        if (b.type === 'TOP_SCORER') {
          setTopScorer(b.value || '');
          if (b.value && !TOP_SCORERS.includes(b.value)) setIsCustomScorer(true);
        }
        if (b.type === 'THIRD_PLACE') setThirdPlace(b.value || '');
        if (b.type === 'FOURTH_PLACE') setFourthPlace(b.value || '');
        if (b.type === 'BRAZIL_FIRST_GOAL') {
          setBrazilFirstGoal(b.value || '');
          if (b.value && !BRAZIL_PLAYERS.includes(b.value)) setIsCustomBrazilPlayer(true);
        }
      }
      if (bonusArr.length > 0) setHasPredictions(true);

      // Parse teams from all groups + check if cup started
      fetch('/api/matches?stage=GROUP', { cache: 'no-store' }).then(r => r.json()).then(allData => {
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
        setCupStarted(earliestDate ? earliestDate <= new Date() : false);
        setLoaded(true);
      });
    });
  }, [user?.id]);

  const [saveError, setSaveError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError('');
    try {
      const items = [
        { type: 'CHAMPION', value: champion },
        { type: 'RUNNER_UP', value: runnerUp },
        { type: 'TOP_SCORER', value: topScorer },
        { type: 'THIRD_PLACE', value: thirdPlace },
        { type: 'FOURTH_PLACE', value: fourthPlace },
        { type: 'BRAZIL_FIRST_GOAL', value: brazilFirstGoal },
      ].filter(i => i.value);

      const failed: string[] = [];
      for (const item of items) {
        try {
          const res = await fetch('/api/predictions/bonus', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          });
          if (!res.ok) failed.push(item.type);
        } catch {
          failed.push(item.type);
        }
      }

      if (failed.length > 0) {
        setSaveError(`Erro ao salvar ${failed.length} palpite(s). Tente novamente.`);
      } else {
        setSaved(true);
        setHasPredictions(true);
        setOpen(false);
        setTimeout(() => setSaved(false), 4000);
      }
    } catch {
      setSaveError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  // Summary line when collapsed
  const summaryParts = [];
  if (champion) summaryParts.push(`Campeao: ${champion}`);
  if (runnerUp) summaryParts.push(`Vice: ${runnerUp}`);
  if (thirdPlace) summaryParts.push(`3o: ${thirdPlace}`);
  if (fourthPlace) summaryParts.push(`4o: ${fourthPlace}`);
  if (topScorer) summaryParts.push(`Artilheiro: ${topScorer}`);
  if (brazilFirstGoal) summaryParts.push(`1o Gol BRA: ${brazilFirstGoal}`);

  const missingBrazilGoal = hasPredictions && !brazilFirstGoal && !cupStarted;

  // If already saved and collapsed, show minimal line
  if (hasPredictions && !open) {
    return (
      <div className="mb-4 space-y-2">
        {missingBrazilGoal && (
          <button
            onClick={() => setOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-green-50 to-yellow-50 border border-green-300 hover:from-green-100 hover:to-yellow-100 transition-all shadow-sm animate-pulse-subtle"
          >
            <span className="text-lg">🇧🇷</span>
            <div className="text-left flex-1">
              <span className="text-xs font-bold text-green-800">Nova pergunta bonus!</span>
              <p className="text-[11px] text-green-700">Quem fara o primeiro gol do Brasil? (+50pts) — Clique para responder</p>
            </div>
            <span className="text-green-600 text-xs font-semibold">Responder →</span>
          </button>
        )}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
          <p className="text-xs text-gray-500">
            <span className="text-amber-600 font-medium">Bonus:</span> {summaryParts.join(' | ')}
          </p>
          {cupStarted ? (
            <Link href="/palpites/bonus" className="text-xs text-amber-600 hover:text-amber-800 underline">
              Ver palpites de todos →
            </Link>
          ) : (
            <button onClick={() => setOpen(true)} className="text-xs text-amber-600 hover:text-amber-800 underline">
              editar
            </button>
          )}
        </div>
      </div>
    );
  }

  // If cup started and no predictions, show locked message
  if (cupStarted && !hasPredictions) {
    return (
      <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-100 flex items-center justify-between">
        <p className="text-xs text-red-500">Palpites bonus bloqueados - a Copa ja comecou</p>
        <Link href="/palpites/bonus" className="text-xs text-amber-600 hover:text-amber-800 underline">
          Ver palpites de todos →
        </Link>
      </div>
    );
  }

  const selectClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400 focus:outline-none";

  return (
    <div className="mb-6">
      {!hasPredictions && !cupStarted && (
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300 hover:from-amber-100 hover:to-yellow-100 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">&#127942;</span>
            <div className="text-left">
              <span className="font-bold text-amber-800 text-sm">Palpites Bonus</span>
              {!open && (
                <p className="text-xs text-amber-600 mt-0.5">Campeao (+120), Vice (+80), 3o/4o (+50), Artilheiro (+80), 1o Gol BRA (+50)</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-amber-800 mb-1">Campeao (+120pts)</label>
              <select value={champion} onChange={e => setChampion(e.target.value)} className={selectClass}>
                <option value="">Selecione...</option>
                {teams.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
              {bonusOdds && (
                <BonusOddsPanel
                  title="Campeao"
                  groupOdds={bonusOdds.group?.CHAMPION || []}
                  rankingOdds={bonusOdds.ranking?.CHAMPION?.map((r: any) => ({ value: r.name, flagEmoji: r.flagEmoji, percentage: r.probability })) || []}
                  optaOdds={bonusOdds.opta?.CHAMPION?.map((r: any) => ({ value: r.name, flagEmoji: r.flagEmoji, percentage: r.probability })) || []}
                  marketOdds={bonusOdds.market?.CHAMPION || []}
                  totalMembers={bonusOdds.totalMembers || 0}
                  userHasPredicted={bonusOdds.userHasPredicted || false}
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-800 mb-1">Vice-campeao (+80pts)</label>
              <select value={runnerUp} onChange={e => setRunnerUp(e.target.value)} className={selectClass}>
                <option value="">Selecione...</option>
                {teams.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
              {bonusOdds && (
                <BonusOddsPanel
                  title="Vice-campeao"
                  groupOdds={bonusOdds.group?.RUNNER_UP || []}
                  totalMembers={bonusOdds.totalMembers || 0}
                  userHasPredicted={bonusOdds.userHasPredicted || false}
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-800 mb-1">Terceiro lugar (+50pts)</label>
              <select value={thirdPlace} onChange={e => setThirdPlace(e.target.value)} className={selectClass}>
                <option value="">Selecione...</option>
                {teams.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
              {bonusOdds && (
                <BonusOddsPanel
                  title="3o Lugar"
                  groupOdds={bonusOdds.group?.THIRD_PLACE || []}
                  totalMembers={bonusOdds.totalMembers || 0}
                  userHasPredicted={bonusOdds.userHasPredicted || false}
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-amber-800 mb-1">Quarto lugar (+50pts)</label>
              <select value={fourthPlace} onChange={e => setFourthPlace(e.target.value)} className={selectClass}>
                <option value="">Selecione...</option>
                {teams.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
              {bonusOdds && (
                <BonusOddsPanel
                  title="4o Lugar"
                  groupOdds={bonusOdds.group?.FOURTH_PLACE || []}
                  totalMembers={bonusOdds.totalMembers || 0}
                  userHasPredicted={bonusOdds.userHasPredicted || false}
                />
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-amber-800 mb-1">Artilheiro (+80pts)</label>
              <select
                value={isCustomScorer ? '__other__' : topScorer}
                onChange={e => {
                  if (e.target.value === '__other__') {
                    setIsCustomScorer(true);
                    setTopScorer('');
                  } else {
                    setIsCustomScorer(false);
                    setTopScorer(e.target.value);
                  }
                }}
                className={selectClass}
              >
                <option value="">Selecione...</option>
                {TOP_SCORERS.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
                <option value="__other__">Outro...</option>
              </select>
              {isCustomScorer && (
                <input type="text" value={topScorer} onChange={e => setTopScorer(e.target.value)}
                  placeholder="Digite o nome do jogador" className={`${selectClass} mt-1`} />
              )}
              {bonusOdds && (
                <BonusOddsPanel
                  title="Artilheiro"
                  groupOdds={bonusOdds.group?.TOP_SCORER || []}
                  marketOdds={bonusOdds.market?.TOP_SCORER || []}
                  totalMembers={bonusOdds.totalMembers || 0}
                  userHasPredicted={bonusOdds.userHasPredicted || false}
                />
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-amber-800 mb-1">Primeiro gol do Brasil (+50pts)</label>
              <select
                value={isCustomBrazilPlayer ? '__other__' : brazilFirstGoal}
                onChange={e => {
                  if (e.target.value === '__other__') {
                    setIsCustomBrazilPlayer(true);
                    setBrazilFirstGoal('');
                  } else {
                    setIsCustomBrazilPlayer(false);
                    setBrazilFirstGoal(e.target.value);
                  }
                }}
                className={selectClass}
              >
                <option value="">Selecione...</option>
                {BRAZIL_PLAYERS.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
                <option value="__other__">Outro...</option>
              </select>
              {isCustomBrazilPlayer && (
                <input type="text" value={brazilFirstGoal} onChange={e => setBrazilFirstGoal(e.target.value)}
                  placeholder="Digite o nome do jogador" className={`${selectClass} mt-1`} />
              )}
              {bonusOdds && (
                <BonusOddsPanel
                  title="1o Gol Brasil"
                  groupOdds={bonusOdds.group?.BRAZIL_FIRST_GOAL || []}
                  totalMembers={bonusOdds.totalMembers || 0}
                  userHasPredicted={bonusOdds.userHasPredicted || false}
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button onClick={handleSave} disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold py-2 px-6 rounded-lg transition-colors text-sm">
              {saving ? 'Salvando...' : 'Salvar Bonus'}
            </button>
            {saved && <span className="text-emerald-600 text-sm font-medium">Salvo!</span>}
            {saveError && <span className="text-red-500 text-sm font-medium">{saveError}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
