import Flag from './Flag';

interface TeamStanding {
  teamId: number;
  teamName: string;
  teamCode: string;
  flagEmoji: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

interface GroupStandingsTableProps {
  standings: TeamStanding[];
  groupLabel?: string;
}

function getPositionStyle(index: number): string {
  if (index < 2) return 'bg-emerald-50 border-l-4 border-l-emerald-500';
  if (index === 2) return 'bg-yellow-50 border-l-4 border-l-yellow-400';
  return 'border-l-4 border-l-transparent';
}

export default function GroupStandingsTable({ standings, groupLabel }: GroupStandingsTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {groupLabel && (
        <div className="px-4 py-3 bg-emerald-800 text-white font-semibold">
          Grupo {groupLabel}
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600 uppercase text-xs">
              <th className="text-left px-4 py-3 w-8">#</th>
              <th className="text-left px-4 py-3">Selecao</th>
              <th className="text-center px-2 py-3">J</th>
              <th className="text-center px-2 py-3">V</th>
              <th className="text-center px-2 py-3">E</th>
              <th className="text-center px-2 py-3">D</th>
              <th className="text-center px-2 py-3">GP</th>
              <th className="text-center px-2 py-3">GC</th>
              <th className="text-center px-2 py-3">SG</th>
              <th className="text-center px-2 py-3 font-bold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.teamId} className={`border-t border-gray-100 ${getPositionStyle(i)}`}>
                <td className="px-4 py-3 text-gray-400 font-medium">{i + 1}</td>
                <td className="px-4 py-3 font-medium">
                  <Flag code={s.teamCode} emoji={s.flagEmoji} size={20} className="mr-2" />
                  {s.teamName}
                </td>
                <td className="text-center px-2 py-3">{s.played}</td>
                <td className="text-center px-2 py-3">{s.won}</td>
                <td className="text-center px-2 py-3">{s.drawn}</td>
                <td className="text-center px-2 py-3">{s.lost}</td>
                <td className="text-center px-2 py-3">{s.goalsFor}</td>
                <td className="text-center px-2 py-3">{s.goalsAgainst}</td>
                <td className="text-center px-2 py-3">{s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}</td>
                <td className="text-center px-2 py-3 font-bold text-emerald-700">{s.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-gray-100">
        {standings.map((s, i) => (
          <div key={s.teamId} className={`px-4 py-3 ${getPositionStyle(i)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 font-medium w-5">{i + 1}</span>
                <Flag code={s.teamCode} emoji={s.flagEmoji} size={24} />
                <span className="font-medium">{s.teamName}</span>
              </div>
              <span className="text-lg font-bold text-emerald-700">{s.points} pts</span>
            </div>
            <div className="flex gap-3 mt-1 text-xs text-gray-500 ml-7">
              <span>{s.played}J</span>
              <span>{s.won}V</span>
              <span>{s.drawn}E</span>
              <span>{s.lost}D</span>
              <span>SG: {s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="px-4 py-2 bg-gray-50 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Classificados
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-yellow-400 inline-block" /> Possivel classificado (3o)
        </span>
      </div>
    </div>
  );
}
