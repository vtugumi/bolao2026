'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/AuthProvider';
import LoadingSpinner from '@/components/LoadingSpinner';
import BonusPredictionForm from '@/components/BonusPredictionForm';

interface BonusPrediction {
  champion?: string;
  runnerUp?: string;
  topScorer?: string;
  thirdPlace?: string;
  fourthPlace?: string;
  brazilFirstGoal?: string;
  locked?: boolean;
}

interface GroupBonusEntry {
  userId: number;
  userName: string;
  value: string;
  points: number | null;
}

interface GroupInfo {
  id: number;
  name: string;
}

interface MissingUser {
  id: number;
  name: string;
}

interface GroupBonusData {
  locked: boolean;
  message?: string;
  groups?: GroupInfo[];
  membersByGroup?: Record<number, number[]>;
  byType?: Record<string, GroupBonusEntry[]>;
  missingUsers?: MissingUser[];
  totalMembers?: number;
}

const TYPE_LABELS: Record<string, string> = {
  CHAMPION: 'Campeao',
  RUNNER_UP: 'Vice',
  THIRD_PLACE: '3o lugar',
  FOURTH_PLACE: '4o lugar',
  TOP_SCORER: 'Artilheiro',
  BRAZIL_FIRST_GOAL: '1o Gol BRA',
};

const TYPE_LABELS_FULL: Record<string, string> = {
  CHAMPION: 'Campeao',
  RUNNER_UP: 'Vice-campeao',
  THIRD_PLACE: 'Terceiro lugar',
  FOURTH_PLACE: 'Quarto lugar',
  TOP_SCORER: 'Artilheiro',
  BRAZIL_FIRST_GOAL: 'Primeiro gol do Brasil',
};

const TYPE_POINTS: Record<string, number> = {
  CHAMPION: 120,
  RUNNER_UP: 80,
  THIRD_PLACE: 50,
  FOURTH_PLACE: 50,
  TOP_SCORER: 80,
  BRAZIL_FIRST_GOAL: 50,
};

const TYPE_ORDER = ['CHAMPION', 'RUNNER_UP', 'THIRD_PLACE', 'FOURTH_PLACE', 'TOP_SCORER', 'BRAZIL_FIRST_GOAL'];

