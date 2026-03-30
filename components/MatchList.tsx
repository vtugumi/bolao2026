'use client';

import MatchCard from './MatchCard';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface MatchListProps {
  matches: any[];
  showPrediction?: boolean;
  onSavePrediction?: (matchId: number, data: { homeScore: number; awayScore: number; winnerId?: number }) => Promise<void>;
}

function groupByDate(matches: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  for (const match of matches) {
    const dateKey = new Date(match.dateTime).toISOString().split('T')[0];
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(match);
  }
  return groups;
}

export default function MatchList({ matches, showPrediction, onSavePrediction }: MatchListProps) {
  const grouped = groupByDate(matches);
  const sortedDates = Object.keys(grouped).sort();

  if (matches.length === 0) {
    return <div className="text-center py-12 text-gray-500"><p>Nenhum jogo encontrado</p></div>;
  }

  return (
    <div className="space-y-8">
      {sortedDates.map(dateKey => (
        <div key={dateKey}>
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3 px-1">
            {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date(dateKey + 'T12:00:00Z'))}
          </h3>
          <div className="space-y-3">
            {grouped[dateKey].map((match: any) => (
              <MatchCard key={match.id} match={match} showPrediction={showPrediction} onSavePrediction={onSavePrediction} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
