'use client'

import { useState, useEffect, useMemo } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner'
import Link from 'next/link'

interface Group {
  id: number
  name: string
}

interface Member {
  name: string
  pts: number
  c: string | null
  v: string | null
  t: string | null
  f: string | null
  s: string | null
}

interface SimData {
  group: { id: number; name: string }
  semifinalists: { code: string; name: string; id: number }[]
  sf1: { home: string; away: string }
  sf2: { home: string; away: string }
  bonusPoints: {
    CHAMPION: number
    RUNNER_UP: number
    TOP_SCORER: number
    THIRD_PLACE: number
    FOURTH_PLACE: number
    BRAZIL_FIRST_GOAL: number
  }
  members: Member[]
}

const TEAM_COLORS: Record<string, [string, string, string]> = {
  FRA: ['#002395', '#FFFFFF', '#ED2939'],
  ESP: ['#AA151B', '#F1BF00', '#AA151B'],
  ENG: ['#FFFFFF', '#CF081F', '#FFFFFF'],
  ARG: ['#74ACDF', '#FFFFFF', '#74ACDF'],
  BRA: ['#009739', '#FEDD00', '#002776'],
  POR: ['#006600', '#FF0000', '#FF0000'],
  GER: ['#000000', '#DD0000', '#FFCE00'],
  NED: ['#AE1C28', '#FFFFFF', '#21468B'],
}

function TeamFlag({ code, size = 16 }: { code: string; size?: number }) {
  const colors = TEAM_COLORS[code]
  if (!colors) return <span className="text-[10px] font-bold text-gray-400">{code}</span>
  const h = size
  const w = Math.round(size * 1.4)
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="inline-block rounded-[2px] flex-shrink-0" style={{ boxShadow: '0 0 0 0.5px rgba(0,0,0,0.15)' }}>
      {code === 'ENG' ? (
        <>
          <rect width={w} height={h} fill="#FFFFFF" />
          <rect x={Math.round(w/2)-1.5} y={0} width={3} height={h} fill="#CF081F" />
          <rect x={0} y={Math.round(h/2)-1.5} width={w} height={3} fill="#CF081F" />
        </>
      ) : (
        <>
          <rect x={0} y={0} width={Math.round(w/3)} height={h} fill={colors[0]} />
          <rect x={Math.round(w/3)} y={0} width={Math.round(w/3)} height={h} fill={colors[1]} />
          <rect x={Math.round(w*2/3)} y={0} width={Math.round(w/3)+1} height={h} fill={colors[2]} />
        </>
      )}
    </svg>
  )
}

const TEAM_NAME: Record<string, string> = {
  FRA: 'Franca', ESP: 'Espanha', ENG: 'Inglaterra', ARG: 'Argentina',
}

const SCORERS = [
  { name: 'Mbappé', team: 'FRA', goals: 8 },
  { name: 'Messi', team: 'ARG', goals: 8 },
  { name: 'Kane', team: 'ENG', goals: 6 },
  { name: 'Bellingham', team: 'ENG', goals: 6 },
  { name: 'Dembélé', team: 'FRA', goals: 5 },
  { name: 'Oyarzabal', team: 'ESP', goals: 4 },
  { name: 'Yamal', team: 'ESP', goals: 3 },
  { name: 'Olise', team: 'FRA', goals: 2 },
]

function scorerMatches(prediction: string | null, scorerName: string): boolean {
  if (!prediction) return false
  const pred = prediction.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const scorer = scorerName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (pred.includes(scorer) || scorer.includes(pred)) return true
  if (scorerName === 'Kane' && prediction.toLowerCase().includes('kane')) return true
  if (scorerName === 'Mbappé' && (pred.includes('mbappe') || pred.includes('mbappe'))) return true
  if (scorerName === 'Bellingham' && pred.includes('bellingham')) return true
  if (scorerName === 'Dembélé' && pred.includes('dembele')) return true
  if (scorerName === 'Oyarzabal' && pred.includes('oyarzabal')) return true
  if (scorerName === 'Yamal' && pred.includes('yamal')) return true
  return false
}

