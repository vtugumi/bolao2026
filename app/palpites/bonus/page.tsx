'use client';

import { useState, useEffect } from 'react';
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
  userName: string;
  value: string;
  points: number | null;
}

interface GroupBonusData {
  locked: boolean;
  message?: string;
  byType?: Record<string, GroupBonusEntry[]>;
  missingUsers?: string[];
  totalMembers?: number;
}

const TYPE_LABELS: Record<string, string> = {
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

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    const fetchAll = async () => {
      try {
        // Fetch user's own bonus predictions
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

        // Fetch group bonus predictions
        const groupRes = await fetch('/api/predictions/bonus/group');
        if (groupRes.ok) {
          const groupData = await groupRes.json();
          setGroupBonus(groupData);
        }
      } catch (err) {
        console.error('Erro ao carregar palpites bonus:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user, authLoading]);

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

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl md:text-3xl font-bold text-emerald-800 mb-2">
        Palpites Bonus
      </h1>
      <p className="text-gray-500 mb-6">
        {isLocked
          ? 'Os palpites bonus estao bloqueados. Veja o que cada um palpitou!'
          : 'Palpite o campeao, vice-campeao, terceiro lugar, quarto lugar e artilheiro da Copa do Mundo 2026. Esses palpites serao bloqueados apos o inicio do torneio.'
        }
      </p>

      {message && (
        <div
          className={`px-4 py-3 rounded-lg mb-6 text-sm ${
            message.includes('sucesso')
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message}
        </div>
      )}

      {/* User's own form (only when not locked) */}
      {!isLocked && (
        <BonusPredictionForm
          initialData={bonus || undefined}
          onSave={handleSave}
          saving={saving}
          locked={false}
        />
      )}

      {/* Group predictions (only when locked / Copa started) */}
      {isLocked && groupBonus?.byType && (
        <div className="space-y-6">
          {TYPE_ORDER.map(type => {
            const entries = groupBonus.byType?.[type] || [];
            if (entries.length === 0) return null;

            // Count most popular picks
            const counts: Record<string, number> = {};
            entries.forEach(e => {
              const key = e.value.trim();
              counts[key] = (counts[key] || 0) + 1;
            });
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

            return (
              <div key={type} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-bold text-emerald-700 mb-1">
                  {TYPE_LABELS[type]}
                  <span className="text-amber-600 font-normal text-sm ml-2">({TYPE_POINTS[type]} pts)</span>
                </h3>

                {/* Most popular */}
                {sorted.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {sorted.slice(0, 3).map(([value, count]) => (
                      <span key={value} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">
                        {value} ({count}x)
                      </span>
                    ))}
                  </div>
                )}

                {/* Individual predictions */}
                <div className="space-y-1">
                  {entries.map((e, i) => (
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
                </div>
              </div>
            );
          })}

          {/* Users who didn't predict */}
          {groupBonus.missingUsers && groupBonus.missingUsers.length > 0 && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">
                Nao fizeram palpites bonus: {groupBonus.missingUsers.join(', ')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
