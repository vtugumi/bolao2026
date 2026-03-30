'use client';

import { useState, useEffect, useRef } from 'react';
import Flag from './Flag';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface MatchCardProps {
  match: any;
  showPrediction?: boolean;
  onSavePrediction?: (matchId: number, data: { homeScore: number; awayScore: number; winnerId?: number }) => Promise<void>;
}

interface GroupPrediction {
  userName: string;
  userId: number;
  homeScore: number;
  awayScore: number;
  winnerId: number | null;
  winnerName: string | null;
  points: number | null;
}

const STAGE_LABELS: Record<string, string> = {
  GROUP: 'Fase de Grupos', R32: '16 avos de Final', R16: 'Oitavas de Final',
  QF: 'Quartas de Final', SF: 'Semifinal', '3RD': 'Disputa de 3o Lugar', FINAL: 'Final',
};

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr));
}

function getPointsColor(points: number): string {
  if (points === 8) return 'bg-emerald-200 text-emerald-800';
  if (points === 5) return 'bg-green-200 text-green-800';
  if (points === 2) return 'bg-yellow-200 text-yellow-800';
  if (points === 1) return 'bg-red-200 text-red-800';
  return 'bg-gray-200 text-gray-700';
}

function isKnockout(stage: string): boolean {
  return ['R32', 'R16', 'QF', 'SF', '3RD', 'FINAL'].includes(stage);
}