export default function SimuladorPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>('')
  const [groupsLoaded, setGroupsLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SimData | null>(null)

  const [sf1Winner, setSf1Winner] = useState<string | null>(null)
  const [sf2Winner, setSf2Winner] = useState<string | null>(null)
  const [finalWinner, setFinalWinner] = useState<string | null>(null)
  const [thirdWinner, setThirdWinner] = useState<string | null>(null)
  const [scorer, setScorer] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetch('/api/groups/private')
      .then(r => r.ok ? r.json() : [])
      .then(d => {
        setGroups(d)
        if (d.length > 0) setSelectedGroup(String(d[0].id))
      })
      .finally(() => setGroupsLoaded(true))
  }, [])

  useEffect(() => {
    if (!groupsLoaded || !selectedGroup) { setLoading(false); return }
    setLoading(true)
    fetch(`/api/simulador?groupId=${selectedGroup}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); resetBracket() })
      .finally(() => setLoading(false))
  }, [selectedGroup, groupsLoaded])

  function resetBracket() {
    setSf1Winner(null); setSf2Winner(null)
    setFinalWinner(null); setThirdWinner(null)
    setScorer(null)
  }

  function handleSf1(team: string) {
    if (sf1Winner === team) return
    setSf1Winner(team)
    if (finalWinner && finalWinner !== team && finalWinner !== sf2Winner) {
      setFinalWinner(null); setThirdWinner(null)
    }
  }
  function handleSf2(team: string) {
    if (sf2Winner === team) return
    setSf2Winner(team)
    if (finalWinner && finalWinner !== sf1Winner && finalWinner !== team) {
      setFinalWinner(null); setThirdWinner(null)
    }
  }
  function handleFinal(team: string) {
    setFinalWinner(team); setThirdWinner(null)
  }
  function handleThird(team: string) {
    setThirdWinner(team)
  }

  const positions = useMemo(() => {
    if (!finalWinner || !thirdWinner || !data) return null
    const sf1Loser = sf1Winner === data.sf1.home ? data.sf1.away : data.sf1.home
    const sf2Loser = sf2Winner === data.sf2.home ? data.sf2.away : data.sf2.home
    const vice = finalWinner === sf1Winner ? sf2Winner! : sf1Winner!
    const fourth = thirdWinner === sf1Loser ? sf2Loser : sf1Loser
    return { champ: finalWinner, vice, third: thirdWinner, fourth }
  }, [finalWinner, thirdWinner, sf1Winner, sf2Winner, data])

  const ranked = useMemo(() => {
    if (!data) return []
    const bp = data.bonusPoints
    return data.members.map((m, i) => {
      let bonus = 0
      const details: string[] = []
      if (positions) {
        if (m.c === positions.champ) { bonus += bp.CHAMPION; details.push(`C+${bp.CHAMPION}`) }
        if (m.v === positions.vice) { bonus += bp.RUNNER_UP; details.push(`V+${bp.RUNNER_UP}`) }
        if (m.t === positions.third) { bonus += bp.THIRD_PLACE; details.push(`3+${bp.THIRD_PLACE}`) }
        if (m.f === positions.fourth) { bonus += bp.FOURTH_PLACE; details.push(`4+${bp.FOURTH_PLACE}`) }
      }
      if (scorer && scorerMatches(m.s, scorer)) {
        bonus += bp.TOP_SCORER; details.push(`A+${bp.TOP_SCORER}`)
      }
      return { ...m, bonus, total: m.pts + bonus, origRank: i + 1, details }
    }).sort((a, b) => b.total - a.total || a.origRank - b.origRank)
      .map((r, i) => ({ ...r, newRank: i + 1, change: r.origRank - (i + 1) }))
  }, [data, positions, scorer])

  const hasScenario = !!positions || !!scorer

  // Summary stats
  const summary = useMemo(() => {
    if (!positions || !data) return null
    const bp = data.bonusPoints
    const champCount = data.members.filter(m => m.c === positions.champ).length
    const viceCount = data.members.filter(m => m.v === positions.vice).length
    const maxBonus = Math.max(...ranked.map(r => r.bonus), 0)
    const maxBonusMember = ranked.find(r => r.bonus === maxBonus)
    const biggestJump = ranked.reduce((best, r) => r.change > best.change ? r : best, ranked[0])
    return { champCount, viceCount, maxBonus, maxBonusName: maxBonusMember?.name || '', biggestJump: biggestJump.change > 0 ? biggestJump : null }
  }, [positions, data, ranked])

  // Scorer bet counts
  const scorerBets = useMemo(() => {
    if (!data) return {}
    const counts: Record<string, number> = {}
    for (const s of SCORERS) {
      counts[s.name] = data.members.filter(m => scorerMatches(m.s, s.name)).length
    }
    return counts
  }, [data])

  if (groupsLoaded && groups.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-emerald-800 mb-4">Simulador</h1>
        <p className="text-gray-500 mb-6">Entre em um grupo para usar o simulador.</p>
        <Link href="/grupos" className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors">
          Ir para Grupos
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-emerald-800">Simulador</h1>
          <p className="text-sm text-gray-500">Monte cenarios e veja o impacto no ranking</p>
        </div>
        {groups.length > 1 && (
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-sm"
          >
            {groups.map(g => <option key={g.id} value={String(g.id)}>{g.name}</option>)}
          </select>
        )}
        {groups.length === 1 && <span className="text-sm text-gray-500">{groups[0].name}</span>}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : !data ? (
        <p className="text-center text-gray-500 py-12">Erro ao carregar dados.</p>
      ) : (
        <>
          {/* Bracket */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Monte o cenario</h2>
              <button onClick={resetBracket} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-2 py-1 rounded">
                Limpar
              </button>
            </div>

            {/* SF1 */}
            <div className="mb-1">
              <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Semifinal 1</div>
              <div className="flex gap-2 items-center">
                <TeamBtn code={data.sf1.home} selected={sf1Winner === data.sf1.home} locked={!!sf1Winner && sf1Winner !== data.sf1.home} onClick={() => handleSf1(data.sf1.home)} />
                <span className="text-xs text-gray-400 font-bold">vs</span>
                <TeamBtn code={data.sf1.away} selected={sf1Winner === data.sf1.away} locked={!!sf1Winner && sf1Winner !== data.sf1.away} onClick={() => handleSf1(data.sf1.away)} />
              </div>
            </div>

            {/* SF2 */}
            <div className="mb-3">
              <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1 mt-2">Semifinal 2</div>
              <div className="flex gap-2 items-center">
                <TeamBtn code={data.sf2.home} selected={sf2Winner === data.sf2.home} locked={!!sf2Winner && sf2Winner !== data.sf2.home} onClick={() => handleSf2(data.sf2.home)} />
                <span className="text-xs text-gray-400 font-bold">vs</span>
                <TeamBtn code={data.sf2.away} selected={sf2Winner === data.sf2.away} locked={!!sf2Winner && sf2Winner !== data.sf2.away} onClick={() => handleSf2(data.sf2.away)} />
              </div>
            </div>

            {/* Final */}
            {sf1Winner && sf2Winner && (
              <div className="mb-3 pt-3 border-t border-gray-100">
                <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Final</div>
                <div className="flex gap-2 items-center">
                  <TeamBtn code={sf1Winner} selected={finalWinner === sf1Winner} locked={!!finalWinner && finalWinner !== sf1Winner} onClick={() => handleFinal(sf1Winner)} />
                  <span className="text-xs text-gray-400 font-bold">vs</span>
                  <TeamBtn code={sf2Winner} selected={finalWinner === sf2Winner} locked={!!finalWinner && finalWinner !== sf2Winner} onClick={() => handleFinal(sf2Winner)} />
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {finalWinner && (
              <div className="mb-3">
                <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Terceiro Lugar</div>
                {(() => {
                  const sf1Loser = sf1Winner === data.sf1.home ? data.sf1.away : data.sf1.home
                  const sf2Loser = sf2Winner === data.sf2.home ? data.sf2.away : data.sf2.home
                  return (
                    <div className="flex gap-2 items-center">
                      <TeamBtn code={sf1Loser} selected={thirdWinner === sf1Loser} locked={!!thirdWinner && thirdWinner !== sf1Loser} onClick={() => handleThird(sf1Loser)} />
                      <span className="text-xs text-gray-400 font-bold">vs</span>
                      <TeamBtn code={sf2Loser} selected={thirdWinner === sf2Loser} locked={!!thirdWinner && thirdWinner !== sf2Loser} onClick={() => handleThird(sf2Loser)} />
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Positions result */}
            {positions && (
              <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-gray-100">
                <PositionSlot label="Campeao" code={positions.champ} pts={data.bonusPoints.CHAMPION} gold />
                <PositionSlot label="Vice" code={positions.vice} pts={data.bonusPoints.RUNNER_UP} />
                <PositionSlot label="3o Lugar" code={positions.third} pts={data.bonusPoints.THIRD_PLACE} />
                <PositionSlot label="4o Lugar" code={positions.fourth} pts={data.bonusPoints.FOURTH_PLACE} />
              </div>
            )}
          </div>

          {/* Scorer */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Artilheiro <span className="text-gray-300 normal-case font-normal">(+{data.bonusPoints.TOP_SCORER}pts)</span>
            </h2>
            <div className="grid grid-cols-4 gap-1.5">
              {SCORERS.map(s => (
                <button
                  key={s.name}
                  onClick={() => setScorer(scorer === s.name ? null : s.name)}
                  className={`px-2 py-1.5 rounded-lg border text-xs font-semibold text-center transition-all ${
                    scorer === s.name
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-amber-400'
                  }`}
                >
                  <span className="flex items-center justify-center gap-1"><TeamFlag code={s.team} size={12} /> {s.name}</span>
                  <span className="block text-[10px] text-gray-400">{s.goals} gols &middot; {scorerBets[s.name] || 0} ap.</span>
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <SummaryCard num={summary.champCount} label={`acertam campeao (+${data.bonusPoints.CHAMPION})`} />
              <SummaryCard num={summary.viceCount} label={`acertam vice (+${data.bonusPoints.RUNNER_UP})`} />
              <SummaryCard num={summary.maxBonus} label={`max bonus (${summary.maxBonusName.split(' ')[0]})`} />
              <SummaryCard num={summary.biggestJump?.change || 0} label={`maior salto${summary.biggestJump ? ` (${summary.biggestJump.name.split(' ')[0]})` : ''}`} prefix="+" />
            </div>
          )}

          {/* Rankings */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-4">
            <div className="grid grid-cols-[2rem_1fr_3.5rem_3.5rem_2.5rem] gap-1 px-3 py-2 bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <div className="text-center">#</div>
              <div>Nome</div>
              <div className="text-right">Pts</div>
              <div className="text-right">Bonus</div>
              <div className="text-center">&Delta;</div>
            </div>
            {ranked.slice(0, showAll ? undefined : 20).map(r => (
              <div
                key={r.name}
                className={`grid grid-cols-[2rem_1fr_3.5rem_3.5rem_2.5rem] gap-1 px-3 py-1.5 border-b border-gray-100 text-sm items-center ${
                  r.bonus >= data.bonusPoints.CHAMPION ? 'bg-amber-50' : ''
                } ${r.newRank <= 3 ? '' : ''}`}
              >
                <div className={`text-center font-bold text-xs ${r.newRank <= 3 ? 'text-amber-600' : 'text-gray-400'}`}>
                  {r.newRank}
                </div>
                <div className="font-medium text-xs truncate" title={r.details.length ? r.details.join(', ') : undefined}>
                  {r.name}
                </div>
                <div className="text-right font-bold text-xs tabular-nums">{r.total}</div>
                <div className={`text-right font-bold text-xs tabular-nums ${r.bonus > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>
                  {r.bonus > 0 ? `+${r.bonus}` : '-'}
                </div>
                <div className={`text-center font-bold text-[11px] tabular-nums ${
                  !hasScenario ? 'text-gray-300' : r.change > 0 ? 'text-green-600' : r.change < 0 ? 'text-red-500' : 'text-gray-300'
                }`}>
                  {!hasScenario ? '-' : r.change > 0 ? `+${r.change}` : r.change < 0 ? `${r.change}` : '-'}
                </div>
              </div>
            ))}
            {data.members.length > 20 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full py-2 text-xs font-semibold text-gray-400 hover:text-gray-600 bg-gray-50"
              >
                {showAll ? 'Ver top 20' : `Ver todos (${data.members.length})`}
              </button>
            )}
          </div>

          {/* Scorer Race */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Corrida da Artilharia</h2>
            {SCORERS.filter(s => s.goals >= 3).map(s => {
              const pct = (s.goals / 8) * 100
              const bets = scorerBets[s.name] || 0
              return (
                <div key={s.name} className="flex items-center gap-2 mb-1.5 text-xs">
                  <div className="w-20 font-semibold truncate flex items-center gap-1"><TeamFlag code={s.team} size={12} /> {s.name}</div>
                  <div className="font-bold w-5 text-right tabular-nums">{s.goals}</div>
                  <div className="flex-1 bg-gray-100 rounded h-4 overflow-hidden">
                    <div
                      className="h-full rounded flex items-center pl-1.5"
                      style={{ width: `${pct}%`, backgroundColor: s.team === 'FRA' ? '#002654' : s.team === 'ESP' ? '#C60B1E' : s.team === 'ENG' ? '#CF081F' : '#6CACE4' }}
                    >
                      <span className="text-white text-[9px] font-bold">{s.goals}</span>
                    </div>
                  </div>
                  <div className="w-12 text-right text-gray-400 tabular-nums">{bets > 0 ? `${bets} ap.` : '-'}</div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function TeamBtn({ code, selected, locked, onClick }: { code: string; selected: boolean; locked: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 px-3 rounded-lg border-2 font-bold text-sm text-center transition-all flex items-center justify-center gap-1.5 ${
        selected
          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
          : locked
          ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-default'
          : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-amber-400 hover:bg-amber-50 cursor-pointer'
      }`}
    >
      <TeamFlag code={code} size={18} />
      <span>{TEAM_NAME[code] || code}</span>
    </button>
  )
}

function PositionSlot({ label, code, pts, gold }: { label: string; code: string; pts: number; gold?: boolean }) {
  return (
    <div className={`text-center p-2 rounded-lg ${gold ? 'bg-amber-50' : 'bg-gray-50'}`}>
      <div className={`text-[9px] font-bold uppercase tracking-wider ${gold ? 'text-amber-600' : 'text-gray-400'}`}>{label}</div>
      <div className="text-sm font-bold mt-0.5 flex items-center justify-center gap-1"><TeamFlag code={code} size={14} /> {code}</div>
      <div className="text-[10px] font-semibold text-amber-600">+{pts}pts</div>
    </div>
  )
}

function SummaryCard({ num, label, prefix }: { num: number; label: string; prefix?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
      <div className="text-2xl font-extrabold text-amber-600 tabular-nums">{prefix && num > 0 ? prefix : ''}{num}</div>
      <div className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide leading-tight">{label}</div>
    </div>
  )
}
