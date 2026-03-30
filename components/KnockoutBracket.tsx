'use client';

import { useState, useEffect } from 'react';
import Flag from './Flag';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface KnockoutBracketProps {
  activeStage?: string;
  onMatchClick?: (matchId: number, stage: string) => void;
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

  const homeName = match.homeTeam?.name || 'A definir';
  const awayName = match.awayTeam?.name || 'A definir';
  const homeFlag = match.homeTeam?.flagEmoji || '🏳️';
  const awayFlag = match.awayTeam?.flagEmoji || '🏳️';
  const hasResult = match.homeScore != null;
  const homeWon = match.winnerId === match.homeTeamId;
  const awayWon = match.winnerId === match.awayTeamId;
  const homeHasTeam = !!match.homeTeam;
  const awayHasTeam = !!match.awayTeam;

  return (
    <div
      onClick={onClick}
      className={`bracket-match bracket-match-${size} border rounded-md overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-md hover:border-emerald-400 transition-all' : ''} ${highlighted ? 'border-emerald-500 shadow-md ring-1 ring-emerald-200' : 'border-gray-300 shadow-sm'}`}>
      <div className={`bracket-team border-b ${highlighted ? 'border-emerald-200' : 'border-gray-200'} ${homeWon ? 'bg-emerald-50 font-bold text-emerald-800' : awayWon ? 'text-gray-400' : ''}`}>
        <span className="bracket-flag">{homeHasTeam ? <Flag code={match.homeTeam?.code || ''} emoji={homeFlag} size={16} /> : ''}</span>
        <span className="bracket-team-name">{homeName}</span>
        {hasResult && <span className={`bracket-score ${homeWon ? 'text-emerald-700' : ''}`}>{match.homeScore}</span>}
      </div>
      <div className={`bracket-team ${awayWon ? 'bg-emerald-50 font-bold text-emerald-800' : homeWon ? 'text-gray-400' : ''}`}>
        <span className="bracket-flag">{awayHasTeam ? <Flag code={match.awayTeam?.code || ''} emoji={awayFlag} size={16} /> : ''}</span>
        <span className="bracket-team-name">{awayName}</span>
        {hasResult && <span className={`bracket-score ${awayWon ? 'text-emerald-700' : ''}`}>{match.awayScore}</span>}
      </div>
    </div>
  );
}

export default function KnockoutBracket({ activeStage, onMatchClick }: KnockoutBracketProps) {
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

  const byStage = (stage: string) => allMatches.filter(m => m.stage === stage);
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
      </div>
    </div>
  );
}
