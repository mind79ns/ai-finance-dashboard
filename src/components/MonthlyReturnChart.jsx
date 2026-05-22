// 포트폴리오 월별 스냅샷에서 매월 (자본수익 변동 + 배당) 을 추출하여 종합 수익을 스택바로 시각화
import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react'

// snapshots: [{ date: 'yyyy-MM', totalProfit, dividendTotal, ... }]
// 매월 종합 수익 = (totalProfit 변동) + (dividendTotal 변동)
// 첫 월은 직전 데이터가 없어 0 으로 둔다.
const buildMonthlyReturns = (snapshots) => {
  if (!Array.isArray(snapshots) || snapshots.length === 0) return []

  const sorted = [...snapshots]
    .filter(s => s?.date)
    .sort((a, b) => a.date.localeCompare(b.date))

  return sorted.map((s, idx) => {
    const prev = idx > 0 ? sorted[idx - 1] : null
    const prevProfit = Number(prev?.totalProfit) || 0
    const prevDividend = Number(prev?.dividendTotal) || 0
    const curProfit = Number(s.totalProfit) || 0
    const curDividend = Number(s.dividendTotal) || 0
    const capitalGain = idx === 0 ? 0 : curProfit - prevProfit
    const dividend = idx === 0 ? 0 : curDividend - prevDividend
    const total = capitalGain + dividend
    const monthLabel = s.date.length >= 7 ? `${parseInt(s.date.substring(5, 7), 10)}월` : s.date
    return {
      month: monthLabel,
      date: s.date,
      capitalGain,
      dividend,
      total
    }
  })
}

const formatCompact = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '0'
  const num = Number(value)
  const abs = Math.abs(num)
  const sign = num >= 0 ? '+' : '-'
  if (abs >= 1e8) return `${sign}${(abs / 1e8).toFixed(1)}억`
  if (abs >= 1e4) return `${sign}${(abs / 1e4).toFixed(0)}만`
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}K`
  return `${sign}${abs.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`
}

const MonthlyReturnChart = ({ snapshots = [] }) => {
  const { data, totals, hasData } = useMemo(() => {
    const series = buildMonthlyReturns(snapshots)
    const totalReturn = series.reduce((sum, d) => sum + (d.total || 0), 0)
    const totalCapital = series.reduce((sum, d) => sum + (d.capitalGain || 0), 0)
    const totalDividend = series.reduce((sum, d) => sum + (d.dividend || 0), 0)
    return {
      data: series,
      totals: { totalReturn, totalCapital, totalDividend },
      hasData: series.some(d => d.total !== 0 || d.capitalGain !== 0 || d.dividend !== 0)
    }
  }, [snapshots])

  if (!hasData) {
    return (
      <div className="cyber-card p-4 flex items-center justify-center h-[280px]">
        <div className="text-center">
          <BarChart3 className="w-8 h-8 text-cyan-400/40 mx-auto mb-2" />
          <p className="text-cyan-300/60 text-sm">월별 스냅샷이 누적되면 표시됩니다</p>
          <p className="text-xs text-slate-500 mt-1">(최소 2개월 이상 데이터 필요)</p>
        </div>
      </div>
    )
  }

  const totalTone = totals.totalReturn >= 0 ? 'positive' : 'negative'
  const totalToneClass = totalTone === 'positive'
    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
    : 'bg-rose-500/20 text-rose-300 border-rose-400/40'

  return (
    <div className="cyber-card cyber-card-glow p-4">
      <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <h3 className="text-cyan-400 font-semibold text-sm uppercase tracking-wide">
            월간 종합 수익
          </h3>
          <span className="text-xs text-slate-500">(자본 + 배당)</span>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border ${totalToneClass}`}
          title="기간 누적 종합 수익"
        >
          {totals.totalReturn >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          누적 {formatCompact(totals.totalReturn)}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} stackOffset="sign">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,210,255,0.1)" />
          <XAxis dataKey="month" stroke="#4a6d7c" fontSize={10} />
          <YAxis
            stroke="#4a6d7c"
            fontSize={10}
            tickFormatter={(v) => formatCompact(v)}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(10,25,40,0.95)',
              border: '1px solid rgba(0,210,255,0.3)',
              borderRadius: '8px'
            }}
            labelStyle={{ color: '#00d4ff' }}
            formatter={(value, name) => {
              const label = name === 'capitalGain' ? '자본수익' : name === 'dividend' ? '배당' : name
              return [formatCompact(value), label]
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
            formatter={(value) => value === 'capitalGain' ? '자본수익' : value === 'dividend' ? '배당' : value}
          />
          <ReferenceLine y={0} stroke="rgba(148,163,184,0.4)" />
          {/* 자본수익 — 양/음 색상을 Cell 로 분리 */}
          <Bar dataKey="capitalGain" stackId="return" radius={[0, 0, 0, 0]}>
            {data.map((entry, idx) => (
              <Cell
                key={`cg-${idx}`}
                fill={entry.capitalGain >= 0 ? '#22d3ee' : '#fb7185'}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
          {/* 배당은 항상 양수에 가까움 (감소가 거의 없음) — 단일 amber 색 */}
          <Bar dataKey="dividend" stackId="return" fill="#fbbf24" fillOpacity={0.9} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-sm bg-cyan-400" />
          자본수익 누적 <span className="text-cyan-300">{formatCompact(totals.totalCapital)}</span>
        </div>
        <div className="flex items-center gap-1.5 justify-end">
          <span className="inline-block w-2 h-2 rounded-sm bg-amber-400" />
          배당 누적 <span className="text-amber-300">{formatCompact(totals.totalDividend)}</span>
        </div>
      </div>
    </div>
  )
}

export default MonthlyReturnChart
