'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import Flag from '@/components/Flag';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Common FIFA codes and their ISO mappings for the dropdown
const KNOWN_TEAMS: { name: string; code: string; iso: string }[] = [
  { name: 'Turquia', code: 'TUR', iso: 'tr' },
  { name: 'Ucraina', code: 'UKR', iso: 'ua' },
  { name: 'Pais de Gales', code: 'WAL', iso: 'gb-wls' },
  { name: 'Georgia', code: 'GEO', iso: 'ge' },
  { name: 'Grecia', code: 'GRE', iso: 'gr' },
  { name: 'Irlanda', code: 'IRL', iso: 'ie' },
  { name: 'Islandia', code: 'ISL', iso: 'is' },
  { name: 'Eslovaquia', code: 'SVK', iso: 'sk' },
  { name: 'Servia', code: 'SRB', iso: 'rs' },
  { name: 'Suecia', code: 'SWE', iso: 'se' },
  { name: 'Dinamarca', code: 'DEN', iso: 'dk' },
  { name: 'Republica Tcheca', code: 'CZE', iso: 'cz' },
  { name: 'Polonia', code: 'POL', iso: 'pl' },
  { name: 'Romenia', code: 'ROU', iso: 'ro' },
  { name: 'Hungria', code: 'HUN', iso: 'hu' },
  { name: 'Bulgaria', code: 'BUL', iso: 'bg' },
  { name: 'Eslovenia', code: 'SVN', iso: 'si' },
  { name: 'Albania', code: 'ALB', iso: 'al' },
  { name: 'Finlandia', code: 'FIN', iso: 'fi' },
  { name: 'Italia', code: 'ITA', iso: 'it' },
  { name: 'Indonesia', code: 'IDN', iso: 'id' },
  { name: 'Bahrein', code: 'BHR', iso: 'bh' },
  { name: 'Trinidad e Tobago', code: 'TRI', iso: 'tt' },
  { name: 'Burkina Faso', code: 'BFA', iso: 'bf' },
  { name: 'Guine', code: 'GUI', iso: 'gn' },
  { name: 'Benin', code: 'BEN', iso: 'bj' },
];

export default function AdminTimesPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [error, setError] = useState('');

  // Editable fields per team
  const [edits, setEdits] = useState<Record<number, { name: string; code: string }>>({});

  useEffect(() => {
    fetch('/api/admin/teams')
      .then(r => r.json())
      .then(data => {
        setTeams(data.teams || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const placeholderTeams = teams.filter(t =>
    t.code.startsWith('PL') || t.code.startsWith('PI')
  );

  const handleSelectKnown = (teamId: number, knownCode: string) => {
    const known = KNOWN_TEAMS.find(k => k.code === knownCode);
    if (known) {
      setEdits(prev => ({
        ...prev,
        [teamId]: { name: known.name, code: known.code },
      }));
    }
  };

  const handleSave = async (teamId: number) => {
    const edit = edits[teamId];
    if (!edit || !edit.name || !edit.code) {
      setError('Selecione um time antes de salvar.');
      return;
    }

    setSaving(teamId);
    setError('');
    try {
      const res = await fetch('/api/admin/teams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, name: edit.name, code: edit.code }),
      });

      if (res.ok) {
        const data = await res.json();
        setTeams(prev => prev.map(t => t.id === teamId ? data.team : t));
        setSaved(teamId);
        setTimeout(() => setSaved(null), 3000);
        // Clear edit
        setEdits(prev => {
          const next = { ...prev };
          delete next[teamId];
          return next;
        });
      } else {
        const errData = await res.json();
        setError(errData.error || 'Erro ao salvar.');
      }
    } catch {
      setError('Erro de conexao.');
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-emerald-800 mb-2">Atualizar Times</h1>
      <p className="text-sm text-gray-500 mb-6">
        Substitua os placeholders dos playoffs pelos times classificados.
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {placeholderTeams.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
          <p className="text-emerald-700 font-medium">Todos os times ja foram definidos!</p>
          <p className="text-sm text-emerald-600 mt-1">Nenhum placeholder restante.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {placeholderTeams.map(team => {
            const edit = edits[team.id];
            const isPlaceholder = team.code.startsWith('PL') || team.code.startsWith('PI');
            return (
              <div key={team.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Flag code={team.code} emoji={team.flagEmoji} size={24} />
                    <div>
                      <span className="font-medium text-gray-800">{team.name}</span>
                      <span className="text-xs text-gray-400 ml-2">({team.code})</span>
                    </div>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">
                    Grupo {team.groupLabel}
                  </span>
                </div>

                {isPlaceholder && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={edit?.code || ''}
                      onChange={(e) => handleSelectKnown(team.id, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="">Selecione o time classificado...</option>
                      {KNOWN_TEAMS.map(k => (
                        <option key={k.code} value={k.code}>
                          {k.name} ({k.code})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleSave(team.id)}
                      disabled={saving === team.id || !edit}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-medium rounded-lg text-sm transition-colors"
                    >
                      {saving === team.id ? 'Salvando...' : saved === team.id ? 'Salvo!' : 'Confirmar'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info about flag-codes.ts */}
      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs text-amber-700">
          <strong>Nota:</strong> Apos atualizar um time, a bandeira sera exibida automaticamente
          se o codigo FIFA estiver mapeado. Se a bandeira nao aparecer, adicione o mapeamento
          no arquivo <code className="bg-amber-100 px-1 rounded">lib/flag-codes.ts</code>.
        </p>
      </div>
    </div>
  );
}
