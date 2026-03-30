'use client';

import { useState } from 'react';

interface ResultFormProps {
  match: {
    id: number
    homeTeam?: { id: number; name: string; flagEmoji: string } | null
    awayTeam?: { id: number; name: string; flagEmoji: string } | null
    homeScore?: number | null
    awayScore?: number | null
    winnerId?: number | null
    homePenalties?: number | null
    awayPenalties?: number | null
    stage: string
    groupLabel?: string | null
  }
  onSubmit?: (homeScore: number, awayScore: number, winnerId?: number, homePen?: number, awayPen?: number) => void
  saving?: boolean
}

function isKnockout(stage: string): boolean {
  return ['R32', 'R16', 'QF', 'SF', '3RD', 'FINAL'].includes(stage);
}

export default function ResultForm({ match, onSubmit, saving }: ResultFormProps) {
  const [homeGoals, setHomeGoals] = useState(match.homeScore?.toString() ?? '');
  const [awayGoals, setAwayGoals] = useState(match.awayScore?.toString() ?? '');
  const [qualifier, setQualifier] = useState(match.winnerId?.toString() ?? '');
  const [penaltyHome, setPenaltyHome] = useState(match.homePenalties?.toString() ?? '');
  const [penaltyAway, setPenaltyAway] = useState(match.awayPenalties?.toString() ?? '');
  const [error, setError] = useState('');

  const knockout = isKnockout(match.stage);
  const homeName = match.homeTeam?.name ?? 'Mandante';
  const awayName = match.awayTeam?.name ?? 'Visitante';
  const homeFlag = match.homeTeam?.flagEmoji ?? '';
  const awayFlag = match.awayTeam?.flagEmoji ?? '';

  const handleSave = () => {
    const hg = parseInt(homeGoals);
    const ag = parseInt(awayGoals);
    if (isNaN(hg) || isNaN(ag) || hg < 0 || ag < 0) {
      setError('Informe placares validos (numeros >= 0)');
      return;
    }
    if (knockout && !qualifier) {
      setError('Selecione o time classificado');
      return;
    }
    setError('');
    const winnerId = qualifier ? parseInt(qualifier) : undefined;
    const hp = penaltyHome ? parseInt(penaltyHome) : undefined;
    const ap = penaltyAway ? parseInt(penaltyAway) : undefined;
    onSubmit?.(hg, ag, winnerId, hp, ap);
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      <div className="flex items-center justify-center gap-4 mb-6">
        <div className="text-center">
          <span className="text-2xl">{homeFlag}</span>
          <p className="text-sm font-medium mt-1">{homeName}</p>
        </div>
        <span className="text-gray-400 font-bold text-lg">vs</span>
        <div className="text-center">
          <span className="text-2xl">{awayFlag}</span>
          <p className="text-sm font-medium mt-1">{awayName}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gols {homeName}</label>
            <input type="number" min="0" max="99" value={homeGoals}
              onChange={(e) => setHomeGoals(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-center text-lg font-bold focus:border-emerald-500 focus:outline-none" placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gols {awayName}</label>
            <input type="number" min="0" max="99" value={awayGoals}
              onChange={(e) => setAwayGoals(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-center text-lg font-bold focus:border-emerald-500 focus:outline-none" placeholder="0" />
          </div>
        </div>

        {knockout && (
          <>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Penaltis (opcional)</p>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" min="0" value={penaltyHome}
                  onChange={(e) => setPenaltyHome(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-center font-bold focus:border-emerald-500 focus:outline-none" placeholder="-" />
                <input type="number" min="0" value={penaltyAway}
                  onChange={(e) => setPenaltyAway(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-center font-bold focus:border-emerald-500 focus:outline-none" placeholder="-" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Classificado</p>
              <div className="flex gap-4">
                {match.homeTeam && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name={`qualifier-${match.id}`} value={match.homeTeam.id}
                      checked={qualifier === String(match.homeTeam.id)}
                      onChange={(e) => setQualifier(e.target.value)} className="accent-emerald-600" />
                    <span className="text-sm">{homeFlag} {homeName}</span>
                  </label>
                )}
                {match.awayTeam && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name={`qualifier-${match.id}`} value={match.awayTeam.id}
                      checked={qualifier === String(match.awayTeam.id)}
                      onChange={(e) => setQualifier(e.target.value)} className="accent-emerald-600" />
                    <span className="text-sm">{awayFlag} {awayName}</span>
                  </label>
                )}
              </div>
            </div>
          </>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button onClick={handleSave} disabled={saving}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors">
          {saving ? 'Salvando...' : 'Salvar Resultado'}
        </button>
      </div>
    </div>
  );
}
