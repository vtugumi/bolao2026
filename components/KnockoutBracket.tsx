'use client';

import { useState, useEffect } from 'react';
import Flag from './Flag';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface KnockoutBracketProps {
  activeStage?: string;
  onMatchClick?: (matchId: number, stage: string) => void;
  simulatedMatches?: any[];
}

function MatchSlot({ match, highlighted, size = 'normal', onClick }: { match: any; highlighted?: boolean; size?: 'small' | 'normal'; onClick?: () => void }) {
  if (!match) {
    return (
      <div className={`bracket-match bracket-match-${size} border border-dashed border-gray-200 rounded bg-gray-50`}>
        <div className="bracket-team border-b border-gray-200 text-gray-300 italic">A definir</div>
        <div className="bracket-team text-gray-300 italic">A definir</div>
      </div>
    );
  }

  const homeSimulated = !match.homeTeam && match._simHome;
  const awaySimulated = !match.awayTeam && match._simAway;
  const homeProvisional = !homeSimulated && match._provisionalHome && match.homeTeam;
  const awayProvisional = !awaySimulated && match._provisionalAway && match.awayTeam;
  const homeTeam = match.homeTeam || match._simHome;
  const awayTeam = match.awayTeam || match._simAway;
  const homeName = homeTeam?.name || 'A definir';
  const awayName = awayTeam?.name || 'A definir';
  const homeFlag = homeTeam?.flagEmoji || '🏳️';
  const awayFlag = awayTeam?.flagEmoji || '🏳️';
  const hasResult = match.homeScore != null;
  const homeWon = match.winnerId === match.homeTeamId;
  const awayWon = match.winnerId === match.awayTeamId;
  const homeHasTeam = !!homeTeam;
  const awayHasTeam = !!awayTeam;

  return (
    <div
      onClick={onClick}
      className={`bracket-match bracket-match-${size} border rounded-md overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-md hover:border-emerald-400 transition-all' : ''} ${highlighted ? 'border-emerald-500 shadow-md ring-1 ring-emerald-200' : 'border-gray-300 shadow-sm'}`}>
      <div className={`bracket-team border-b ${highlighted ? 'border-emerald-200' : 'border-gray-200'} ${homeWon ? 'bg-emerald-50 font-bold text-emerald-800' : awayWon ? 'text-gray-400' : ''} ${homeSimulated ? 'bg-amber-50/50' : ''} ${homeProvisional ? 'bg-sky-50/60' : ''}`}>
        <span className="bracket-flag">{homeHasTeam ? <Flag code={homeTeam?.code || ''} emoji={homeFlag} size={16} /> : ''}</span>
        <span className={`bracket-team-name ${homeSimulated ? 'text-amber-700 italic' : ''} ${homeProvisional ? 'text-sky-700 italic' : ''}`}>{homeName}</span>
        {hasResult && <span className={`bracket-score ${homeWon ? 'text-emerald-700' : ''}`}>{match.homeScore}</span>}
      </div>
      <div className={`bracket-team ${awayWon ? 'bg-emerald-50 font-bold text-emerald-800' : homeWon ? 'text-gray-400' : ''} ${awaySimulated ? 'bg-amber-50/50' : ''} ${awayProvisional ? 'bg-sky-50/60' : ''}`}>
        <span className="bracket-flag">{awayHasTeam ? <Flag code={awayTeam?.code || ''} emoji={awayFlag} size={16} /> : ''}</span>
        <span className={`bracket-team-name ${awaySimulated ? 'text-amber-700 italic' : ''} ${awayProvisional ? 'text-sky-700 italic' : ''}`}>{awayName}</span>
        {hasResult && <span className={`bracket-score ${awayWon ? 'text-emerald-700' : ''}`}>{match.awayScore}</span>}
      </div>
    </div>
  );
}

