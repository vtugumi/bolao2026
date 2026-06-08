'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface MatchOdds {
  group: { homeWin: number; draw: number; awayWin: number; total: number } | null;
  ranking: { homeWin: number; draw: number; awayWin: number } | null;
  market: { homeWin: number; draw: number; awayWin: number } | null;
  totalGroupMembers: number;
}

interface OddsPanelProps {
  odds: MatchOdds;
  homeEmoji?: string;
  awayEmoji?: string;
}

function OddsBar({ homeWin, draw, awayWin }: { homeWin: number; draw: number; awayWin: number }) {
  // Ensure they add up to 100
  const total = homeWin + draw + awayWin;
  const h = total > 0 ? Math.round((homeWin / total) * 100) : 33;
  const d = total > 0 ? Math.round((draw / total) * 100) : 34;
  const a = 100 - h - d;

  return (
    <div className="flex h-4 rounded-full overflow-hidden bg-gray-100 text-[9px] font-bold">
      {h > 0 && (
        <div
          className="bg-emerald-500 text-white flex items-center justify-center transition-all duration-500"
          style={{ width: `${Math.max(h, 8)}%` }}
        >
          {h}%
        </div>
      )}
      {d > 0 && (
        <div
          className="bg-gray-400 text-white flex items-center justify-center transition-all duration-500"
          style={{ width: `${Math.max(d, 8)}%` }}
        >
          {d}%
        </div>
      )}
      {a > 0 && (
        <div
          className="bg-red-400 text-white flex items-center justify-center transition-all duration-500"
          style={{ width: `${Math.max(a, 8)}%` }}
        >
          {a}%
        </div>
      )}
    </div>
  );
}

function MarketOddsRow({ homeWin, draw, awayWin }: { homeWin: number; draw: number; awayWin: number }) {
  return (
    <div className="flex justify-between text-[10px] font-mono">
      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">{homeWin.toFixed(2)}</span>
      <span className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded font-bold">{draw.toFixed(2)}</span>
      <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded font-bold">{awayWin.toFixed(2)}</span>
    </div>
  );
}

export default function OddsPanel({ odds, homeEmoji, awayEmoji }: OddsPanelProps) {
  const hasAnyOdds = odds.group || odds.ranking || odds.market;
  if (!hasAnyOdds) return null;

  return (
    <div className="mx-4 mb-3 rounded-lg bg-gradient-to-r from-slate-50 to-gray-50 border border-gray-200 p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Odds</span>
        <div className="flex items-center gap-3 text-[9px] text-gray-400">
          <span>{homeEmoji || '🏠'} Casa</span>
          <span>✕ Empate</span>
          <span>{awayEmoji || '✈️'} Fora</span>
        </div>
      </div>

      {/* Group odds */}
      {odds.group && odds.group.total > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500">👥 Grupo</span>
            <span className="text-[9px] text-gray-400">{odds.group.total}/{odds.totalGroupMembers}</span>
          </div>
          <OddsBar homeWin={odds.group.homeWin} draw={odds.group.draw} awayWin={odds.group.awayWin} />
        </div>
      )}

      {/* Market odds */}
      {odds.market && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500">📈 Mercado</span>
          </div>
          <MarketOddsRow homeWin={odds.market.homeWin} draw={odds.market.draw} awayWin={odds.market.awayWin} />
        </div>
      )}

      {/* Ranking odds */}
      {odds.ranking && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500">🏆 Ranking</span>
          </div>
          <OddsBar homeWin={odds.ranking.homeWin} draw={odds.ranking.draw} awayWin={odds.ranking.awayWin} />
        </div>
      )}
    </div>
  );
}

// Bonus odds panel - for champion, top scorer etc.
interface BonusOddsItem {
  value: string;
  count?: number;
  percentage?: number;
  probability?: number;
  flagEmoji?: string;
  odds?: number;
}

interface BonusOddsPanelProps {
  title: string;
  groupOdds: BonusOddsItem[];
  rankingOdds?: BonusOddsItem[];
  marketOdds?: BonusOddsItem[];
  totalMembers: number;
  userHasPredicted: boolean;
}

export function BonusOddsPanel({ title, groupOdds, rankingOdds, marketOdds, totalMembers, userHasPredicted }: BonusOddsPanelProps) {
  const hasData = (groupOdds.length > 0 && userHasPredicted) || (rankingOdds && rankingOdds.length > 0) || (marketOdds && marketOdds.length > 0);
  if (!hasData) return null;

  const topGroup = groupOdds.slice(0, 5);
  const topRanking = rankingOdds?.slice(0, 5) || [];
  const topMarket = marketOdds?.slice(0, 5) || [];

  return (
    <div className="rounded-lg bg-gradient-to-r from-slate-50 to-gray-50 border border-gray-200 p-3 space-y-2 mt-2">
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
        📊 Odds - {title}
      </span>

      {/* Group odds */}
      {topGroup.length > 0 && userHasPredicted && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500">👥 Grupo</span>
            <span className="text-[9px] text-gray-400">{totalMembers} participantes</span>
          </div>
          <div className="space-y-1">
            {topGroup.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage || 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-600 w-8 text-right font-bold">{item.percentage}%</span>
                <span className="text-[10px] text-gray-700 w-28 truncate">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ranking odds */}
      {topRanking.length > 0 && (
        <div>
          <div className="flex items-center mb-1">
            <span className="text-[10px] text-gray-500">🏆 Ranking</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {topRanking.map((item, i) => (
              <span key={i} className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                {item.flagEmoji} {item.probability || item.percentage}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Market odds */}
      {topMarket.length > 0 && (
        <div>
          <div className="flex items-center mb-1">
            <span className="text-[10px] text-gray-500">📈 Mercado</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {topMarket.map((item, i) => (
              <span key={i} className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                {item.value} {item.odds?.toFixed(2)}
              </span>
            ))}
          </div>
        </div>
      )}

      {!userHasPredicted && topGroup.length === 0 && (
        <p className="text-[10px] text-gray-400 italic">Faca seu palpite para ver as odds do grupo</p>
      )}
    </div>
  );
}
