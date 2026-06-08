'use client';

import { useState, useEffect } from 'react';
import { BonusOddsPanel } from './OddsPanel';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface BonusPredictionFormProps {
  initialData?: any;
  onSave?: (data: {
    champion: string;
    runnerUp: string;
    topScorer: string;
    thirdPlace: string;
    fourthPlace: string;
  }) => Promise<void>;
  saving?: boolean;
  locked?: boolean;
}

export default function BonusPredictionForm({ initialData, onSave, saving, locked }: BonusPredictionFormProps) {
  const [champion, setChampion] = useState(initialData?.champion || '');
  const [runnerUp, setRunnerUp] = useState(initialData?.runnerUp || '');
  const [topScorer, setTopScorer] = useState(initialData?.topScorer || '');
  const [thirdPlace, setThirdPlace] = useState(initialData?.thirdPlace || '');
  const [fourthPlace, setFourthPlace] = useState(initialData?.fourthPlace || '');
  const [teams, setTeams] = useState<{ id: number; name: string; flagEmoji: string }[]>([]);
  const [bonusOdds, setBonusOdds] = useState<any>(null);
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

    // Fetch bonus odds
    fetch('/api/predictions/bonus/odds')
      .then(r => r.json())
      .then(data => setBonusOdds(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (initialData) {
      setChampion(initialData.champion || '');
      setRunnerUp(initialData.runnerUp || '');
      setTopScorer(initialData.topScorer || '');
      setThirdPlace(initialData.thirdPlace || '');
      setFourthPlace(initialData.fourthPlace || '');
    }
  }, [initialData]);

  const handleSubmit = async () => {
    if (!champion || !runnerUp) {
      setError('Selecione campeao e vice-campeao.');
      return;
    }
    setError('');
    await onSave?.({ champion, runnerUp, topScorer, thirdPlace, fourthPlace });
  };

  const selectClass = "w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-emerald-500 focus:outline-none disabled:bg-gray-100";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Campeao <span className="text-amber-600 font-normal">(120 pts)</span>
        </label>
        <select value={champion} onChange={e => setChampion(e.target.value)} disabled={locked}
          className={selectClass}>
          <option value="">Selecione...</option>
          {teams.map(t => (
            <option key={t.id} value={t.name}>{t.flagEmoji} {t.name}</option>
          ))}
        </select>
        {bonusOdds && (
          <BonusOddsPanel
            title="Campeao"
            groupOdds={bonusOdds.group?.CHAMPION || []}
            rankingOdds={bonusOdds.ranking?.CHAMPION?.map((r: any) => ({ value: r.name, flagEmoji: r.flagEmoji, percentage: r.probability })) || []}
            marketOdds={bonusOdds.market?.CHAMPION || []}
            totalMembers={bonusOdds.totalMembers || 0}
            userHasPredicted={bonusOdds.userHasPredicted || false}
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Vice-campeao <span className="text-amber-600 font-normal">(80 pts)</span>
        </label>
        <select value={runnerUp} onChange={e => setRunnerUp(e.target.value)} disabled={locked}
          className={selectClass}>
          <option value="">Selecione...</option>
          {teams.map(t => (
            <option key={t.id} value={t.name}>{t.flagEmoji} {t.name}</option>
          ))}
        </select>
        {bonusOdds && (
          <BonusOddsPanel
            title="Vice-campeao"
            groupOdds={bonusOdds.group?.RUNNER_UP || []}
            rankingOdds={bonusOdds.ranking?.RUNNER_UP?.map((r: any) => ({ value: r.name, flagEmoji: r.flagEmoji, percentage: r.probability })) || []}
            totalMembers={bonusOdds.totalMembers || 0}
            userHasPredicted={bonusOdds.userHasPredicted || false}
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Terceiro lugar <span className="text-amber-600 font-normal">(50 pts)</span>
        </label>
        <select value={thirdPlace} onChange={e => setThirdPlace(e.target.value)} disabled={locked}
          className={selectClass}>
          <option value="">Selecione...</option>
          {teams.map(t => (
            <option key={t.id} value={t.name}>{t.flagEmoji} {t.name}</option>
          ))}
        </select>
        {bonusOdds && (
          <BonusOddsPanel
            title="3o Lugar"
            groupOdds={bonusOdds.group?.THIRD_PLACE || []}
            rankingOdds={bonusOdds.ranking?.THIRD_PLACE?.map((r: any) => ({ value: r.name, flagEmoji: r.flagEmoji, percentage: r.probability })) || []}
            totalMembers={bonusOdds.totalMembers || 0}
            userHasPredicted={bonusOdds.userHasPredicted || false}
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Quarto lugar <span className="text-amber-600 font-normal">(50 pts)</span>
        </label>
        <select value={fourthPlace} onChange={e => setFourthPlace(e.target.value)} disabled={locked}
          className={selectClass}>
          <option value="">Selecione...</option>
          {teams.map(t => (
            <option key={t.id} value={t.name}>{t.flagEmoji} {t.name}</option>
          ))}
        </select>
        {bonusOdds && (
          <BonusOddsPanel
            title="4o Lugar"
            groupOdds={bonusOdds.group?.FOURTH_PLACE || []}
            rankingOdds={bonusOdds.ranking?.FOURTH_PLACE?.map((r: any) => ({ value: r.name, flagEmoji: r.flagEmoji, percentage: r.probability })) || []}
            totalMembers={bonusOdds.totalMembers || 0}
            userHasPredicted={bonusOdds.userHasPredicted || false}
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Artilheiro <span className="text-amber-600 font-normal">(80 pts)</span>
        </label>
        <input type="text" value={topScorer} onChange={e => setTopScorer(e.target.value)} disabled={locked}
          placeholder="Nome do jogador"
          className={selectClass} />
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

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {!locked && (
        <button onClick={handleSubmit} disabled={saving}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors">
          {saving ? 'Salvando...' : 'Salvar Palpites Bonus'}
        </button>
      )}

      <div className="text-xs text-gray-400 space-y-1 border-t pt-3">
        <p className="font-semibold text-gray-500">Pontuacao Bonus:</p>
        <p>+120 pontos por acertar o campeao</p>
        <p>+80 pontos por acertar o vice-campeao</p>
        <p>+50 pontos por acertar o terceiro lugar</p>
        <p>+50 pontos por acertar o quarto lugar</p>
        <p>+80 pontos por acertar o artilheiro</p>
      </div>
    </div>
  );
}