export default function BonusPredictionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [bonus, setBonus] = useState<BonusPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [groupBonus, setGroupBonus] = useState<GroupBonusData | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState('CHAMPION');

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    const fetchAll = async () => {
      try {
        const res = await fetch('/api/predictions/bonus', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const bonusObj: BonusPrediction = {};
            for (const item of data) {
              switch (item.type) {
                case 'CHAMPION': bonusObj.champion = item.value; break;
                case 'RUNNER_UP': bonusObj.runnerUp = item.value; break;
                case 'TOP_SCORER': bonusObj.topScorer = item.value; break;
                case 'THIRD_PLACE': bonusObj.thirdPlace = item.value; break;
                case 'FOURTH_PLACE': bonusObj.fourthPlace = item.value; break;
                case 'BRAZIL_FIRST_GOAL': bonusObj.brazilFirstGoal = item.value; break;
              }
            }
            setBonus(bonusObj);
          } else {
            setBonus(data.bonus || data || null);
          }
        }

        const groupRes = await fetch('/api/predictions/bonus/group', { cache: 'no-store' });
        if (groupRes.ok) {
          const groupData = await groupRes.json();
          setGroupBonus(groupData);
          if (groupData.groups?.length > 0) {
            setSelectedGroup(groupData.groups[0].id);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar palpites bonus:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user, authLoading]);

  const filteredEntries = useMemo(() => {
    const entries = groupBonus?.byType?.[selectedType] || [];
    if (!selectedGroup || !groupBonus?.membersByGroup) return entries;
    const memberIds = groupBonus.membersByGroup[selectedGroup] || [];
    const memberSet = new Set(memberIds);
    return entries.filter(e => memberSet.has(e.userId));
  }, [groupBonus, selectedGroup, selectedType]);

  const filteredMissing = useMemo(() => {
    const missing = groupBonus?.missingUsers || [];
    if (!selectedGroup || !groupBonus?.membersByGroup) return missing.map(u => u.name);
    const memberIds = groupBonus.membersByGroup[selectedGroup] || [];
    const memberSet = new Set(memberIds);
    return missing.filter(u => memberSet.has(u.id)).map(u => u.name);
  }, [groupBonus, selectedGroup]);

  const popularCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredEntries.forEach(e => {
      const key = e.value.trim();
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filteredEntries]);

  const handleSave = async (data: {
    champion: string;
    runnerUp: string;
    topScorer: string;
    thirdPlace: string;
    fourthPlace: string;
    brazilFirstGoal: string;
  }) => {
    setSaving(true);
    setMessage('');
    try {
      const types = [
        { type: 'CHAMPION', value: data.champion },
        { type: 'RUNNER_UP', value: data.runnerUp },
        { type: 'TOP_SCORER', value: data.topScorer },
        { type: 'THIRD_PLACE', value: data.thirdPlace },
        { type: 'FOURTH_PLACE', value: data.fourthPlace },
        { type: 'BRAZIL_FIRST_GOAL', value: data.brazilFirstGoal },
      ];

      let hasError = false;
      for (const item of types) {
        if (!item.value) continue;
        const res = await fetch('/api/predictions/bonus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        if (!res.ok) {
          const err = await res.json();
          setMessage(err.error || 'Erro ao salvar palpites bonus.');
          hasError = true;
          break;
        }
      }

      if (!hasError) {
        setBonus(data);
        setMessage('Palpites bonus salvos com sucesso!');
      }
    } catch {
      setMessage('Erro ao salvar palpites bonus.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-600">Voce precisa estar logado para acessar esta pagina.</p>
      </div>
    );
  }

  const isLocked = groupBonus?.locked === true;
  const groups = groupBonus?.groups || [];
  const hasMultipleGroups = groups.length > 1;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl md:text-3xl font-bold text-emerald-800 mb-2">
        Palpites Bonus
      </h1>
      <p className="text-gray-500 mb-4">
        {isLocked
          ? 'Os palpites bonus estao bloqueados. Veja o que cada um palpitou!'
          : 'Palpite o campeao, vice-campeao, terceiro lugar, quarto lugar e artilheiro da Copa do Mundo 2026. Esses palpites serao bloqueados apos o inicio do torneio.'
        }
      </p>

      {message && (
        <div
          className={`px-4 py-3 rounded-lg mb-4 text-sm ${
            message.includes('sucesso')
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message}
        </div>
      )}

      {!isLocked && (
        <BonusPredictionForm
          initialData={bonus || undefined}
          onSave={handleSave}
          saving={saving}
          locked={false}
        />
      )}

      {isLocked && groupBonus?.byType && (
        <div>
          {/* Group tabs */}
          {hasMultipleGroups && (
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroup(g.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedGroup === g.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}

          {/* Category toggle */}
          <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
            {TYPE_ORDER.map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedType === type
                    ? 'bg-amber-500 text-white'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                {TYPE_LABELS[type]}
              </button>
            ))}
          </div>

          {/* Selected category content */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-emerald-700 mb-1">
              {TYPE_LABELS_FULL[selectedType]}
              <span className="text-amber-600 font-normal text-sm ml-2">({TYPE_POINTS[selectedType]} pts)</span>
            </h3>

            {popularCounts.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {popularCounts.slice(0, 3).map(([value, count]) => (
                  <span key={value} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">
                    {value} ({count}x)
                  </span>
                ))}
              </div>
            )}

            <div className="space-y-1">
              {filteredEntries.map((e, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50">
                  <span className="text-sm text-gray-700">{e.userName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{e.value}</span>
                    {e.points !== null && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        e.points > 0 ? 'bg-emerald-200 text-emerald-800' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {e.points} pts
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {filteredEntries.length === 0 && (
                <p className="text-sm text-gray-400 py-2">Nenhum palpite nesta categoria.</p>
              )}
            </div>
          </div>

          {filteredMissing.length > 0 && (
            <div className="mt-4 bg-gray-50 rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">
                Nao fizeram palpites bonus: {filteredMissing.join(', ')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
