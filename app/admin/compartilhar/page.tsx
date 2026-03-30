'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import Flag from '@/components/Flag';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function CompartilharPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [shareMessage, setShareMessage] = useState('');
  const [sharingId, setSharingId] = useState<number | string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/matches').then(r => r.json()),
      fetch('/api/groups/private').then(r => r.ok ? r.json() : []),
    ]).then(([matchData, groupData]) => {
      const arr = Array.isArray(matchData) ? matchData : matchData.matches || [];
      const sorted = arr
        .filter((m: any) => m.homeTeam && m.awayTeam)
        .sort((a: any, b: any) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
      setMatches(sorted);
      setGroups(Array.isArray(groupData) ? groupData : []);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const groupParam = selectedGroup ? `&groupId=${selectedGroup}` : '';
  const selectedGroupName = groups.find((g: any) => String(g.id) === selectedGroup)?.name || '';

  const handleShare = async (matchId: number) => {
    setSharingId(matchId);
    setShareMessage('');
    setCopied(false);
    try {
      const res = await fetch(`/api/admin/share?matchId=${matchId}${groupParam}`);
      if (res.ok) {
        const data = await res.json();
        setShareMessage(data.message);
      } else {
        setShareMessage('Erro ao gerar mensagem');
      }
    } catch {
      setShareMessage('Erro ao gerar mensagem');
    }
  };

  const handleShareBonus = async () => {
    setSharingId('bonus');
    setShareMessage('');
    setCopied(false);
    try {
      const res = await fetch(`/api/admin/share?type=bonus${groupParam}`);
      if (res.ok) {
        const data = await res.json();
        setShareMessage(data.message);
      } else {
        setShareMessage('Erro ao gerar mensagem');
      }
    } catch {
      setShareMessage('Erro ao gerar mensagem');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleWhatsApp = () => {
    const encoded = encodeURIComponent(shareMessage);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  if (loading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-emerald-800 mb-4">Compartilhar Palpites</h1>

      {/* Group selector */}
      <div className="mb-6 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Selecione o grupo</label>
        <select
          value={selectedGroup}
          onChange={(e) => { setSelectedGroup(e.target.value); setShareMessage(''); setSharingId(null); }}
          className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm"
        >
          <option value="">Todos os participantes</option>
          {groups.map((g: any) => (
            <option key={g.id} value={String(g.id)}>{g.name}</option>
          ))}
        </select>
        {selectedGroup && (
          <p className="text-xs text-emerald-600 mt-1">Filtrando palpites de: <strong>{selectedGroupName}</strong></p>
        )}
      </div>

      {/* Bonus button */}
      <div className="mb-6">
        <button
          onClick={handleShareBonus}
          className={`w-full text-left bg-white rounded-xl p-4 shadow-sm border transition-colors ${
            sharingId === 'bonus' ? 'border-amber-400 bg-amber-50' : 'border-gray-100 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-amber-700">🏆 Palpites Bonus</span>
              <p className="text-xs text-gray-500 mt-0.5">
                Campeao, vice e artilheiro {selectedGroup ? `do grupo ${selectedGroupName}` : 'de todos os participantes'}
              </p>
            </div>
            <span className="text-amber-600 text-sm font-medium">Gerar →</span>
          </div>
        </button>
      </div>

      {/* Match list */}
      <h2 className="text-lg font-semibold text-gray-700 mb-3">Jogos</h2>
      <div className="space-y-2 mb-6 max-h-[400px] overflow-y-auto">
        {matches.map((m: any) => {
          const started = new Date(m.dateTime) <= new Date();
          return (
            <button
              key={m.id}
              onClick={() => handleShare(m.id)}
              className={`w-full text-left bg-white rounded-lg p-3 shadow-sm border transition-colors ${
                sharingId === m.id ? 'border-emerald-400 bg-emerald-50' : 'border-gray-100 hover:border-emerald-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-6">#{m.matchNumber}</span>
                  <Flag code={m.homeTeam?.code} emoji={m.homeTeam?.flagEmoji} size={16} />
                  <span className="text-sm font-medium">{m.homeTeam?.name}</span>
                  <span className="text-xs text-gray-400">vs</span>
                  <Flag code={m.awayTeam?.code} emoji={m.awayTeam?.flagEmoji} size={16} />
                  <span className="text-sm font-medium">{m.awayTeam?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {started && <span className="text-[10px] text-red-400">🔒</span>}
                  <span className="text-emerald-600 text-sm">Gerar →</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Generated message */}
      {shareMessage && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="font-semibold text-gray-700 text-sm">Mensagem gerada</span>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-xs font-medium transition-colors"
              >
                {copied ? '✅ Copiado!' : '📋 Copiar'}
              </button>
              <button
                onClick={handleWhatsApp}
                className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors"
              >
                📱 WhatsApp
              </button>
            </div>
          </div>
          <pre className="p-4 text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed max-h-[400px] overflow-y-auto">
            {shareMessage}
          </pre>
        </div>
      )}
    </div>
  );
}
