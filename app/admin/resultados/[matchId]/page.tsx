'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import ResultForm from '@/components/ResultForm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MatchData = any;

export default function AdminMatchResultPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;

  const [match, setMatch] = useState<MatchData>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`/api/matches/${matchId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setMatch(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [matchId]);

  const handleSubmit = async (homeScore: number, awayScore: number, winnerId?: number, homePen?: number, awayPen?: number) => {
    setSaving(true);
    setMessage('');
    try {
      const body: Record<string, unknown> = { matchId: parseInt(matchId), homeScore, awayScore };
      if (winnerId) body.winnerId = winnerId;
      if (homePen != null) body.homePenalties = homePen;
      if (awayPen != null) body.awayPenalties = awayPen;

      const res = await fetch('/api/admin/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setMessage('Resultado salvo com sucesso!');
        setTimeout(() => router.push('/admin/resultados'), 1500);
      } else {
        const err = await res.json();
        setMessage(err.error || 'Erro ao salvar resultado.');
      }
    } catch {
      setMessage('Erro ao salvar resultado.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;
  if (!match) return <div className="text-center py-12"><p className="text-red-600">Jogo nao encontrado.</p></div>;

  const stageLabels: Record<string, string> = {
    GROUP: 'Fase de Grupos', R32: '16 avos de Final', R16: 'Oitavas de Final',
    QF: 'Quartas de Final', SF: 'Semifinal', '3RD': 'Disputa 3o Lugar', FINAL: 'Final',
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-emerald-800 mb-2">Inserir Resultado</h1>
      <p className="text-sm text-gray-500 mb-4">
        {stageLabels[match.stage] || match.stage}
        {match.groupLabel ? ` - Grupo ${match.groupLabel}` : ''}
        {' | '}
        {new Date(match.dateTime).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
      </p>

      {message && (
        <div className={`px-4 py-3 rounded-lg mb-4 text-sm ${message.includes('sucesso') ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {message}
        </div>
      )}

      <ResultForm match={match} onSubmit={handleSubmit} saving={saving} />
    </div>
  );
}
