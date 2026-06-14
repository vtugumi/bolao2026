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
import SimulatedR32 from '@/components/SimulatedR32';

/* eslint-disable @typescript-eslint/no-explicit-any */

type TabType = 'today' | 'upcoming' | 'groups' | 'knockout';

// Group matches by FIFA matchday date (venue timezone, approximated as UTC-7 for WC 2026)
function groupMatchesByDate(matches: any[]): { date: string; label: string; matches: any[] }[] {
  const groups: Record<string, any[]> = {};
  for (const m of matches) {
    const d = new Date(m.dateTime);
    const key = d.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  }
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const tomorrowStr = new Date(now.getTime() + 86400000).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  return Object.entries(groups).map(([date, matches]) => {
    const d = new Date(date + 'T12:00:00');
    let label: string;
    if (date === todayStr) label = 'Hoje';
    else if (date === tomorrowStr) label = 'Amanha';
    else label = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
    return { date, label, matches };
  });
}

export default function JogosPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [selectedGroup, setSelectedGroup] = useState('A');
  const [selectedStage, setSelectedStage] = useState('R32');
  const [matches, setMatches] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [isSimulated, setIsSimulated] = useState(false);
  const [predictedCount, setPredictedCount] = useState(0);
  const [totalGroupMatches, setTotalGroupMatches] = useState(0);
  const [simulatedKnockout, setSimulatedKnockout] = useState<any[]>([]);
  const [matchOdds, setMatchOdds] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab === 'today') {
        params.set('view', 'today');
      } else if (activeTab === 'upcoming') {
        params.set('view', 'upcoming');
      } else if (activeTab === 'groups') {
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
  // If user is logged in, use simulated standings (predictions + real results)
  const fetchStandings = useCallback(async () => {
    if (activeTab !== 'groups') return;
    try {
      if (user) {
        // Use simulated endpoint (blends real results + user predictions)
        const res = await fetch(`/api/groups/${selectedGroup}/simulated`);
        if (res.ok) {
          const data = await res.json();
          setStandings(data.standings || []);
          setIsSimulated(data.isSimulated || false);
          setPredictedCount(data.predictedCount || 0);
          setTotalGroupMatches(data.totalMatches || 0);
          return;
        }
      }
      // Fallback to official standings
      const res = await fetch(`/api/groups/${selectedGroup}`);
      if (res.ok) {
        const data = await res.json();
        setStandings(Array.isArray(data) ? data : []);
        setIsSimulated(false);
      }
    } catch {
      setStandings([]);
      setIsSimulated(false);
    }
  }, [activeTab, selectedGroup, user]);

  useEffect(() => {
    fetchStandings();
  }, [fetchStandings]);

  // Fetch odds for current matches
  const fetchOdds = useCallback(async () => {
    if (!user) return;
    if (activeTab === 'today' || activeTab === 'upcoming') {
      // For date views, fetch odds per match after matches load
      return;
    }
    try {
      const params = new URLSearchParams();
      if (activeTab === 'groups') {
        params.set('stage', 'GROUP');
        params.set('groupLabel', selectedGroup);
      } else {
        params.set('stage', selectedStage);
      }
      const res = await fetch(`/api/matches/odds?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const oddsMap: Record<number, any> = {};
        for (const item of data) {
          oddsMap[item.matchId] = item;
        }
        setMatchOdds(oddsMap);
      }
    } catch {
      // odds are optional, don't block UI
    }
  }, [activeTab, selectedGroup, selectedStage, user]);

  useEffect(() => {
    fetchOdds();
  }, [fetchOdds]);

  // Fetch simulated knockout data when in knockout tab
  const fetchSimulatedKnockout = useCallback(async () => {
    if (activeTab !== 'knockout' || !user) return;
    try {
      const res = await fetch('/api/predictions/simulated-bracket');
      if (res.ok) {
        const data = await res.json();
        setSimulatedKnockout(data.allKnockout || []);
      }
    } catch {
      setSimulatedKnockout([]);
    }
  }, [activeTab, user]);

  useEffect(() => {
    fetchSimulatedKnockout();
  }, [fetchSimulatedKnockout]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const handleSavePrediction = async (
    matchId: number,
    data: { homeScore: number; awayScore: number; winnerId?: number; simulatedHomeTeamId?: number; simulatedAwayTeamId?: number }
  ) => {
    try {
      // Find the match to check if it has simulated teams
      const match = matches.find((m: any) => m.id === matchId);
      const simMatch = simulatedKnockout.find((s: any) => s.matchNumber === match?.matchNumber);
      const body: any = { matchId, ...data };
      if (simMatch && !match?.homeTeam?.id) {
        if (simMatch.homeTeam) body.simulatedHomeTeamId = simMatch.homeTeam.id;
        if (simMatch.awayTeam) body.simulatedAwayTeamId = simMatch.awayTeam.id;
      }

      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const savedPrediction = await res.json();
        // Update only the affected match locally (no full refetch)
        setMatches(prev => prev.map((m: any) =>
          m.id === matchId
            ? { ...m, userPrediction: savedPrediction }
            : m
        ));
        // Refresh standings and odds in background (doesn't block UI)
        if (activeTab === 'groups') {
          setTimeout(() => { fetchStandings(); fetchOdds(); }, 800);
        } else {
          setTimeout(() => { fetchSimulatedKnockout(); fetchOdds(); }, 800);
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
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        {([
          { key: 'today' as TabType, label: 'Jogos do Dia' },
          { key: 'upcoming' as TabType, label: 'Proximos Jogos' },
          { key: 'groups' as TabType, label: 'Fase de Grupos' },
          { key: 'knockout' as TabType, label: 'Mata-mata' },
        ]).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 md:px-6 py-3 font-semibold text-sm transition-colors whitespace-nowrap ${activeTab === tab.key ? 'border-b-2 border-emerald-600 text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Navigation - only for groups/knockout */}
      {activeTab === 'groups' && (
        <GroupNav activeGroup={selectedGroup} onGroupChange={setSelectedGroup} />
      )}
      {activeTab === 'knockout' && (
        <StageNav activeStage={selectedStage} onStageChange={setSelectedStage} />
      )}

      {/* Content */}
      <div className="mt-6">
        {(activeTab === 'today' || activeTab === 'upcoming') ? (
          /* === JOGOS DO DIA / PROXIMOS === */
          <div className="max-w-3xl mx-auto">
            {loading ? (
              <div className="flex justify-center py-12"><LoadingSpinner /></div>
            ) : matches.length === 0 ? (
              <p className="text-center text-gray-500 py-12">
                {activeTab === 'today' ? 'Nenhum jogo hoje.' : 'Nenhum jogo futuro encontrado.'}
              </p>
            ) : (
              groupMatchesByDate(matches).map(group => (
                <div key={group.date} className="mb-8">
                  <h2 className="text-lg font-bold text-emerald-700 mb-3 capitalize border-b border-emerald-100 pb-1">
                    {group.label}
                    <span className="text-sm font-normal text-gray-400 ml-2">
                      {group.matches.length} {group.matches.length === 1 ? 'jogo' : 'jogos'}
                    </span>
                  </h2>
                  <div className="space-y-4">
                    {group.matches.map((match: any) => (
                      <MatchCard key={match.id} match={match} showPrediction={!!user} odds={matchOdds[match.id] || null} onSavePrediction={handleSavePrediction} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : activeTab === 'groups' ? (
          /* === GRUPOS: 2 colunas (jogos + tabela) === */
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-4">
              {loading ? (
                <div className="flex justify-center py-12"><LoadingSpinner /></div>
              ) : matches.length === 0 ? (
                <p className="text-center text-gray-500 py-12">Nenhum jogo encontrado.</p>
              ) : (
                matches.map((match: any) => (
                  <MatchCard key={match.id} match={match} showPrediction={!!user} odds={matchOdds[match.id] || null} onSavePrediction={handleSavePrediction} />
                ))
              )}
            </div>
            <div className="lg:col-span-2">
              <div className="sticky top-4">
                <GroupStandingsTable
                  standings={standings}
                  groupLabel={selectedGroup}
                  isSimulated={isSimulated}
                  predictedCount={predictedCount}
                  totalMatches={totalGroupMatches}
                />
              </div>
            </div>
          </div>
        ) : (
          /* === MATA-MATA: simulacao + bracket + jogos === */
          <div className="space-y-6">
            {/* SimulatedR32 removido - times simulados já aparecem nos cards */}
            <KnockoutBracket activeStage={selectedStage} onMatchClick={(_matchId, stage) => setSelectedStage(stage)} simulatedMatches={simulatedKnockout} />
            <div className="max-w-3xl mx-auto space-y-4">
              {loading ? (
                <div className="flex justify-center py-12"><LoadingSpinner /></div>
              ) : matches.length === 0 ? (
                <p className="text-center text-gray-500 py-12">Nenhum jogo encontrado.</p>
              ) : (
                matches.map((match: any) => {
                  // Overlay simulated teams when real teams aren't set
                  const simMatch = simulatedKnockout.find((s: any) => s.matchNumber === match.matchNumber);
                  const enrichedMatch = { ...match };
                  if (simMatch) {
                    if (!match.homeTeam && simMatch.homeTeam) {
                      enrichedMatch.homeTeam = { ...simMatch.homeTeam, simulated: true };
                      enrichedMatch.simulatedHomeTeamId = simMatch.homeTeam.id;
                    }
                    if (!match.awayTeam && simMatch.awayTeam) {
                      enrichedMatch.awayTeam = { ...simMatch.awayTeam, simulated: true };
                      enrichedMatch.simulatedAwayTeamId = simMatch.awayTeam.id;
                    }
                  }
                  return <MatchCard key={match.id} match={enrichedMatch} showPrediction={!!user} odds={matchOdds[match.id] || null} onSavePrediction={handleSavePrediction} />;
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
