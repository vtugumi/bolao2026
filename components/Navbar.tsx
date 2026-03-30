'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
  };

  return (
    <nav className="bg-emerald-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="text-xl font-bold tracking-tight hover:text-emerald-200 transition-colors"
          >
            Bolao Copa 2026
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-6">
            {!loading && user && (
              <>
                <Link
                  href="/jogos"
                  className="hover:text-emerald-200 transition-colors"
                >
                  Jogos
                </Link>
                <Link
                  href="/classificacao"
                  className="hover:text-emerald-200 transition-colors"
                >
                  Classificacao
                </Link>
                <Link
                  href="/palpites"
                  className="hover:text-emerald-200 transition-colors"
                >
                  Palpites
                </Link>
                <Link
                  href="/ranking"
                  className="hover:text-emerald-200 transition-colors"
                >
                  Ranking
                </Link>
                <Link
                  href="/grupos"
                  className="hover:text-emerald-200 transition-colors"
                >
                  Grupos
                </Link>
                {user.isAdmin && (
                  <Link
                    href="/admin"
                    className="hover:text-emerald-200 transition-colors font-semibold"
                  >
                    Admin
                  </Link>
                )}
              </>
            )}

            {!loading && !user && (
              <>
                <Link
                  href="/login"
                  className="hover:text-emerald-200 transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/registro"
                  className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg transition-colors"
                >
                  Registro
                </Link>
              </>
            )}

            {!loading && user && (
              <div className="flex items-center gap-4">
                <span className="text-emerald-200 text-sm">
                  {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-emerald-700 hover:bg-emerald-600 px-3 py-1.5 rounded-lg text-sm transition-colors"
                >
                  Sair
                </button>
              </div>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-emerald-700 transition-colors"
            aria-label="Abrir menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {!loading && user && (
              <>
                <Link
                  href="/jogos"
                  className="block py-2 px-3 rounded-lg hover:bg-emerald-700 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Jogos
                </Link>
                <Link
                  href="/classificacao"
                  className="block py-2 px-3 rounded-lg hover:bg-emerald-700 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Classificacao
                </Link>
                <Link
                  href="/palpites"
                  className="block py-2 px-3 rounded-lg hover:bg-emerald-700 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Palpites
                </Link>
                <Link
                  href="/ranking"
                  className="block py-2 px-3 rounded-lg hover:bg-emerald-700 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Ranking
                </Link>
                <Link
                  href="/grupos"
                  className="block py-2 px-3 rounded-lg hover:bg-emerald-700 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Grupos
                </Link>
                {user.isAdmin && (
                  <Link
                    href="/admin"
                    className="block py-2 px-3 rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
                    onClick={() => setMenuOpen(false)}
                  >
                    Admin
                  </Link>
                )}
                <div className="border-t border-emerald-700 pt-2 mt-2">
                  <span className="block py-2 px-3 text-emerald-200 text-sm">
                    {user.name}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left py-2 px-3 rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Sair
                  </button>
                </div>
              </>
            )}

            {!loading && !user && (
              <>
                <Link
                  href="/login"
                  className="block py-2 px-3 rounded-lg hover:bg-emerald-700 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/registro"
                  className="block py-2 px-3 rounded-lg hover:bg-emerald-700 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Registro
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
