'use client';

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

interface GroupNavProps {
  activeGroup: string;
  onGroupChange: (group: string) => void;
}

export default function GroupNav({ activeGroup, onGroupChange }: GroupNavProps) {
  return (
    <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
      <div className="flex gap-2 min-w-max pb-2">
        {GROUPS.map((group) => (
          <button
            key={group}
            onClick={() => onGroupChange(group)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${
              activeGroup === group
                ? 'bg-emerald-700 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Grupo {group}
          </button>
        ))}
      </div>
    </div>
  );
}
