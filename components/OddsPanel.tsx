'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface MatchOdds {
  group: { homeWin: number; draw: number; awayWin: number; total: number } | null;
  ranking: { homeWin: number; draw: number; awayWin: number } | null;
  opta: { homeWin: number; draw: number; awayWin: number } | null;
  market: { homeWin: number; draw: number; awayWin: number } | null;
  totalGroupMembers: number;
}

interface OddsPanelProps {
  odds: MatchOdds;
  homeEmoji?: string;
  awayEmoji?: string;
}

function OddsBar({
  homeWin, draw, awayWin, label, extra,
}: {
  homeWin: number; draw: number; awayWin: number;
  label: string;
  extra?: string;
}) {
  const total = homeWin + draw + awayWin;
  const h = total > 0 ? Math.round((homeWin / total) * 100) : 33;
  const d = total > 0 ? Math.round((draw / total) * 100) : 34;
  const a = 100 - h - d;

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] text-gray-400 w-14 sm:w-16 shrink-0 truncate">{label}</span>
        <div className="flex h-4 rounded-full overflow-hidden bg-gray-100 text-[8px] sm:text-[9px] font-bold leading-none flex-1 min-w-0">
          {h > 0 && (
            <div
              className="bg-emerald-500 text-white flex items-center justify-center"
              style={{ width: `${Math.max(h, 12)}%` }}
            >
              {h}%
            </div>
          )}
          {d > 0 && (
            <div
              className="bg-gray-400 text-white flex items-center justify-center"
              style={{ width: `${Math.max(d, 12)}%` }}
            >
              {d}%
            </div>
          )}
          {a > 0 && (
            <div
              className="bg-red-400 text-white flex items-center justify-center"
              style={{ width: `${Math.max(a, 12)}%` }}
            >
              {a}%
            </div>
          )}
        </div>
      </div>
      {extra && <div className="text-[8px] text-gray-300 text-center mt-0.5">{extra}</div>}
    </div>
  );
}

export default function OddsPanel({ odds, homeEmoji, awayEmoji }: OddsPanelProps) {
  const hasAnyOdds = odds.ranking || odds.opta || odds.market;
  if (!hasAnyOdds) return null;

  // Convert market decimal odds to probabilities
  let marketProbs: { homeWin: number; draw: number; awayWin: number } | null = null;
  if (odds.market) {
    const hP = 1 / odds.market.homeWin;
    const dP = 1 / odds.market.draw;
    const aP = 1 / odds.market.awayWin;
    const tot = hP + dP + aP;
    marketProbs = {
      homeWin: Math.round((hP / tot) * 100),
      draw: Math.round((dP / tot) * 100),
      awayWin: 100 - Math.round((hP / tot) * 100) - Math.round((dP / tot) * 100),
    };
  }

  return (
    <div className="mx-2 sm:mx-4 mb-2 rounded-lg bg-gray-50 border border-gray-200 px-2.5 sm:px-3 py-2 space-y-1.5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">📊 Odds</span>
        <div className="flex items-center gap-2 sm:gap-3 text-[8px] sm:text-[9px] text-gray-400">
          <span>{homeEmoji} Casa</span>
          <span>✕</span>
          <span>{awayEmoji} Fora</span>
        </div>
      </div>

      {/* FIFA Ranking odds */}
      {odds.ranking && (
        <OddsBar
          homeWin={odds.ranking.homeWin} draw={odds.ranking.draw} awayWin={odds.ranking.awayWin}
          label="🏆 FIFA"
        />
      )}

      {/* Opta Supercomputer odds */}
      {odds.opta && (
        <OddsBar
          homeWin={odds.opta.homeWin} draw={odds.opta.draw} awayWin={odds.opta.awayWin}
          label="🔬 Opta"
        />
      )}

      {/* Market odds - last (média de ~25 casas de apostas) */}
      {marketProbs && (
        <OddsBar
          homeWin={marketProbs.homeWin} draw={marketProbs.draw} awayWin={marketProbs.awayWin}
          label="📈 Mercado"
          extra={`${odds.market!.homeWin.toFixed(1)} · ${odds.market!.draw.toFixed(1)} · ${odds.market!.awayWin.toFixed(1)}`}
        />
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
  optaOdds?: BonusOddsItem[];
  marketOdds?: BonusOddsItem[];
  totalMembers: number;
  userHasPredicted: boolean;
}

export function BonusOddsPanel({ title, groupOdds, rankingOdds, optaOdds, marketOdds, totalMembers, userHasPredicted }: BonusOddsPanelProps) {
  const hasData = (rankingOdds && rankingOdds.length > 0) || (optaOdds && optaOdds.length > 0) || (marketOdds && marketOdds.length > 0);
  if (!hasData) return null;

  const topGroup = groupOdds.slice(0, 5);
  const topRanking = rankingOdds?.slice(0, 5) || [];
  const topOpta = optaOdds?.slice(0, 5) || [];
  const topMarket = marketOdds?.slice(0, 5) || [];

  return (
    <div className="rounded-lg bg-gray-50 border border-gray-200 px-2.5 sm:px-3 py-2 space-y-1.5 mt-2">
      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
        📊 {title}
      </span>

      {/* Ranking odds */}
      {topRanking.length > 0 && (
        <div>
          <span className="text-[9px] text-gray-500">🏆 FIFA</span>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {topRanking.map((item, i) => (
              <span key={i} className="text-[8px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200">
                {item.value} {item.probability || item.percentage}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Opta odds */}
      {topOpta.length > 0 && (
        <div>
          <span className="text-[9px] text-gray-500">🔬 Opta</span>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {topOpta.map((item, i) => (
              <span key={i} className="text-[8px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200">
                {item.value} {item.probability || item.percentage}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Market odds - last (same order as match cards) */}
      {topMarket.length > 0 && (
        <div>
          <span className="text-[9px] text-gray-500">📈 Mercado</span>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {topMarket.map((item, i) => (
              <span key={i} className="text-[8px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200">
                {item.value} {item.odds?.toFixed(2)}
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
