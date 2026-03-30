'use client';

const STAGES = [
  { key: 'R32', label: '16 avos' },
  { key: 'R16', label: 'Oitavas' },
  { key: 'QF', label: 'Quartas' },
  { key: 'SF', label: 'Semifinal' },
  { key: '3RD', label: '3o Lugar' },
  { key: 'FINAL', label: 'Final' },
];

interface StageNavProps {
  activeStage: string;
  onStageChange: (stage: string) => void;
}

export default function StageNav({ activeStage, onStageChange }: StageNavProps) {
  return (
    <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
      <div className="flex gap-2 min-w-max pb-2">
        {STAGES.map((stage) => (
          <button
            key={stage.key}
            onClick={() => onStageChange(stage.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${
              activeStage === stage.key
                ? 'bg-emerald-700 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {stage.label}
          </button>
        ))}
      </div>
    </div>
  );
}
