'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh]">
      {/* Hero */}
      <section className="bg-gradient-to-br from-emerald-700 to-emerald-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4">
            Bolao Copa do Mundo 2026
          </h1>
          <p className="text-lg md:text-xl text-emerald-100 mb-8 max-w-2xl mx-auto">
            Faca seus palpites para todos os jogos da Copa do Mundo 2026 e
            dispute com seus amigos para ver quem entende mais de futebol!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link
                href="/jogos"
                className="bg-white text-emerald-800 font-bold px-8 py-3 rounded-xl hover:bg-emerald-50 transition-colors text-lg"
              >
                Ir para Meus Palpites
              </Link>
            ) : (
              <>
                <Link
                  href="/registro"
                  className="bg-white text-emerald-800 font-bold px-8 py-3 rounded-xl hover:bg-emerald-50 transition-colors text-lg"
                >
                  Criar Conta
                </Link>
                <Link
                  href="/login"
                  className="border-2 border-white text-white font-bold px-8 py-3 rounded-xl hover:bg-white/10 transition-colors text-lg"
                >
                  Entrar
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Passo a passo */}
      <section className="max-w-4xl mx-auto py-12 px-4">
        <h2 className="text-3xl font-bold text-center mb-10 text-emerald-800">
          Como Funciona
        </h2>

        <div className="space-y-4">
          {/* Passo 1 */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex gap-4">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 mt-0.5">
              1
            </div>
            <div>
              <h3 className="font-bold text-emerald-800 mb-1">Cadastre-se e entre no grupo</h3>
              <p className="text-gray-600 text-sm">
                Crie sua conta com nome e e-mail. Depois, entre no seu grupo usando o
                codigo de convite que o administrador vai te enviar. Voce pode participar
                de varios grupos ao mesmo tempo (familia, amigos, trabalho...).
              </p>
            </div>
          </div>

          {/* Passo 2 */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-amber-200 flex gap-4">
            <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 mt-0.5">
              2
            </div>
            <div>
              <h3 className="font-bold text-amber-800 mb-1">Palpites Bonus (antes da Copa comecar!)</h3>
              <p className="text-gray-600 text-sm">
                Sua primeira missao: escolha quem sera o <strong>campeao</strong>, o <strong>vice-campeao</strong> e
                o <strong>artilheiro</strong> da Copa. Esses palpites valem pontos extras e precisam ser
                feitos <strong>antes do primeiro jogo da Copa</strong> — depois disso, ficam bloqueados.
              </p>
            </div>
          </div>

          {/* Passo 3 */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex gap-4">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 mt-0.5">
              3
            </div>
            <div>
              <h3 className="font-bold text-emerald-800 mb-1">Palpites da Fase de Grupos</h3>
              <p className="text-gray-600 text-sm">
                Palpite o placar exato de cada jogo dos 12 grupos. Voce pode fazer seus
                palpites a qualquer momento — eles ficam abertos ate o <strong>inicio de cada
                jogo</strong>. Comecou a partida? Seu palpite e bloqueado automaticamente.
                Os palpites sao salvos automaticamente, sem precisar clicar em nenhum botao.
              </p>
            </div>
          </div>

          {/* Passo 4 */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex gap-4">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 mt-0.5">
              4
            </div>
            <div>
              <h3 className="font-bold text-emerald-800 mb-1">Fase de Mata-mata</h3>
              <p className="text-gray-600 text-sm">
                Apos a ultima rodada de cada grupo, os confrontos do mata-mata sao definidos
                e os jogos aparecem automaticamente. Voce palpita o placar ate o inicio de cada jogo.
              </p>
              <div className="mt-2 bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
                <p><strong>Importante:</strong> No mata-mata, seu palpite vale apenas para o
                  tempo regulamentar (90 minutos).</p>
                <p>Se voce palpitar empate (ex: 1x1), precisa escolher qual selecao
                  se classifica nos penaltis.</p>
                <p>Se palpitar placar com vencedor (ex: 2x1), a classificacao e automatica.</p>
              </div>
            </div>
          </div>

          {/* Passo 5 */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex gap-4">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 mt-0.5">
              5
            </div>
            <div>
              <h3 className="font-bold text-emerald-800 mb-1">Acompanhe os Palpites do Grupo</h3>
              <p className="text-gray-600 text-sm">
                Apos o inicio de cada jogo, toque no card da partida para ver os palpites
                de todos os participantes do seu grupo. Quando o jogo termina, voce ve quantos
                pontos cada um ganhou. Antes do jogo, os palpites ficam ocultos para ninguem copiar!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pontuacao */}
      <section className="bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-emerald-800">
            Pontuacao
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Fase de Grupos */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-emerald-700 mb-3 text-center">Fase de Grupos</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Placar exato</span>
                  <span className="bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full text-xs font-bold">5 pts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Acertou resultado (V/E/D)</span>
                  <span className="bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-bold">2 pts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Errou tudo</span>
                  <span className="bg-red-200 text-red-800 px-2 py-0.5 rounded-full text-xs font-bold">1 pt</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Sem palpite</span>
                  <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs font-bold">0 pts</span>
                </div>
              </div>
            </div>

            {/* Mata-mata */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-emerald-700 mb-3 text-center">Mata-mata</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Placar exato + classificado</span>
                  <span className="bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full text-xs font-bold">8 pts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Acertou classificado</span>
                  <span className="bg-green-200 text-green-800 px-2 py-0.5 rounded-full text-xs font-bold">5 pts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Errou tudo</span>
                  <span className="bg-red-200 text-red-800 px-2 py-0.5 rounded-full text-xs font-bold">1 pt</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Sem palpite</span>
                  <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs font-bold">0 pts</span>
                </div>
              </div>
            </div>

            {/* Bonus */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-amber-200">
              <h3 className="font-bold text-amber-700 mb-3 text-center">Bonus</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Campeao correto</span>
                  <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full text-xs font-bold">20 pts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Vice-campeao correto</span>
                  <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full text-xs font-bold">15 pts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Artilheiro correto</span>
                  <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full text-xs font-bold">15 pts</span>
                </div>
              </div>
              <p className="text-[10px] text-amber-600 mt-3 text-center italic">
                Deve ser feito antes do 1o jogo da Copa
              </p>
            </div>
          </div>

          {/* Ranking explanation */}
          <div className="mt-8 bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
            <h3 className="font-bold text-emerald-700 mb-2">Ranking</h3>
            <p className="text-sm text-gray-600">
              Acompanhe o ranking do seu grupo em tempo real. A pontuacao e somada a cada
              jogo encerrado. Em caso de empate, desempata por: numero de placares exatos,
              bonus acertados e pontos no mata-mata.
            </p>
          </div>
        </div>
      </section>

      {/* CTA final */}
      {!user && (
        <section className="py-12 px-4 text-center">
          <h2 className="text-2xl font-bold text-emerald-800 mb-3">Pronto para jogar?</h2>
          <p className="text-gray-600 mb-6">Cadastre-se agora e comece a fazer seus palpites!</p>
          <Link
            href="/registro"
            className="bg-emerald-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-emerald-700 transition-colors text-lg inline-block"
          >
            Criar Minha Conta
          </Link>
        </section>
      )}
    </div>
  );
}
