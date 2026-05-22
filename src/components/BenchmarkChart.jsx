// 내 포트폴리오 vs SPY vs KOSPI 누적 수익률(base 100)을 라인차트로 비교하고 α(초과수익)를 배지로 표시
import { useMemo } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine
} from 'recharts'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'
import {
  normalizeToBase100,
  portfolioSnapshotsToSeries,
  downsampleToMonthly,
  mergeForChart,
  calculateAlpha,
  formatAlphaLabel,
  alphaTone
} from '../utils/benchmarkUtils'

const TONE_STYLES = {
  'strong-positive': 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50',
  positive: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/30',
  negative: 'bg-rose-500/10 text-rose-300 border-rose-400/30',
  'strong-negative': 'bg-rose-500/20 text-rose-300 border-rose-400/50',
  neutral: 'bg-slate-700/50 text-slate-300 border-slate-600'
}

const BenchmarkChart = ({
  snapshots = [],
  spyHistorical = null,
  kospiHistorical = null,
  loading = false,
  onOpenDetail = null
}) => {
  // 시계열 정규화 — useMemo 로 props 변경 시에만 재계산
  const { chartData, alphaVsSpy, alphaVsKospi, hasData } = useMemo(() => {
    const portfolioSeries = normalizeToBase100(portfolioSnapshotsToSeries(snapshots))
    const spySeries = normalizeToBase100(downsampleToMonthly(spyHistorical?.series || []))
    const kospiSeries = normalizeToBase100(downsampleToMonthly(kospiHistorical?.series || []))

    const merged = mergeForChart({
      portfolio: portfolioSeries,
      spy: spySeries,
      kospi: kospiSeries
    })

    return {
      chartData: merged,
      alphaVsSpy: calculateAlpha(portfolioSeries, spySeries),
      alphaVsKospi: calculateAlpha(portfolioSeries, kospiSeries),
      hasData: portfolioSeries.length > 0
    }
  }, [snapshots, spyHistorical, kospiHistorical])

  const renderLegendValue = (value) => {
    if (value === 'portfolio') return '내 포트폴리오'
    if (value === 'spy') return 'S&P 500 (SPY)'
    if (value === 'kospi') return 'KOSPI (^KS11)'
    return value
  }

  if (loading && !hasData) {
    return (
      <div className="cyber-card p-4 flex items-center justify-center h-[280px]">
        <div className="text-cyan-300/60 text-sm">벤치마크 데이터 로딩 중...</div>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="cyber-card p-4 flex items-center justify-center h-[280px]">
        <div className="text-center">
          <Activity className="w-8 h-8 text-cyan-400/40 mx-auto mb-2" />
          <p className="text-cyan-300/60 text-sm">포트폴리오 월별 스냅샷이 누적되면 표시됩니다</p>
          <p className="text-xs text-slate-500 mt-1">(최소 2개월 이상 데이터 필요)</p>
        </div>
      </div>
    )
  }

  const cardClass = onOpenDetail
    ? 'cyber-card cyber-card-glow cyber-card-clickable p-4'
    : 'cyber-card cyber-card-glow p-4'

  return (
    <div
      className={cardClass}
      onClick={onOpenDetail ? () => onOpenDetail() : undefined}
      role={onOpenDetail ? 'button' : undefined}
    >
      {/* 헤더 + α 배지 */}
      <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="text-cyan-400 font-semibold text-sm uppercase tracking-wide">
            벤치마크 비교
          </h3>
          <span className="text-xs text-slate-500">(시작점 100 기준)</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {alphaVsSpy != null && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border ${TONE_STYLES[alphaTone(alphaVsSpy)]}`}
              title="내 포트폴리오 누적 - SPY 누적"
            >
              {alphaVsSpy >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              SPY {formatAlphaLabel(alphaVsSpy)}
            </span>
          )}
          {alphaVsKospi != null && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border ${TONE_STYLES[alphaTone(alphaVsKospi)]}`}
              title="내 포트폴리오 누적 - KOSPI 누적"
            >
              {alphaVsKospi >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              KOSPI {formatAlphaLabel(alphaVsKospi)}
            </span>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,210,255,0.1)" />
          <XAxis dataKey="month" stroke="#4a6d7c" fontSize={10} />
          <YAxis
            stroke="#4a6d7c"
            fontSize={10}
            domain={['auto', 'auto']}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(10,25,40,0.95)',
              border: '1px solid rgba(0,210,255,0.3)',
              borderRadius: '8px'
            }}
            labelStyle={{ color: '#00d4ff' }}
            formatter={(value, name) => {
              if (value == null) return ['-', renderLegendValue(name)]
              const diff = value - 100
              const sign = diff >= 0 ? '+' : ''
              return [`${value} (${sign}${diff.toFixed(2)}%)`, renderLegendValue(name)]
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
            formatter={renderLegendValue}
          />
          <ReferenceLine y={100} stroke="rgba(148,163,184,0.4)" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="portfolio"
            stroke="#00d4ff"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="spy"
            stroke="#34d399"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="kospi"
            stroke="#fb7185"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="text-[10px] text-slate-500 mt-2 text-center">
        * 시작 시점을 100 으로 두고 이후 비율(누적 수익률)을 비교합니다. α 는 같은 기간 누적 차이(%p).
      </p>
    </div>
  )
}

export default BenchmarkChart
