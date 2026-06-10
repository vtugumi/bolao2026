'use client';

import { useState, useEffect } from 'react';
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

interface BonusPredictionFormProps {
  initialData?: any;
  onSave?: (data: {
    champion: string;
    runnerUp: string;
    topScorer: string;
    thirdPlace: string;
    fourthPlace: string;
    brazilFirstGoal: string;
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
  const [brazilFirstGoal, setBrazilFirstGoal] = useState(initialData?.brazilFirstGoal || '');
  const [teams, setTeams] = useState<{ id: number; name: string; flagEmoji: string }[]>([]);
  const [bonusOdds, setBonusOdds] = useState<any>(null);
  const [isCustomScorer, setIsCustomScorer] = useState(false);
  const [isCustomBrazilPlayer, setIsCustomBrazilPlayer] = useState(false);
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
      if (initialData.topScorer && !TOP_SCORERS.includes(initialData.topScorer)) setIsCustomScorer(true);
      setThirdPlace(initialData.thirdPlace || '');
      setFourthPlace(initialData.fourthPlace || '');
      setBrazilFirstGoal(initialData.brazilFirstGoal || '');
      if (initialData.brazilFirstGoal && !BRAZIL_PLAYERS.includes(initialData.brazilFirstGoal)) setIsCustomBrazilPlayer(true);
    }
  }, [initialData]);

  const handleSubmit = async () => {
    if (!champion || !runnerUp) {
      setError('Selecione campeao e vice-campeao.');
      return;
    }
    setError('');
    await onSave?.({ champion, runnerUp, topScorer, thirdPlace, fourthPlace, brazilFirstGoal });
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
            optaOdds={bonusOdds.opta?.CHAMPION?.map((r: any) => ({ value: r.name, flagEmoji: r.flagEmoji, percentage: r.probability })) || []}
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
            totalMembers={bonusOdds.totalMembers || 0}
            userHasPredicted={bonusOdds.userHasPredicted || false}
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Artilheiro <span className="text-amber-600 font-normal">(80 pts)</span>
        </label>
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
          disabled={locked}
          className={selectClass}
        >
          <option value="">Selecione...</option>
          {TOP_SCORERS.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
          <option value="__other__">Outro...</option>
        </select>
        {isCustomScorer && (
          <input type="text" value={topScorer} onChange={e => setTopScorer(e.target.value)} disabled={locked}
            placeholder="Digite o nome do jogador"
            className={`${selectClass} mt-1`} />
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

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Primeiro gol do Brasil <span className="text-amber-600 font-normal">(50 pts)</span>
        </label>
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
          disabled={locked}
          className={selectClass}
        >
          <option value="">Selecione...</option>
          {BRAZIL_PLAYERS.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
          <option value="__other__">Outro...</option>
        </select>
        {isCustomBrazilPlayer && (
          <input type="text" value={brazilFirstGoal} onChange={e => setBrazilFirstGoal(e.target.value)} disabled={locked}
            placeholder="Digite o nome do jogador"
            className={`${selectClass} mt-1`} />
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
        <p>+50 pontos por acertar o primeiro gol do Brasil</p>
      </div>
    </div>
  );
}
