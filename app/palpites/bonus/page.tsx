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
  locked?: boolean;
}

export default function BonusPredictionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [bonus, setBonus] = useState<BonusPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    const fetchBonus = async () => {
      try {
        const res = await fetch('/api/predictions/bonus');
        if (res.ok) {
          const data = await res.json();
          // The API returns an array of BonusPrediction records
          // Transform into a single object keyed by type
          if (Array.isArray(data)) {
            const bonusObj: BonusPrediction = {};
            for (const item of data) {
              switch (item.type) {
                case 'CHAMPION': bonusObj.champion = item.value; break;
                case 'RUNNER_UP': bonusObj.runnerUp = item.value; break;
                case 'TOP_SCORER': bonusObj.topScorer = item.value; break;
                case 'THIRD_PLACE': bonusObj.thirdPlace = item.value; break;
                case 'FOURTH_PLACE': bonusObj.fourthPlace = item.value; break;
              }
            }
            setBonus(bonusObj);
          } else {
            setBonus(data.bonus || data || null);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar palpites bonus:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBonus();
  }, [user, authLoading]);

  const handleSave = async (data: {
    champion: string;
    runnerUp: string;
    topScorer: string;
    thirdPlace: string;
    fourthPlace: string;
  }) => {
    setSaving(true);
    setMessage('');
    try {
      // Save each bonus type individually (the API expects one at a time)
      const types = [
        { type: 'CHAMPION', value: data.champion },
        { type: 'RUNNER_UP', value: data.runnerUp },
        { type: 'TOP_SCORER', value: data.topScorer },
        { type: 'THIRD_PLACE', value: data.thirdPlace },
        { type: 'FOURTH_PLACE', value: data.fourthPlace },
      ];

      let hasError = false;
      for (const item of types) {
        if (!item.value) continue; // skip empty values
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl md:text-3xl font-bold text-emerald-800 mb-2">
        Palpites Bonus
      </h1>
      <p className="text-gray-500 mb-6">
        Palpite o campeao, vice-campeao, terceiro lugar, quarto lugar e artilheiro
        da Copa do Mundo 2026.
        Esses palpites serao bloqueados apos o inicio do torneio.
      </p>

      {bonus?.locked && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg mb-6 text-sm">
          Os palpites bonus estao bloqueados. Nao e possivel alterar.
        </div>
      )}

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

      <BonusPredictionForm
        initialData={bonus || undefined}
        onSave={handleSave}
        saving={saving}
        locked={bonus?.locked || false}
      />
    </div>
  );
}