export default function MatchCard({ match, showPrediction, onSavePrediction }: MatchCardProps) {
  const pred = match.userPrediction || match.prediction || null;
  const homeName = match.homeTeam?.name ?? 'A definir';
  const awayName = match.awayTeam?.name ?? 'A definir';
  const homeFlag = match.homeTeam?.flagEmoji ?? '';
  const awayFlag = match.awayTeam?.flagEmoji ?? '';
  const homeId = match.homeTeam?.id;
  const awayId = match.awayTeam?.id;

  const [homeGoals, setHomeGoals] = useState(pred?.homeScore?.toString() ?? '');
  const [awayGoals, setAwayGoals] = useState(pred?.awayScore?.toString() ?? '');
  const [qualifier, setQualifier] = useState(pred?.winnerId?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>(
    pred ? `${pred.homeScore}-${pred.awayScore}-${pred.winnerId ?? ''}` : ''
  );
  const onSaveRef = useRef(onSavePrediction);
  onSaveRef.current = onSavePrediction;

  const [now, setNow] = useState(() => new Date());
  const hasResult = match.homeScore !== null && match.homeScore !== undefined;
  const knockout = isKnockout(match.stage);
  const matchTime = new Date(match.dateTime);
  const matchStarted = matchTime <= now;
  const timeUntilStart = matchTime.getTime() - now.getTime();

  // Expandable predictions section
  const [expanded, setExpanded] = useState(false);
  const [groupPredictions, setGroupPredictions] = useState<GroupPrediction[]>([]);
  const [groupNames, setGroupNames] = useState<string[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [predictionsFetched, setPredictionsFetched] = useState(false);

  // Real-time countdown: auto-lock when match starts
  useEffect(() => {
    if (matchStarted || hasResult) return;
    if (timeUntilStart <= 0) return;
    const interval = timeUntilStart < 300000 ? 1000 : timeUntilStart < 3600000 ? 30000 : 60000;
    const timer = setInterval(() => setNow(new Date()), interval);
    return () => clearInterval(timer);
  }, [matchStarted, hasResult, timeUntilStart]);

  // Auto-save with debounce
  useEffect(() => {
    const hg = parseInt(homeGoals);
    const ag = parseInt(awayGoals);
    if (isNaN(hg) || isNaN(ag) || hg < 0 || ag < 0) return;

    let effectiveQualifier = qualifier;
    if (knockout) {
      if (hg > ag) effectiveQualifier = String(homeId);
      else if (ag > hg) effectiveQualifier = String(awayId);
      else if (!effectiveQualifier) return;
    }

    const key = `${hg}-${ag}-${effectiveQualifier}`;
    if (key === lastSavedRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!onSaveRef.current) return;
      setError(''); setSaving(true);
      try {
        await onSaveRef.current(match.id, {
          homeScore: hg, awayScore: ag,
          ...(knockout && effectiveQualifier ? { winnerId: parseInt(effectiveQualifier) } : {}),
        });
        lastSavedRef.current = key;
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (err: any) {
        setError(err?.message || 'Erro ao salvar');
      } finally { setSaving(false); }
    }, 1000);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [homeGoals, awayGoals, qualifier, knockout, homeId, awayId, match.id]);

  // Fetch group predictions when expanded
  const handleToggleExpand = async () => {
    if (!matchStarted && !hasResult) return; // Can't expand before match starts

    const newExpanded = !expanded;
    setExpanded(newExpanded);

    if (newExpanded && !predictionsFetched) {
      setLoadingPredictions(true);
      try {
        const res = await fetch(`/api/matches/${match.id}/predictions`);
        if (res.ok) {
          const data = await res.json();
          setGroupPredictions(data.predictions || []);
          setGroupNames(data.groups || []);
          setPredictionsFetched(true);
        }
      } catch {
        // ignore
      } finally {
        setLoadingPredictions(false);
      }
    }
  };

  const canExpand = matchStarted || hasResult;

  return (
    <div id={`match-card-${match.id}`} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow transition-[box-shadow,ring]">
      {/* Main card area - clickable when match started */}
      <div
        className={`p-4 ${canExpand ? 'cursor-pointer' : ''}`}
        onClick={canExpand ? handleToggleExpand : undefined}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
            {STAGE_LABELS[match.stage] || match.stage}
            {match.groupLabel ? ` - Grupo ${match.groupLabel}` : ''}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{formatDate(match.dateTime)}</span>
            {canExpand && (
              <span className={`text-gray-400 transition-transform text-xs ${expanded ? 'rotate-180' : ''}`}>
                ▼
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 text-center">
            <Flag code={match.homeTeam?.code || ''} emoji={homeFlag} size={32} />
            <p className="text-sm font-medium mt-1 truncate">{homeName}</p>
          </div>

          <div className="flex-shrink-0 text-center min-w-[120px]">
            {hasResult ? (
              <div>
                <div className="text-3xl font-bold text-gray-900">{match.homeScore} - {match.awayScore}</div>
                {pred && pred.points != null && (
                  <div className="mt-1">
                    <span className="text-xs text-gray-500">Palpite: {pred.homeScore}-{pred.awayScore}</span>
                    <span className={`ml-1 inline-block px-2 py-0.5 rounded-full text-xs font-bold ${getPointsColor(pred.points)}`}>
                      {pred.points} pts
                    </span>
                  </div>
                )}
              </div>
            ) : matchStarted ? (
              <div>
                {pred ? (
                  <>
                    <div className="text-2xl font-bold text-gray-400">{pred.homeScore} - {pred.awayScore}</div>
                    <span className="text-xs text-red-400">🔒 Bloqueado</span>
                  </>
                ) : (
                  <div className="text-gray-400 text-sm">🔒 Bloqueado</div>
                )}
              </div>
            ) : pred ? (
              <div>
                <div className="text-2xl font-bold text-emerald-700">{pred.homeScore} - {pred.awayScore}</div>
                <span className="text-xs text-emerald-600">Palpite salvo</span>
              </div>
            ) : (
              <div className="text-lg font-medium text-gray-400">vs</div>
            )}
          </div>

          <div className="flex-1 text-center">
            <Flag code={match.awayTeam?.code || ''} emoji={awayFlag} size={32} />
            <p className="text-sm font-medium mt-1 truncate">{awayName}</p>
          </div>
        </div>

        {/* Hint to click */}
        {canExpand && !expanded && (
          <p className="text-[10px] text-gray-400 text-center mt-2">
            Toque para ver palpites do grupo
          </p>
        )}
      </div>

      {/* Expandable: Group predictions */}
      {expanded && canExpand && (
        <div className="border-t border-gray-100 bg-gray-50 rounded-b-xl">
          {loadingPredictions ? (
            <div className="p-4 text-center">
              <span className="text-xs text-gray-400">Carregando palpites...</span>
            </div>
          ) : groupPredictions.length === 0 ? (
            <div className="p-4 text-center">
              <span className="text-xs text-gray-500">Nenhum palpite encontrado no seu grupo.</span>
            </div>
          ) : (
            <div className="p-3">
              {groupNames.length > 0 && (
                <p className="text-[10px] text-gray-400 mb-2">
                  📋 {groupNames.join(', ')}
                </p>
              )}
              <div className="space-y-1.5">
                {groupPredictions.map((gp, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-medium text-gray-700 truncate">
                        {gp.userName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-bold text-gray-800">
                        {gp.homeScore} - {gp.awayScore}
                      </span>
                      {gp.winnerName && (
                        <span className="text-[10px] text-gray-400 hidden sm:inline">
                          ({gp.winnerName})
                        </span>
                      )}
                      {gp.points !== null && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getPointsColor(gp.points)}`}>
                          {gp.points}pts
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {hasResult && groupPredictions.length > 1 && (
                <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between px-1">
                  <span className="text-[10px] text-gray-400">
                    🎯 Placares exatos: {groupPredictions.filter(p => p.points !== null && p.points >= 5).length}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    Media: {(groupPredictions.reduce((sum, p) => sum + (p.points ?? 0), 0) / groupPredictions.length).toFixed(1)} pts
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Prediction input - only before match starts */}
      {!matchStarted && !hasResult && showPrediction && onSavePrediction && (
        <div className="px-4 pb-4 pt-0">
          <div className="pt-4 border-t border-gray-100">
            {timeUntilStart > 0 && timeUntilStart < 3600000 && (
              <p className="text-xs text-red-500 text-center mb-2 font-medium animate-pulse">
                ⏱️ Fecha em {Math.floor(timeUntilStart / 60000)}:{String(Math.floor((timeUntilStart % 60000) / 1000)).padStart(2, '0')}
              </p>
            )}
            {knockout && (
              <p className="text-[10px] text-gray-400 text-center mb-2 italic">
                Palpite valido apenas para o tempo regulamentar (90 min)
              </p>
            )}
            <div className="flex items-center justify-center gap-3">
              <div className="text-center">
                <label className="text-xs text-gray-500 block mb-1">{homeName}</label>
                <input type="number" min="0" max="99" value={homeGoals}
                  onChange={(e) => setHomeGoals(e.target.value)}
                  className="w-16 h-10 text-center text-lg font-bold border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none" placeholder="0" />
              </div>
              <span className="text-gray-400 font-bold text-lg mt-5">x</span>
              <div className="text-center">
                <label className="text-xs text-gray-500 block mb-1">{awayName}</label>
                <input type="number" min="0" max="99" value={awayGoals}
                  onChange={(e) => setAwayGoals(e.target.value)}
                  className="w-16 h-10 text-center text-lg font-bold border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:outline-none" placeholder="0" />
              </div>
            </div>

            {knockout && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 text-center mb-2">Quem se classifica?</p>
                <div className="flex justify-center gap-4">
                  {homeId && (
                    <label className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border transition-colors ${
                      (qualifier === String(homeId) || (homeGoals !== '' && awayGoals !== '' && parseInt(homeGoals) > parseInt(awayGoals)))
                        ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                      <input type="radio" name={`q-${match.id}`} value={homeId}
                        checked={qualifier === String(homeId) || (homeGoals !== '' && awayGoals !== '' && parseInt(homeGoals) > parseInt(awayGoals))}
                        onChange={(e) => setQualifier(e.target.value)}
                        disabled={homeGoals !== '' && awayGoals !== '' && parseInt(homeGoals) !== parseInt(awayGoals)}
                        className="accent-emerald-600" />
                      <Flag code={match.homeTeam?.code || ''} emoji={homeFlag} size={16} />
                      <span className="text-sm">{homeName}</span>
                    </label>
                  )}
                  {awayId && (
                    <label className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border transition-colors ${
                      (qualifier === String(awayId) || (homeGoals !== '' && awayGoals !== '' && parseInt(awayGoals) > parseInt(homeGoals)))
                        ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                      <input type="radio" name={`q-${match.id}`} value={awayId}
                        checked={qualifier === String(awayId) || (homeGoals !== '' && awayGoals !== '' && parseInt(awayGoals) > parseInt(homeGoals))}
                        onChange={(e) => setQualifier(e.target.value)}
                        disabled={homeGoals !== '' && awayGoals !== '' && parseInt(homeGoals) !== parseInt(awayGoals)}
                        className="accent-emerald-600" />
                      <Flag code={match.awayTeam?.code || ''} emoji={awayFlag} size={16} />
                      <span className="text-sm">{awayName}</span>
                    </label>
                  )}
                </div>
                {homeGoals !== '' && awayGoals !== '' && parseInt(homeGoals) !== parseInt(awayGoals) && (
                  <p className="text-[10px] text-gray-400 text-center mt-1">Classificado automaticamente pelo placar</p>
                )}
                {homeGoals !== '' && awayGoals !== '' && parseInt(homeGoals) === parseInt(awayGoals) && (
                  <p className="text-[10px] text-amber-500 text-center mt-1">Empate! Selecione quem vence nos penaltis</p>
                )}
              </div>
            )}

            {error && <p className="text-red-500 text-xs text-center mt-2">{error}</p>}
            <div className="text-center mt-2 h-5">
              {saving && <span className="text-xs text-gray-400">Salvando...</span>}
              {saved && <span className="text-xs text-emerald-600 font-medium">Palpite salvo automaticamente!</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
