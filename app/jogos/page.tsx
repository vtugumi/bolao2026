'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import LoadingSpinner from '@/components/LoadingSpinner';
import MatchCard from '@/components/MatchCard';
import GroupNav from '@/components/GroupNav';
import StageNav from '@/components/StageNav';
import GroupStandingsTable from '@/components/GroupStandingsTable';
import KnockoutBracket from '@/components/KnockoutBracket';
import BonusSection from '@/components/BonusSection';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function JogosPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'groups' | 'knockout'>('groups');
  const [selectedGroup, setSelectedGroup] = useState('A');
  const [selectedStage, setSelectedStage] = useState('R32');
  const [matches, setMatches] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab === 'groups') {
        params.set('stage', 'GROUP');
        params.set('groupLabel', selectedGroup);
      } else {
        params.set('stage', selectedStage);
      }
      const res = await fetch(`/api/matches?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMatches(Array.isArray(data) ? data : data.matches || []);
      }
    } catch (err) {
      console.error('Erro ao carregar jogos:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedGroup, selectedStage]);

  // Fetch group standings when in groups tab
  useEffect(() => {
    if (activeTab !== 'groups') return;
    fetch(`/api/groups/${selectedGroup}`)
      .then(r => r.json())
      .then(data => setStandings(Array.isArray(data) ? data : []))
      .catch(() => setStandings([]));
  }, [activeTab, selectedGroup]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const handleSavePrediction = async (
    matchId: number,
    data: { homeScore: number; awayScore: number; winnerId?: number }
  ) => {
    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, ...data }),
      });
      if (res.ok) {
        await fetchMatches();
        // Refresh standings too
        if (activeTab === 'groups') {
          const sr = await fetch(`/api/groups/${selectedGroup}`);
          if (sr.ok) setStandings(await sr.json());
        }
      }
    } catch (err) {
      console.error('Erro ao salvar palpite:', err);
    }
  };

  return (
    <div className={`mx-auto px-4 py-6 ${activeTab === 'knockout' ? 'max-w-[1400px]' : 'max-w-7xl'}`}>
      <h1 className="text-2xl md:text-3xl font-bold text-emerald-800 mb-4">Jogos</h1>

      {/* Bonus Section - collapsible */}
      {user && <BonusSection />}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button onClick={() => setActiveTab('groups')}
          className={`px-6 py-3 font-semibold text-sm transition-colors ${activeTab === 'groups' ? 'border-b-2 border-emerald-600 text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}>
          Fase de Grupos
        </button>
        <button onClick={() => setActiveTab('knockout')}
          className={`px-6 py-3 font-semibold text-sm transition-colors ${activeTab === 'knockout' ? 'border-b-2 border-emerald-600 text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}>
          Mata-mata
        </button>
      </div>

      {/* Navigation */}
      {activeTab === 'groups' ? (
        <GroupNav activeGroup={selectedGroup} onGroupChange={setSelectedGroup} />
      ) : (
        <StageNav activeStage={selectedStage} onStageChange={setSelectedStage} />
      )}

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'groups' ? (
          /* === GRUPOS: 2 colunas (jogos + tabela) === */
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-4">
              {loading ? (
                <div className="flex justify-center py-12"><LoadingSpinner /></div>
              ) : matches.length === 0 ? (
                <p className="text-center text-gray-500 py-12">Nenhum jogo encontrado.</p>
              ) : (
                matches.map((match: any) => (
                  <MatchCard key={match.id} match={match} showPrediction={!!user} onSavePrediction={handleSavePrediction} />
                ))
              )}
            </div>
            <div className="lg:col-span-2">
              <div className="sticky top-4">
                <GroupStandingsTable standings={standings} groupLabel={selectedGroup} />
              </div>
            </div>
          </div>
        ) : (
          /* === MATA-MATA: bracket em cima, jogos embaixo === */
          <div className="space-y-6">
            <KnockoutBracket activeStage={selectedStage} onMatchClick={(_matchId, stage) => setSelectedStage(stage)} />
            <div className="max-w-3xl mx-auto space-y-4">
              {loading ? (
                <div className="flex justify-center py-12"><LoadingSpinner /></div>
              ) : matches.length === 0 ? (
                <p className="text-center text-gray-500 py-12">Nenhum jogo encontrado.</p>
              ) : (
                matches.map((match: any) => (
                  <MatchCard key={match.id} match={match} showPrediction={!!user} onSavePrediction={handleSavePrediction} />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
