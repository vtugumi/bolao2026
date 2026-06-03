'use client';

import { useState, useEffect } from 'react';
import Flag from './Flag';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface SimulatedTeam {
  id: number;
  name: string;
  code: string;
  flagEmoji: string;
  source: string; // e.g. "1o A", "2o B", "3o C"
}

interface SimulatedMatch {
  matchNumber: number;
  homeTeam: SimulatedTeam | null;
  awayTeam: SimulatedTeam | null;
}

interface ThirdPlaceTeam {
  teamName: string;
  teamCode: string;
  flagEmoji: string;
  groupLabel: string;
  points: number;
  goalDifference: number;
  goalsFor: number;
}

export default function SimulatedR32() {
  const [r32Matches, setR32Matches] = useState<SimulatedMatch[]>([]);
  const [thirds, setThirds] = useState<ThirdPlaceTeam[]>([]);
  const [totalPredictions, setTotalPredictions] = useState(0);
  const [totalGroupMatches, setTotalGroupMatches] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/predictions/simulated-bracket')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setR32Matches(data.simulatedR32 || []);
          setThirds(data.qualifiedThirds || []);
          setTotalPredictions(data.totalPredictions || 0);
          setTotalGroupMatches(data.totalGroupMatches || 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (totalPredictions === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center mb-6">
        <p className="text-amber-800 font-semibold mb-1">Chave simulada</p>
        <p className="text-amber-600 text-sm">
          Palpite os jogos da Fase de Grupos para ver quem classifica na sua simulacao!
        </p>
      </div>
    );
  }

  const filledMatches = r32Matches.filter(m => m.homeTeam && m.awayTeam).length;

  return (
    <div className="mb-6">
      <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-amber-800">
            Sua simulacao dos 16 avos
          </h3>
          <span className="text-xs text-amber-600">
            {totalPredictions}/{totalGroupMatches} palpites de grupo · {filledMatches}/16 confrontos definidos
          </span>
        </div>

        {/* Best 3rd place table */}
        {thirds.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-amber-700 mb-2">
              Melhores 3os colocados ({thirds.length}/8 classificados)
            </p>
            <div className="flex flex-wrap gap-2">
              {thirds.map((t, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-white border border-amber-200 px-2 py-1 rounded-lg text-xs">
                  <Flag code={t.teamCode} emoji={t.flagEmoji} size={14} />
                  <span className="font-medium">{t.teamName}</span>
                  <span className="text-amber-500">(Gr.{t.groupLabel} · {t.points}pts · SG:{t.goalDifference > 0 ? '+' : ''}{t.goalDifference})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* R32 matches grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {r32Matches.map((m, i) => (
            <div
              key={i}
              className={`flex items-center justify-between bg-white rounded-lg px-3 py-2 border ${
                m.homeTeam && m.awayTeam ? 'border-amber-200' : 'border-gray-200 opacity-50'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                {m.homeTeam ? (
                  <>
                    <Flag code={m.homeTeam.code} emoji={m.homeTeam.flagEmoji} size={16} />
                    <span className="text-xs font-medium truncate">{m.homeTeam.name}</span>
                    <span className="text-[10px] text-amber-500">({m.homeTeam.source})</span>
                  </>
                ) : (
                  <span className="text-xs text-gray-400">A definir</span>
                )}
              </div>
              <span className="text-[10px] text-gray-400 mx-1">vs</span>
              <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
                {m.awayTeam ? (
                  <>
                    <span className="text-[10px] text-amber-500">({m.awayTeam.source})</span>
                    <span className="text-xs font-medium truncate">{m.awayTeam.name}</span>
                    <Flag code={m.awayTeam.code} emoji={m.awayTeam.flagEmoji} size={16} />
                  </>
                ) : (
                  <span className="text-xs text-gray-400">A definir</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
