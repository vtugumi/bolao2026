'use client';

import { useState, useEffect, FormEvent } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface BonusData {
  champion?: string;
  runnerUp?: string;
  topScorer?: string;
}

interface UserBonusPrediction {
  id: number;
  userId: number;
  userName: string;
  type: string;
  value: string;
  points: number | null;
}

export default function AdminBonusPage() {
  const [champion, setChampion] = useState('');
  const [runnerUp, setRunnerUp] = useState('');
  const [topScorer, setTopScorer] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [allPredictions, setAllPredictions] = useState<UserBonusPrediction[]>([]);
  const [overrides, setOverrides] = useState<Record<number, number>>({});
  const [savingOverrides, setSavingOverrides] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/bonus').then(r => r.ok ? r.json() : {}),
      fetch('/api/admin/bonus/predictions').then(r => r.ok ? r.json() : { predictions: [] }),
    ]).then(([bonusData, predData]) => {
      setChampion(bonusData.champion || '');
      setRunnerUp(bonusData.runnerUp || '');
      setTopScorer(bonusData.topScorer || '');
      setAllPredictions(predData.predictions || []);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ champion, runnerUp, topScorer }),
      });

      if (res.ok) {
        setMessage('Resultados bonus salvos! Pontuacao recalculada.');
        // Refresh predictions to show updated points
        const predRes = await fetch('/api/admin/bonus/predictions');
        if (predRes.ok) {
          const predData = await predRes.json();
          setAllPredictions(predData.predictions || []);
        }
      } else {
        const err = await res.json();
        setMessage(err.error || 'Erro ao salvar resultados bonus.');
      }
    } catch {
      setMessage('Erro ao salvar resultados bonus.');
    } finally {
      setSaving(false);
    }
  };

  const handleOverride = (predictionId: number, points: number) => {
    setOverrides(prev => ({ ...prev, [predictionId]: points }));
  };

  const handleSaveOverrides = async () => {
    setSavingOverrides(true);
    try {
      const res = await fetch('/api/admin/bonus/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides }),
      });
      if (res.ok) {
        setMessage('Pontuacao manual salva com sucesso!');
        // Refresh
        const predRes = await fetch('/api/admin/bonus/predictions');
        if (predRes.ok) {
          const predData = await predRes.json();
          setAllPredictions(predData.predictions || []);
        }
        setOverrides({});
      }
    } catch {
      setMessage('Erro ao salvar pontuacao manual.');
    } finally {
      setSavingOverrides(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  // Group predictions by type
  const byType: Record<string, UserBonusPrediction[]> = {};
  for (const p of allPredictions) {
    if (!byType[p.type]) byType[p.type] = [];
    byType[p.type].push(p);
  }

  const typeLabels: Record<string, string> = {
    CHAMPION: 'Campeao',
    RUNNER_UP: 'Vice-campeao',
    TOP_SCORER: 'Artilheiro',
  };

  const typePoints: Record<string, number> = {
    CHAMPION: 20,
    RUNNER_UP: 15,
    TOP_SCORER: 15,
  };

  const hasOverrides = Object.keys(overrides).length > 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-emerald-800 mb-2">
        Resultados Bonus Oficiais
      </h1>
      <p className="text-gray-500 text-sm mb-6">
        Defina os resultados oficiais. A pontuacao e calculada automaticamente,
        mas voce pode ajustar manualmente (ex: variacoes do nome do artilheiro).
      </p>

      {message && (
        <div
          className={`px-4 py-3 rounded-lg mb-4 text-sm ${
            message.includes('sucesso') || message.includes('Salvo') || message.includes('recalculada')
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message}
        </div>
      )}

      {/* Official results form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5 mb-8"
      >
        <div>
          <label htmlFor="champion" className="block text-sm font-medium text-gray-700 mb-1">
            Campeao
          </label>
          <input
            id="champion"
            type="text"
            value={champion}
            onChange={(e) => setChampion(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
            placeholder="Selecao campea"
          />
        </div>

        <div>
          <label htmlFor="runnerUp" className="block text-sm font-medium text-gray-700 mb-1">
            Vice-campeao
          </label>
          <input
            id="runnerUp"
            type="text"
            value={runnerUp}
            onChange={(e) => setRunnerUp(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
            placeholder="Selecao vice-campea"
          />
        </div>

        <div>
          <label htmlFor="topScorer" className="block text-sm font-medium text-gray-700 mb-1">
            Artilheiro
          </label>
          <input
            id="topScorer"
            type="text"
            value={topScorer}
            onChange={(e) => setTopScorer(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
            placeholder="Nome do artilheiro"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-emerald-700 text-white py-3 rounded-lg font-semibold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Salvando...' : 'Salvar e Recalcular Pontos'}
        </button>
      </form>

      {/* All predictions panel */}
      {allPredictions.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Palpites dos Jogadores</h2>
          <p className="text-xs text-gray-500 mb-4">
            A pontuacao e calculada automaticamente ao salvar o resultado oficial.
            Para o artilheiro, se o jogador escreveu uma variacao do nome correto,
            voce pode ajustar a pontuacao manualmente usando os botoes abaixo.
          </p>

          {(['CHAMPION', 'RUNNER_UP', 'TOP_SCORER'] as const).map(type => {
            const preds = byType[type] || [];
            if (preds.length === 0) return null;

            return (
              <div key={type} className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  {type === 'CHAMPION' && '🥇'}
                  {type === 'RUNNER_UP' && '🥈'}
                  {type === 'TOP_SCORER' && '⚽'}
                  {typeLabels[type]} ({typePoints[type]} pts)
                </h3>
                <div className="space-y-1">
                  {preds.map(p => {
                    const overrideValue = overrides[p.id];
                    const currentPoints = overrideValue !== undefined ? overrideValue : p.points;
                    const isCorrect = currentPoints !== null && currentPoints > 0;
                    const isOverridden = overrideValue !== undefined;

                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between bg-white rounded-lg px-3 py-2 border ${
                          isCorrect ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium text-gray-700 truncate">{p.userName}</span>
                          <span className="text-sm text-gray-500">→</span>
                          <span className={`text-sm font-medium truncate ${isCorrect ? 'text-emerald-700' : 'text-gray-600'}`}>
                            {p.value}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {currentPoints !== null && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              isCorrect ? 'bg-emerald-200 text-emerald-800' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {currentPoints} pts
                            </span>
                          )}
                          {/* Manual override buttons for top scorer */}
                          {type === 'TOP_SCORER' && (
                            <div className="flex gap-1 ml-1">
                              <button
                                onClick={() => handleOverride(p.id, typePoints[type])}
                                title="Marcar como correto"
                                className={`w-6 h-6 rounded text-xs font-bold transition-colors ${
                                  isOverridden && overrideValue > 0
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-gray-100 text-gray-500 hover:bg-emerald-100'
                                }`}
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => handleOverride(p.id, 0)}
                                title="Marcar como errado"
                                className={`w-6 h-6 rounded text-xs font-bold transition-colors ${
                                  isOverridden && overrideValue === 0
                                    ? 'bg-red-500 text-white'
                                    : 'bg-gray-100 text-gray-500 hover:bg-red-100'
                                }`}
                              >
                                ✗
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {hasOverrides && (
            <button
              onClick={handleSaveOverrides}
              disabled={savingOverrides}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-colors"
            >
              {savingOverrides ? 'Salvando...' : `Salvar ${Object.keys(overrides).length} ajuste(s) manual(is)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