export default function KnockoutBracket({ activeStage, onMatchClick, simulatedMatches }: KnockoutBracketProps) {
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const stages = ['R32', 'R16', 'QF', 'SF', '3RD', 'FINAL'];
        const all: any[] = [];
        await Promise.all(stages.map(async (stage) => {
          const res = await fetch(`/api/matches?stage=${stage}`);
          if (res.ok) {
            const data = await res.json();
            const arr = Array.isArray(data) ? data : data.matches || [];
            all.push(...arr);
          }
        }));
        all.sort((a, b) => a.matchNumber - b.matchNumber);
        setAllMatches(all);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  if (loading) return <div className="text-center text-gray-400 text-sm py-8">Carregando chaveamento...</div>;

  const simMap = new Map<number, any>();
  if (simulatedMatches) {
    for (const s of simulatedMatches) {
      simMap.set(s.matchNumber, s);
    }
  }

  // R32→R16 feeder map: R16 matchNumber → [R32 matchNumber, R32 matchNumber]
  const R16_FEEDERS: Record<number, number[]> = {
    89: [73, 75], 90: [74, 77], 91: [76, 78], 92: [79, 80],
    93: [81, 82], 94: [83, 84], 95: [85, 87], 96: [86, 88],
  };

  const matchByNumber = new Map<number, any>();
  for (const m of allMatches) matchByNumber.set(m.matchNumber, m);

  // Check if a match's feeder matches all have results
  const feedersPlayed = (matchNumber: number): boolean => {
    const feeders = R16_FEEDERS[matchNumber];
    if (feeders) {
      return feeders.every(fn => { const f = matchByNumber.get(fn); return f && f.homeScore != null; });
    }
    // For QF+: check if the match already has real teams set in the DB
    return false;
  };

  const enrichMatch = (m: any) => {
    // Only enrich with simulated data if:
    // - R32: always (group-based, teams already set in DB so this rarely applies)
    // - R16: only if both feeder R32 matches have been played
    // - QF+: only if both teams are already set in DB
    if (m.stage !== 'R32' && !m.homeTeam && !m.awayTeam) {
      if (m.stage === 'R16' && !feedersPlayed(m.matchNumber)) return m;
      if (['QF', 'SF', 'FINAL', '3RD'].includes(m.stage) && !m.homeTeamId && !m.awayTeamId) return m;
    }
    const sim = simMap.get(m.matchNumber);
    if (!sim) return m;
    return {
      ...m,
      _simHome: !m.homeTeam && sim.homeTeam ? sim.homeTeam : undefined,
      _simAway: !m.awayTeam && sim.awayTeam ? sim.awayTeam : undefined,
    };
  };

  const byStage = (stage: string) => allMatches.filter(m => m.stage === stage).map(enrichMatch);
  const r32 = byStage('R32');
  const r16 = byStage('R16');
  const qf = byStage('QF');
  const sf = byStage('SF');
  const final_ = byStage('FINAL')[0];
  const third = byStage('3RD')[0];

  const leftR32 = r32.slice(0, 8);
  const rightR32 = r32.slice(8, 16);
  const leftR16 = r16.slice(0, 4);
  const rightR16 = r16.slice(4, 8);
  const leftQF = qf.slice(0, 2);
  const rightQF = qf.slice(2, 4);
  const leftSF = sf.slice(0, 1);
  const rightSF = sf.slice(1, 2);

  const hl = (stage: string) => activeStage === stage;

  const handleMatchClick = (matchId: number, stage: string) => {
    if (onMatchClick) {
      onMatchClick(matchId, stage);
    }
    // Small delay to let the stage change render the cards
    setTimeout(() => {
      const el = document.getElementById(`match-card-${matchId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-emerald-400');
        setTimeout(() => el.classList.remove('ring-2', 'ring-emerald-400'), 2000);
      }
    }, 300);
  };

  const renderRound = (matches: any[], stage: string, size: 'small' | 'normal' = 'normal') => (
    <div className={`bracket-round bracket-round-${matches.length}`}>
      {matches.map((m: any) => (
        <div key={m.id} className="bracket-game">
          <MatchSlot match={m} highlighted={hl(stage)} size={size} onClick={() => handleMatchClick(m.id, stage)} />
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="bg-emerald-800 text-white text-center py-2.5 text-sm font-bold tracking-wide">
        Chaveamento Copa do Mundo 2026
      </div>

      <div className="bracket-container p-4 overflow-x-auto">
        <div className="bracket-wrapper">
          {/* LEFT: R32 → R16 → QF → SF */}
          <div className="bracket-side">
            {renderRound(leftR32, 'R32')}
            {renderRound(leftR16, 'R16')}
            {renderRound(leftQF, 'QF')}
            {renderRound(leftSF, 'SF')}
          </div>

          {/* CENTER: Final + Trophy */}
          <div className="bracket-center">
            <div className="bracket-trophy">
              <svg width="64" height="64" viewBox="0 0 64 64" className="mx-auto drop-shadow-lg" xmlns="http://www.w3.org/2000/svg">
                {/* Trophy cup */}
                <path d="M18 8h28v4c0 10-6 20-14 24-8-4-14-14-14-24V8z" fill="url(#gold)" stroke="#b8860b" strokeWidth="1.5"/>
                {/* Left handle */}
                <path d="M18 12H12c-2 0-4 2-4 4v2c0 4 3 8 7 9h3" fill="none" stroke="#b8860b" strokeWidth="2" strokeLinecap="round"/>
                {/* Right handle */}
                <path d="M46 12h6c2 0 4 2 4 4v2c0 4-3 8-7 9h-3" fill="none" stroke="#b8860b" strokeWidth="2" strokeLinecap="round"/>
                {/* Stem */}
                <rect x="29" y="36" width="6" height="10" rx="1" fill="url(#gold)" stroke="#b8860b" strokeWidth="1"/>
                {/* Base */}
                <ellipse cx="32" cy="50" rx="12" ry="3" fill="url(#gold)" stroke="#b8860b" strokeWidth="1"/>
                <rect x="22" y="48" width="20" height="4" rx="1" fill="url(#gold)" stroke="#b8860b" strokeWidth="1"/>
                {/* Globe/ball on top */}
                <circle cx="32" cy="7" r="3" fill="url(#gold)" stroke="#b8860b" strokeWidth="1"/>
                {/* Star */}
                <polygon points="32,2 33,5 36,5 33.5,7 34.5,10 32,8 29.5,10 30.5,7 28,5 31,5" fill="#fff" opacity="0.6"/>
                <defs>
                  <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ffd700"/>
                    <stop offset="50%" stopColor="#ffec80"/>
                    <stop offset="100%" stopColor="#daa520"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <MatchSlot match={final_} highlighted={hl('FINAL')} onClick={() => final_ && handleMatchClick(final_.id, 'FINAL')} />
            {final_?.winnerId && final_?.winner && (
              <div className="text-center mt-1.5 text-xs font-bold text-amber-600">
                🎉 Campeao!
              </div>
            )}
            {third && (
              <div className="mt-5">
                <div className="text-[10px] text-gray-400 text-center mb-1 uppercase tracking-wider">3o Lugar</div>
                <MatchSlot match={third} highlighted={hl('3RD')} size="small" onClick={() => handleMatchClick(third.id, '3RD')} />
              </div>
            )}
          </div>

          {/* RIGHT: SF → QF → R16 → R32 (converging from right to center) */}
          <div className="bracket-side">
            {renderRound(rightSF, 'SF')}
            {renderRound(rightQF, 'QF')}
            {renderRound(rightR16, 'R16')}
            {renderRound(rightR32, 'R32')}
          </div>
        </div>

        {/* Stage labels bottom */}
        <div className="bracket-labels">
          <span>16 avos</span>
          <span>Oitavas</span>
          <span>Quartas</span>
          <span>Semi</span>
          <span>Final</span>
          <span>Semi</span>
          <span>Quartas</span>
          <span>Oitavas</span>
          <span>16 avos</span>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-5 mt-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded border border-gray-300 bg-white" /> Classificado
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded border border-sky-300 bg-sky-50" /> Provisório
          </span>
        </div>
      </div>
    </div>
  );
}
