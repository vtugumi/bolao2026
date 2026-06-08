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

function OddsBar({
  homeWin, draw, awayWin,
  colorScheme = 'default',
}: {
  homeWin: number; draw: number; awayWin: number;
  colorScheme?: 'default' | 'blue' | 'amber';
}) {
  const total = homeWin + draw + awayWin;
  const h = total > 0 ? Math.round((homeWin / total) * 100) : 33;
  const d = total > 0 ? Math.round((draw / total) * 100) : 34;
  const a = 100 - h - d;

  const colors = {
    default: { home: 'bg-emerald-500', draw: 'bg-gray-400', away: 'bg-red-400' },
    blue: { home: 'bg-blue-500', draw: 'bg-gray-400', away: 'bg-orange-400' },
    amber: { home: 'bg-amber-500', draw: 'bg-gray-400', away: 'bg-violet-400' },
  }[colorScheme];

  return (
    <div className="flex h-[18px] rounded-full overflow-hidden bg-gray-100 text-[9px] font-bold leading-none">
      {h > 0 && (
        <div
          className={`${colors.home} text-white flex items-center justify-center transition-all duration-500`}
          style={{ width: `${Math.max(h, 10)}%` }}
        >
          {h}%
        </div>
      )}
      {d > 0 && (
        <div
          className={`${colors.draw} text-white flex items-center justify-center transition-all duration-500`}
          style={{ width: `${Math.max(d, 10)}%` }}
        >
          {d}%
        </div>
      )}
      {a > 0 && (
        <div
          className={`${colors.away} text-white flex items-center justify-center transition-all duration-500`}
          style={{ width: `${Math.max(a, 10)}%` }}
        >
          {a}%
        </div>
      )}
    </div>
  );
}

function MarketDecimalRow({ homeWin, draw, awayWin }: { homeWin: number; draw: number; awayWin: number }) {
  // Convert decimal odds to implied probability for the bar
  const homeProb = 1 / homeWin;
  const drawProb = 1 / draw;
  const awayProb = 1 / awayWin;
  const totalProb = homeProb + drawProb + awayProb;
  const hPct = Math.round((homeProb / totalProb) * 100);
  const dPct = Math.round((drawProb / totalProb) * 100);
  const aPct = 100 - hPct - dPct;

  return (
    <div className="space-y-1">
      <OddsBar homeWin={hPct} draw={dPct} awayWin={aPct} colorScheme="blue" />
      <div className="flex justify-between text-[9px] font-mono text-gray-400 px-1">
        <span>{homeWin.toFixed(2)}</span>
        <span>{draw.toFixed(2)}</span>
        <span>{awayWin.toFixed(2)}</span>
      </div>
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
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">📊 Odds</span>
        <div className="flex items-center gap-3 text-[9px] text-gray-400">
          <span>{homeEmoji || '🏠'} Casa</span>
          <span>✕ Empate</span>
          <span>{awayEmoji || '✈️'} Fora</span>
        </div>
      </div>

      {/* 1. Group odds (social - most engaging) */}
      {odds.group && odds.group.total > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500 font-medium">👥 Grupo</span>
            <span className="text-[9px] text-gray-400">{odds.group.total}/{odds.totalGroupMembers} palpitaram</span>
          </div>
          <OddsBar homeWin={odds.group.homeWin} draw={odds.group.draw} awayWin={odds.group.awayWin} />
        </div>
      )}

      {/* 2. Market odds (when available) */}
      {odds.market && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500 font-medium">📈 Mercado</span>
            <span className="text-[9px] text-gray-400">odds decimais</span>
          </div>
          <MarketDecimalRow homeWin={odds.market.homeWin} draw={odds.market.draw} awayWin={odds.market.awayWin} />
        </div>
      )}

      {/* 3. Ranking odds (always available) */}
      {odds.ranking && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500 font-medium">🏆 Ranking FIFA</span>
          </div>
          <OddsBar homeWin={odds.ranking.homeWin} draw={odds.ranking.draw} awayWin={odds.ranking.awayWin} colorScheme="amber" />
        </div>
      )}

      {/* Hint when no group odds */}
      {(!odds.group || odds.group.total === 0) && (
        <p className="text-[9px] text-gray-400 italic text-center">Palpite para ver as odds do grupo 👥</p>
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
            <span className="text-[10px] text-gray-500 font-medium">👥 Grupo</span>
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

      {/* Market odds */}
      {topMarket.length > 0 && (
        <div>
          <div className="flex items-center mb-1">
            <span className="text-[10px] text-gray-500 font-medium">📈 Mercado</span>
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

      {/* Ranking odds */}
      {topRanking.length > 0 && (
        <div>
          <div className="flex items-center mb-1">
            <span className="text-[10px] text-gray-500 font-medium">🏆 Ranking FIFA</span>
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

      {!userHasPredicted && topGroup.length === 0 && (
        <p className="text-[9px] text-gray-400 italic">Palpite para ver as odds do grupo 👥</p>
      )}
    </div>
  );
}
