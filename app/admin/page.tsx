'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

interface AdminStats {
  totalUsers?: number;
  totalMatches?: number;
  matchesWithResults?: number;
  totalPredictions?: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, matchesRes] = await Promise.all([
          fetch('/api/admin/users'),
          fetch('/api/matches'),
        ]);

        const statsData: AdminStats = {};

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          statsData.totalUsers = (usersData.users || usersData || []).length;
        }

        if (matchesRes.ok) {
          const matchesData = await matchesRes.json();
          const matches = matchesData.matches || matchesData || [];
          statsData.totalMatches = matches.length;
          statsData.matchesWithResults = matches.filter(
            (m: { homeScore: number | null }) => m.homeScore !== null
          ).length;
        }

        setStats(statsData);
      } catch (err) {
        console.error('Erro ao carregar estatisticas:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-emerald-800 mb-6">
        Painel Administrativo
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-sm text-gray-500">Usuarios</p>
          <p className="text-2xl font-bold text-emerald-700">
            {stats.totalUsers ?? '-'}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-sm text-gray-500">Jogos</p>
          <p className="text-2xl font-bold text-emerald-700">
            {stats.totalMatches ?? '-'}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-sm text-gray-500">Com Resultado</p>
          <p className="text-2xl font-bold text-emerald-700">
            {stats.matchesWithResults ?? '-'}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-sm text-gray-500">Sem Resultado</p>
          <p className="text-2xl font-bold text-emerald-700">
            {stats.totalMatches !== undefined && stats.matchesWithResults !== undefined
              ? stats.totalMatches - stats.matchesWithResults
              : '-'}
          </p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link
          href="/admin/resultados"
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-emerald-200 transition-colors"
        >
          <h3 className="font-bold text-lg text-emerald-800 mb-2">
            Resultados
          </h3>
          <p className="text-gray-500 text-sm">
            Inserir e editar resultados dos jogos.
          </p>
        </Link>

        <Link
          href="/admin/bonus"
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-emerald-200 transition-colors"
        >
          <h3 className="font-bold text-lg text-emerald-800 mb-2">Bonus</h3>
          <p className="text-gray-500 text-sm">
            Definir campeao, vice e artilheiro oficiais.
          </p>
        </Link>

        <Link
          href="/admin/compartilhar"
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-emerald-200 transition-colors"
        >
          <h3 className="font-bold text-lg text-emerald-800 mb-2">📱 Compartilhar</h3>
          <p className="text-gray-500 text-sm">
            Gerar mensagem com palpites para WhatsApp/email.
          </p>
        </Link>

        <Link
          href="/admin/times"
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-emerald-200 transition-colors"
        >
          <h3 className="font-bold text-lg text-emerald-800 mb-2">🏳️ Times</h3>
          <p className="text-gray-500 text-sm">
            Atualizar times dos playoffs com os classificados.
          </p>
        </Link>

        <Link
          href="/ranking"
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-emerald-200 transition-colors"
        >
          <h3 className="font-bold text-lg text-emerald-800 mb-2">Ranking</h3>
          <p className="text-gray-500 text-sm">
            Visualizar o ranking geral dos participantes.
          </p>
        </Link>
      </div>
    </div>
  );
}
