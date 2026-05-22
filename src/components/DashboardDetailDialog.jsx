import { useEffect, useState } from 'react'
import { X, TrendingUp, TrendingDown, Wallet, BarChart3, PiggyBank, Target, Globe, Zap, Clock, ArrowUpRight, ArrowDownRight, Info, Activity } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import marketDataService from '../services/marketDataService'
import {
  normalizeToBase100,
  portfolioSnapshotsToSeries,
  downsampleToMonthly,
  mergeForChart,
  calculateAlpha
} from '../utils/benchmarkUtils'

const CYBER_COLORS = ['#00d4ff', '#00ff88', '#ffd700', '#ff6b6b', '#a855f7', '#06b6d4', '#f97316']

const fmt = (v, cur = 'KRW') => {
  if (!Number.isFinite(v)) return '-'
  if (cur === 'USD') return `$${Math.round(v).toLocaleString('en-US')}`
  return `${Math.round(v).toLocaleString('ko-KR')}원`
}

const fmtC = (v) => {
  if (!Number.isFinite(v)) return '-'
  return `${Math.round(v).toLocaleString('ko-KR')}원`
}

const DashboardDetailDialog = ({ isOpen, onClose, dialogType, dialogData }) => {
  useEffect(() => {
    if (!isOpen) return
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = 'unset' }
  }, [isOpen, onClose])

  if (!isOpen || !dialogType) return null

  const title = {
    portfolio: '📊 Portfolio 종합 진단',
    assetStatus: '📈 Asset Status 심층 분석',
    profit: '💰 수익/손실 종목 리포트',
    dividend: '🪙 배당금 심층 분석',
    growthRate: '📉 Growth Rate 종합 지표',
    account: `🏦 ${dialogData?.account || '계좌'} 상세 현황`,
    yearlyFlow: '📋 연간 현금흐름(Flow) 진단',
    market: `🌐 ${dialogData?.label || 'Market'} 분석`,
    gainers: '🟢 Top Gainers 분석',
    losers: '🔴 Top Losers 분석',
    allocation: '🎯 자산 배분 위험도 평가',
    goals: '🎯 목표 달성 현황 리포트',
    netChange: '📊 월별 순변동 흐름',
    activities: '🕐 전체 활동 내역',
    benchmark: '📈 벤치마크 비교 심층 분석 (포트폴리오 vs SPY / KOSPI)',
    monthlyReturn: '💵 월간 종합 수익 심층 분석 (자본 + 배당)'
  }[dialogType] || '상세 현황'

  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-[60] backdrop-blur-md" onClick={onClose} />
      <div className="fixed inset-4 sm:inset-8 md:inset-12 lg:inset-16 z-[61] flex items-center justify-center">
        <div className="cyber-card w-full h-full max-h-full flex flex-col overflow-hidden animate-[fadeScaleIn_0.3s_ease-out] border border-cyan-500/30 shadow-[0_0_30px_rgba(0,210,255,0.15)] bg-slate-900/95">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20 shrink-0 bg-slate-800/50">
            <h2 className="text-xl font-bold neon-text-cyan truncate">{title}</h2>
            <button onClick={onClose} className="p-2 hover:bg-cyan-500/20 rounded transition-colors shrink-0 ml-2">
              <X className="w-6 h-6 text-cyan-400" />
            </button>
          </div>
          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 cyber-scrollbar">
            <DialogContent type={dialogType} data={dialogData} />
          </div>
        </div>
      </div>
    </>
  )
}

/* ═══ Content Router ═══ */
const DialogContent = ({ type, data }) => {
  if (!data) return <p className="text-cyan-300/50 text-center py-8">데이터가 없습니다</p>
  switch (type) {
    case 'portfolio': return <PortfolioDetail d={data} />
    case 'assetStatus': return <AssetStatusDetail d={data} />
    case 'profit': return <ProfitDetail d={data} />
    case 'dividend': return <DividendDetail d={data} />
    case 'growthRate': return <GrowthRateDetail d={data} />
    case 'account': return <AccountDetail d={data} />
    case 'yearlyFlow': return <YearlyFlowDetail d={data} />
    case 'market': return <MarketDetail d={data} />
    case 'gainers': return <PerformersDetail d={data} isGainer />
    case 'losers': return <PerformersDetail d={data} isGainer={false} />
    case 'allocation': return <AllocationDetail d={data} />
    case 'goals': return <GoalsDetail d={data} />
    case 'netChange': return <NetChangeDetail d={data} />
    case 'activities': return <ActivitiesDetail d={data} />
    case 'benchmark': return <BenchmarkDetail d={data} />
    case 'monthlyReturn': return <MonthlyReturnDetail d={data} />
    default: return <p className="text-cyan-300/50">알 수 없는 타입</p>
  }
}

/* ═══ Shared UI Components ═══ */
const CyberTable = ({ headers, rows }) => (
  <div className="overflow-x-auto rounded-lg border border-cyan-500/20 bg-slate-800/30">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-slate-800/80">
          {headers.map((h, i) => (
            <th key={i} className="text-left px-4 py-3 text-cyan-400 font-semibold border-b border-cyan-500/30 whitespace-nowrap" style={h.align ? {textAlign: h.align} : {}}>
              {h.label || h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-cyan-500/10 hover:bg-cyan-500/10 transition-colors">
            {row.map((cell, j) => (
              <td key={j} className="px-4 py-3 text-cyan-50 whitespace-nowrap" style={headers[j]?.align ? {textAlign: headers[j].align} : {}}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const PnlText = ({ value, suffix = '' }) => {
  if (!Number.isFinite(value)) return <span>-</span>
  const pos = value >= 0
  let displayValue;
  if (suffix === '원') {
    displayValue = Math.round(Math.abs(value)).toLocaleString('ko-KR');
  } else {
    const absVal = Math.abs(value)
    displayValue = absVal % 1 !== 0 ? absVal.toFixed(2) : absVal
  }
  return (
    <span className={pos ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)] font-bold' : 'text-rose-400 drop-shadow-[0_0_6px_rgba(251,113,133,0.5)] font-bold'}>
      {pos ? '+' : '-'}{displayValue}{suffix}
    </span>
  )
}

const SparklineBar = ({ value, max, color = '#00d4ff' }) => {
  const percent = max > 0 ? Math.min((Math.abs(value) / max) * 100, 100) : 0
  return (
    <div className="w-full flex items-center gap-2">
      <div className="h-1.5 w-24 bg-slate-700/50 rounded-full overflow-hidden flex-shrink-0">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
      </div>
      <span className="text-[10px] text-cyan-300/60 w-8">{percent.toFixed(0)}%</span>
    </div>
  )
}

const AIInsightBadge = ({ icon: Icon, title, message, type = 'info' }) => {
  const colors = {
    info: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    danger: 'border-rose-500/30 bg-rose-500/10 text-rose-300'
  }
  return (
    <div className={`flex gap-3 p-3 rounded-lg border ${colors[type]} mb-4 items-start`}>
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div>
        <p className="font-bold text-sm mb-0.5">{title}</p>
        <p className="text-xs opacity-80 leading-relaxed">{message}</p>
      </div>
    </div>
  )
}

/* ═══ 1. Portfolio ═══ */
const PortfolioDetail = ({ d }) => {
  const { accountSummary = [], portfolioSummary = {} } = d
  const total = portfolioSummary.totalValueKRW || 1
  const maxVal = Math.max(...accountSummary.map(a => a.totalValueKRW))

  return (
    <div className="space-y-6">
      <AIInsightBadge 
        icon={Wallet} 
        title="Portfolio Insight" 
        message={`현재 총 ${accountSummary.length}개의 계좌로 분산 투자되어 있으며, 전체 자산의 수익률은 ${portfolioSummary.profitPercent > 0 ? '플러스(+)' : '마이너스(-)'} 성장을 기록 중입니다.`}
        type={portfolioSummary.profitPercent >= 0 ? 'success' : 'warning'}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { l: '총 평가액', v: fmt(portfolioSummary.totalValueKRW), c: 'neon-text-cyan' },
          { l: 'USD 환산', v: fmt(portfolioSummary.totalValueUSD, 'USD'), c: 'text-white' },
          { l: '총 수익금', v: fmt(portfolioSummary.totalProfitKRW), c: portfolioSummary.totalProfitKRW >= 0 ? 'neon-text-green' : 'neon-text-red' },
          { l: '총 수익률', v: `${portfolioSummary.profitPercent?.toFixed(2)}%`, c: portfolioSummary.profitPercent >= 0 ? 'neon-text-green' : 'neon-text-red' }
        ].map((s, i) => (
          <div key={i} className="cyber-stat-item text-center p-4 bg-slate-800/40 rounded-lg">
            <p className="text-cyan-300/60 text-xs mb-2 uppercase">{s.l}</p>
            <p className={`font-bold text-xl ${s.c}`}>{s.v}</p>
          </div>
        ))}
      </div>
      
      <h3 className="text-cyan-400 font-semibold text-sm border-l-2 border-cyan-400 pl-2">계좌별 점유율 및 성과</h3>
      <CyberTable
        headers={['계좌명', {label:'점유율',align:'left'}, {label:'평가액',align:'right'}, {label:'수익금',align:'right'}, {label:'수익률',align:'right'}]}
        rows={accountSummary.map(a => [
          <span className="font-medium">{a.account}</span>,
          <SparklineBar value={a.totalValueKRW} max={total} color="#00d4ff" />,
          fmtC(a.totalValueKRW),
          <PnlText value={a.profitKRW} suffix="원" />,
          <PnlText value={a.profitPercent} suffix="%" />
        ])}
      />
    </div>
  )
}

/* ═══ 2. Asset Status ═══ */
const AssetStatusDetail = ({ d }) => {
  const { trendAsset = [], assetStatusTotal = 0, monthlyNetChanges = [], yearlyFlow = {} } = d
  
  // MoM 및 평균
  const validTrends = trendAsset.filter(t => t.value > 0)
  let momPercent = 0, momDiff = 0
  let avgMonthly = 0
  if (validTrends.length >= 2) {
    const last = validTrends[validTrends.length - 1].value
    const prev = validTrends[validTrends.length - 2].value
    momPercent = ((last - prev) / prev) * 100
    momDiff = last - prev
  }
  if (validTrends.length > 0) {
    avgMonthly = validTrends.reduce((sum, t) => sum + t.value, 0) / validTrends.length
  }

  // 최고/최저 월
  const activeMonths = monthlyNetChanges.filter(m => m.income > 0 || m.expense > 0)
  const bestMonth = [...activeMonths].sort((a, b) => b.value - a.value)[0]
  const worstMonth = [...activeMonths].sort((a, b) => a.value - b.value)[0]
  const totalIncome = yearlyFlow.income || 0
  const totalExpense = yearlyFlow.expense || 0

  return (
    <div className="space-y-6">
      <AIInsightBadge 
        icon={BarChart3} 
        title="자산 현황 종합 분석" 
        message={`현재 총 자산은 ${fmt(assetStatusTotal)}이며, 전월 대비 ${momPercent >= 0 ? '증가' : '감소'}(${momPercent.toFixed(1)}%) 추세입니다.`}
        type={momPercent >= 0 ? 'success' : 'warning'}
      />

      {/* 핵심 지표 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="cyber-stat-item p-4 text-center">
          <p className="text-cyan-300/60 text-xs mb-1">현재 자산 총액</p>
          <p className="neon-text-cyan font-bold text-2xl">{fmt(assetStatusTotal)}</p>
        </div>
        <div className="cyber-stat-item p-4 text-center bg-slate-800/40">
          <p className="text-cyan-300/60 text-xs mb-1">전월 대비 (MoM)</p>
          <div className="text-xl"><PnlText value={momPercent} suffix="%" /></div>
          <p className="text-[10px] text-cyan-300/40 mt-1">{fmt(momDiff)} 변동</p>
        </div>
        <div className="cyber-stat-item p-4 text-center bg-slate-800/40">
          <p className="text-cyan-300/60 text-xs mb-1">월 평균 유지액</p>
          <p className="text-cyan-100 font-bold text-xl">{fmt(avgMonthly)}</p>
        </div>
        <div className="cyber-stat-item p-4 text-center bg-slate-800/40">
          <p className="text-cyan-300/60 text-xs mb-1">연간 순이익</p>
          <div className="text-xl"><PnlText value={yearlyFlow.net || 0} suffix="원" /></div>
        </div>
      </div>

      {/* 자산 성장 곡선 */}
      <h3 className="text-cyan-400 font-semibold text-sm border-l-2 border-cyan-400 pl-2">자산 성장 곡선</h3>
      <div className="p-4 bg-slate-800/30 rounded-lg border border-cyan-500/10">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={trendAsset}>
            <defs>
              <linearGradient id="gradAssetDlg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,210,255,0.05)" />
            <XAxis dataKey="month" stroke="#4a6d7c" fontSize={11} />
            <YAxis stroke="#4a6d7c" fontSize={11} tickFormatter={v => `${(v / 1e6).toFixed(0)}M`} />
            <Tooltip contentStyle={{ background: 'rgba(10,25,40,0.95)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '8px' }} formatter={v => [fmt(v), 'Asset Total']} />
            <Area type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={3} fill="url(#gradAssetDlg)" dot={{ r: 4, fill: '#a855f7', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 월별 수입/지출 비교 차트 */}
      {activeMonths.length > 0 && (
        <>
          <h3 className="text-cyan-400 font-semibold text-sm border-l-2 border-cyan-400 pl-2">월별 수입 vs 지출 현황</h3>
          <div className="p-4 bg-slate-800/30 rounded-lg border border-cyan-500/10">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyNetChanges}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,210,255,0.05)" vertical={false} />
                <XAxis dataKey="month" stroke="#4a6d7c" fontSize={11} tickLine={false} />
                <YAxis stroke="#4a6d7c" fontSize={11} tickFormatter={v => `${(v / 1e4).toFixed(0)}만`} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: 'rgba(10,25,40,0.95)', border: '1px solid rgba(0,210,255,0.3)', borderRadius: '8px' }}
                  formatter={(v, name) => [fmt(v), name === 'income' ? '수입' : name === 'expense' ? '지출' : '순변동']}
                  cursor={{fill: 'rgba(0,210,255,0.05)'}}
                />
                <Bar dataKey="income" name="income" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.8} />
                <Bar dataKey="expense" name="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* 월별 세부 내역 테이블 */}
      {activeMonths.length > 0 && (
        <>
          <h3 className="text-cyan-400 font-semibold text-sm border-l-2 border-cyan-400 pl-2">월별 증감 세부 내역</h3>
          <CyberTable
            headers={['월', {label:'수입',align:'right'}, {label:'지출',align:'right'}, {label:'순변동',align:'right'}, {label:'비중',align:'right'}]}
            rows={activeMonths.map(m => [
              <span className="font-bold text-cyan-200">{m.month}</span>,
              <span className="text-emerald-400 font-semibold">{fmtC(m.income || 0)}</span>,
              <span className="text-rose-400 font-semibold">{fmtC(m.expense || 0)}</span>,
              <PnlText value={m.value} suffix="원" />,
              <span className={`text-xs font-bold ${(m.income || 0) > 0 && ((m.value / m.income) * 100) >= 20 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {(m.income || 0) > 0 ? ((m.value / m.income) * 100).toFixed(1) : 0}%
              </span>
            ])}
          />
        </>
      )}

      {/* 하이라이트 */}
      <div className="grid grid-cols-2 gap-4">
        {bestMonth && (
          <div className="cyber-stat-item p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-center">
            <p className="text-cyan-300/60 text-xs mb-1">🟢 최고 잉여금 ({bestMonth.month})</p>
            <p className="neon-text-green font-bold text-lg">{fmt(bestMonth.value)}</p>
            <p className="text-[10px] text-cyan-300/40">수입 {fmtC(bestMonth.income || 0)} / 지출 {fmtC(bestMonth.expense || 0)}</p>
          </div>
        )}
        {worstMonth && (
          <div className="cyber-stat-item p-4 bg-rose-500/5 border border-rose-500/20 rounded-lg text-center">
            <p className="text-cyan-300/60 text-xs mb-1">🔴 최저/적자 ({worstMonth.month})</p>
            <p className="neon-text-red font-bold text-lg">{fmt(worstMonth.value)}</p>
            <p className="text-[10px] text-cyan-300/40">수입 {fmtC(worstMonth.income || 0)} / 지출 {fmtC(worstMonth.expense || 0)}</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══ 3. Profit ═══ */
const ProfitDetail = ({ d }) => {
  const { performance = [], portfolioSummary = {} } = d
  const sorted = [...performance].sort((a, b) => b.profitPercent - a.profitPercent)
  const maxProfit = Math.max(...sorted.map(s => Math.abs(s.profitPercent)), 1)
  
  const gainers = sorted.filter(s => s.profitPercent > 0).length
  const losers = sorted.filter(s => s.profitPercent < 0).length

  return (
    <div className="space-y-6">
      <AIInsightBadge 
        icon={TrendingUp} 
        title="Profit Analysis" 
        message={`보유 종목 ${sorted.length}개 중 수익 종목은 ${gainers}개, 손실 종목은 ${losers}개입니다. 총 수익률은 ${portfolioSummary.profitPercent?.toFixed(2)}%를 기록 중입니다.`}
        type={portfolioSummary.profitPercent >= 0 ? 'success' : 'danger'}
      />

      <h3 className="text-cyan-400 font-semibold text-sm border-l-2 border-cyan-400 pl-2">수익 기여도 랭킹</h3>
      <CyberTable
        headers={['순위', '종목명', {label:'투자금/수익금',align:'right'}, {label:'수익 크기',align:'left'}, {label:'수익률',align:'right'}]}
        rows={sorted.map((p, i) => [
          <span className="text-cyan-500/50">#{i + 1}</span>,
          <div className="flex flex-col">
            <span className="font-bold">{p.symbol}</span>
            {p.name !== p.symbol && <span className="text-[10px] text-cyan-300/40">{p.name}</span>}
          </div>,
          <div className="flex flex-col text-right">
            <span className="font-bold">{fmtC(p.valueKRW || 0)}</span>
            <span className="text-xs"><PnlText value={p.profitKRW || 0} suffix="원" /></span>
          </div>,
          <SparklineBar value={p.profitPercent} max={maxProfit} color={p.profitPercent >= 0 ? '#10b981' : '#f43f5e'} />,
          <PnlText value={p.profitPercent} suffix="%" />
        ])}
      />
    </div>
  )
}

/* ═══ 4. Dividend ═══ */
const DividendDetail = ({ d }) => {
  const { dividendTotal = 0, trendDividend = [] } = d
  
  // 최고 배당월 찾기
  const bestMonth = [...trendDividend].sort((a, b) => b.value - a.value)[0]

  // 종목별 기여도 계산
  let symbolShares = []
  if (d.dividendData) {
    const map = {}
    d.dividendData.forEach(div => {
      const key = div.name && div.name !== div.symbol ? `${div.symbol} (${div.name})` : (div.symbol || '기타')
      map[key] = (map[key] || 0) + (div.amountKRW || 0)
    })
    symbolShares = Object.entries(map).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value)
  }

  return (
    <div className="space-y-6">
      <AIInsightBadge 
        icon={PiggyBank} 
        title="Dividend Flow" 
        message={`올해 발생한 총 배당금은 ${fmt(dividendTotal)} 입니다. 현금 파이프라인이 안정적으로 구축되고 있습니다.`}
        type="info"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="cyber-stat-item text-center p-4">
          <p className="text-cyan-300/60 text-xs mb-1">연간 누적 배당</p>
          <p className="neon-text-gold font-bold text-2xl">{fmt(dividendTotal)}</p>
        </div>
        <div className="cyber-stat-item text-center p-4 bg-slate-800/40">
          <p className="text-cyan-300/60 text-xs mb-1">월 평균 배당액</p>
          <p className="text-amber-400 font-bold text-xl">{fmt(dividendTotal / 12)}</p>
        </div>
        <div className="cyber-stat-item text-center p-4 bg-slate-800/40">
          <p className="text-cyan-300/60 text-xs mb-1">최고 수령액 ({bestMonth?.month})</p>
          <p className="text-amber-200 font-bold text-xl">{fmt(bestMonth?.value || 0)}</p>
        </div>
      </div>

      {symbolShares.length > 0 && (
        <>
          <h3 className="text-cyan-400 font-semibold text-sm border-l-2 border-cyan-400 pl-2 mt-6">종목별 배당금 기여도</h3>
          <div className="p-4 bg-slate-800/30 rounded-lg border border-cyan-500/10 flex flex-col md:flex-row items-center gap-4">
            <div className="w-full md:w-1/2 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={symbolShares}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {symbolShares.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CYBER_COLORS[index % CYBER_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: 'rgba(10,25,40,0.95)', border: '1px solid rgba(0,210,255,0.3)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(val) => [fmt(val), '배당금']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2">
              <div className="space-y-2 max-h-[200px] overflow-y-auto cyber-scrollbar pr-2">
                {symbolShares.map((s, i) => (
                  <div key={s.name} className="flex justify-between items-center text-xs p-2 rounded bg-slate-800/50 hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CYBER_COLORS[i % CYBER_COLORS.length] }} />
                      <span className="text-cyan-100 font-bold">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-amber-400 font-semibold">{fmtC(s.value)}</span>
                      <span className="text-cyan-300/60 w-10 text-right">{dividendTotal > 0 ? ((s.value/dividendTotal)*100).toFixed(1) : 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <h3 className="text-cyan-400 font-semibold text-sm border-l-2 border-cyan-400 pl-2">월별 현금 흐름 추이</h3>
      <div className="p-4 bg-slate-800/30 rounded-lg border border-cyan-500/10">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={trendDividend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,210,255,0.05)" vertical={false} />
            <XAxis dataKey="month" stroke="#4a6d7c" fontSize={11} tickLine={false} />
            <YAxis stroke="#4a6d7c" fontSize={11} tickFormatter={v => `${(v / 1e4).toFixed(0)}만`} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'rgba(10,25,40,0.95)', border: '1px solid rgba(255,215,0,0.4)', borderRadius: '8px' }} formatter={v => [fmt(v), '배당금']} cursor={{fill: 'rgba(255,215,0,0.05)'}} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#ffd700">
              {trendDividend.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.value === bestMonth?.value ? '#ffea00' : '#d4af37'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h3 className="text-cyan-400 font-semibold text-sm border-l-2 border-cyan-400 pl-2 mt-6">종목별 / 월별 세부 배당 내역</h3>
      {d.dividendData && d.dividendData.length > 0 ? (
        <CyberTable
          headers={['날짜', '종목명', {label:'배당액',align:'right'}]}
          rows={d.dividendData.slice().sort((a,b) => new Date(b.date) - new Date(a.date)).map(div => [
            <span className="text-cyan-200">{div.date}</span>,
            <div className="flex flex-col">
              <span className="font-bold">{div.symbol || '알 수 없음'}</span>
              {div.name && div.name !== div.symbol && <span className="text-[10px] text-cyan-300/40">{div.name}</span>}
            </div>,
            <span className="text-amber-400">+{fmtC(div.amountKRW || 0)}</span>
          ])}
        />
      ) : (
        <p className="text-cyan-300/40 text-center py-4">상세 배당 내역이 없습니다.</p>
      )}
    </div>
  )
}

/* ═══ 5. Growth Rate ═══ */
const GrowthRateDetail = ({ d }) => {
  const { portfolioHistory = [] } = d
  return (
    <div className="space-y-6">
      <AIInsightBadge 
        icon={Activity} 
        title="Growth Synchronization" 
        message="포트폴리오 평가액과 전체 자산(Asset Status)의 동기화 상태를 분석합니다. 갭이 줄어들수록 투자 자산의 비중이 높아짐을 의미합니다."
        type="info"
      />
      <h3 className="text-cyan-400 font-semibold text-sm border-l-2 border-cyan-400 pl-2">최근 6개월 성장 추이 궤적</h3>
      <div className="p-4 bg-slate-800/30 rounded-lg border border-cyan-500/10">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={portfolioHistory}>
            <defs>
              <linearGradient id="gP2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00d4ff" stopOpacity={0.4} /><stop offset="95%" stopColor="#00d4ff" stopOpacity={0} /></linearGradient>
              <linearGradient id="gA2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} /><stop offset="95%" stopColor="#a855f7" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,210,255,0.05)" />
            <XAxis dataKey="month" stroke="#4a6d7c" fontSize={11} />
            <YAxis stroke="#4a6d7c" fontSize={11} tickFormatter={v => `${(v / 1e6).toFixed(0)}M`} />
            <Tooltip contentStyle={{ background: 'rgba(10,25,40,0.95)', border: '1px solid rgba(0,210,255,0.3)', borderRadius: '8px' }} formatter={(v, n) => [fmt(v), n === 'portfolio' ? 'Portfolio' : 'Total Asset']} />
            <Area type="monotone" dataKey="assetStatus" stroke="#a855f7" strokeWidth={2} fill="url(#gA2)" dot={{ r: 3, fill: '#a855f7' }} connectNulls name="Asset Status" />
            <Area type="monotone" dataKey="portfolio" stroke="#00d4ff" strokeWidth={2} fill="url(#gP2)" dot={{ r: 3, fill: '#00d4ff' }} connectNulls name="Portfolio" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <CyberTable
        headers={['월', {label:'Portfolio (투자금액)',align:'right'}, {label:'Total Asset (총 자산)',align:'right'}, {label:'투자 비중',align:'right'}]}
        rows={portfolioHistory.map(h => [
          h.month, 
          h.portfolio ? fmt(h.portfolio) : '-', 
          h.assetStatus ? fmt(h.assetStatus) : '-',
          (h.portfolio && h.assetStatus) ? `${((h.portfolio / h.assetStatus) * 100).toFixed(1)}%` : '-'
        ])}
      />
    </div>
  )
}

/* ═══ 6. Account ═══ */
const AccountDetail = ({ d }) => {
  const { account = '', assets = [] } = d
  const maxVal = Math.max(...assets.map(a => a.valueKRW), 1)

  return (
    <div className="space-y-6">
      <AIInsightBadge 
        icon={Wallet} 
        title={`${account} 건강도`} 
        message={`이 계좌는 총 ${assets.length}개의 투자 자산으로 운용되고 있습니다.`}
        type="info"
      />
      <h3 className="text-cyan-400 font-semibold text-sm border-l-2 border-cyan-400 pl-2">편입 자산 상세 리스트</h3>
      <CyberTable
        headers={['종목', '비중(크기)', {label:'보유수량',align:'right'}, {label:'투자 원금',align:'right'}, {label:'평가액',align:'right'}, {label:'손익/수익률',align:'right'}]}
        rows={assets.map(a => [
          <div className="flex flex-col">
            <span className="font-bold text-cyan-100">{a.symbol}</span>
            <span className="text-[10px] text-cyan-300/40">{a.name}</span>
          </div>,
          <SparklineBar value={a.valueKRW || 0} max={maxVal} color="#00ff88" />,
          a.quantity || a.qty, 
          fmtC(a.investedKRW || 0),
          fmtC(a.valueKRW || 0),
          <div className="flex flex-col items-end">
            <PnlText value={a.profitKRW || 0} suffix="원" />
            <span className="text-xs"><PnlText value={a.profitPercent || 0} suffix="%" /></span>
          </div>
        ])}
      />
    </div>
  )
}

/* ═══ 7. Yearly Flow ═══ */
const YearlyFlowDetail = ({ d }) => {
  const { yearlyFlow = {}, monthlyNetChanges = [], yearlyCompareData = {} } = d
  const savingsRate = yearlyFlow.income > 0 ? ((yearlyFlow.income - yearlyFlow.expense) / yearlyFlow.income) * 100 : 0
  
  let insightType = 'info'
  let insightMsg = '수입 데이터가 부족하여 분석할 수 없습니다.'
  if (yearlyFlow.income > 0) {
    if (savingsRate >= 50) { insightType = 'success'; insightMsg = '매우 훌륭합니다! 수입의 50% 이상을 저축/투자하고 있는 건전한 재무 상태입니다.' }
    else if (savingsRate >= 20) { insightType = 'info'; insightMsg = '안정적입니다. 수입의 20% 이상을 남기고 있습니다. 조금 더 저축률을 높여보세요.' }
    else if (savingsRate > 0) { insightType = 'warning'; insightMsg = '주의 요망! 지출이 수입의 대부분을 차지하고 있어 여유 자금 확보가 필요합니다.' }
    else { insightType = 'danger'; insightMsg = '적자 상태입니다! 즉각적인 지출 통제와 현금흐름 개선이 시급합니다.' }
  }

  // 다년도 비교 차트 데이터
  const years = Object.keys(yearlyCompareData).sort()
  const yearChartData = years.map(y => ({
    year: `${y}년`,
    income: yearlyCompareData[y].income,
    expense: yearlyCompareData[y].expense,
    net: yearlyCompareData[y].net
  }))

  // 전년 대비 증감률 계산
  const currentYear = new Date().getFullYear().toString()
  const prevYear = (Number(currentYear) - 1).toString()
  const curData = yearlyCompareData[currentYear]
  const prevData = yearlyCompareData[prevYear]
  let incomeChange = null, expenseChange = null, netChange = null
  if (curData && prevData && prevData.income > 0) {
    incomeChange = ((curData.income - prevData.income) / prevData.income) * 100
  }
  if (curData && prevData && prevData.expense > 0) {
    expenseChange = ((curData.expense - prevData.expense) / prevData.expense) * 100
  }
  if (curData && prevData && prevData.net !== 0) {
    netChange = ((curData.net - prevData.net) / Math.abs(prevData.net)) * 100
  }

  return (
    <div className="space-y-6">
      <AIInsightBadge icon={Activity} title="현금흐름(Cashflow) 진단" message={insightMsg} type={insightType} />

      {/* 올해 요약 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="cyber-stat-item text-center p-4 bg-emerald-500/10 border-emerald-500/30">
          <p className="text-emerald-300/80 text-xs mb-1">연간 총 수입</p>
          <p className="font-bold text-emerald-400 text-lg">+{fmtC(yearlyFlow.income)}</p>
        </div>
        <div className="cyber-stat-item text-center p-4 bg-rose-500/10 border-rose-500/30">
          <p className="text-rose-300/80 text-xs mb-1">연간 총 지출</p>
          <p className="font-bold text-rose-400 text-lg">-{fmtC(yearlyFlow.expense)}</p>
        </div>
        <div className="cyber-stat-item text-center p-4">
          <p className="text-cyan-300/60 text-xs mb-1">절대 순변동액</p>
          <p className="font-bold text-cyan-100 text-lg">{fmtC(yearlyFlow.net)}</p>
        </div>
        <div className="cyber-stat-item text-center p-4 bg-slate-800/60">
          <p className="text-cyan-300/60 text-xs mb-1">저축률 (Savings Rate)</p>
          <p className={`font-bold text-2xl ${savingsRate >= 50 ? 'neon-text-green' : savingsRate < 0 ? 'neon-text-red' : 'text-amber-400'}`}>
            {savingsRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* 전년 대비 증감 */}
      {prevData && (
        <>
          <h3 className="text-cyan-400 font-semibold text-sm border-l-2 border-cyan-400 pl-2">전년({prevYear}) 대비 변화</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="cyber-stat-item text-center p-4 bg-slate-800/40 rounded-lg">
              <p className="text-cyan-300/60 text-xs mb-1">수입 증감</p>
              {incomeChange !== null ? <PnlText value={incomeChange} suffix="%" /> : <span className="text-cyan-300/40">-</span>}
              <p className="text-[10px] text-cyan-300/40 mt-1">{fmt(prevData.income)} → {fmt(curData?.income || 0)}</p>
            </div>
            <div className="cyber-stat-item text-center p-4 bg-slate-800/40 rounded-lg">
              <p className="text-cyan-300/60 text-xs mb-1">지출 증감</p>
              {expenseChange !== null ? <PnlText value={expenseChange} suffix="%" /> : <span className="text-cyan-300/40">-</span>}
              <p className="text-[10px] text-cyan-300/40 mt-1">{fmt(prevData.expense)} → {fmt(curData?.expense || 0)}</p>
            </div>
            <div className="cyber-stat-item text-center p-4 bg-slate-800/40 rounded-lg">
              <p className="text-cyan-300/60 text-xs mb-1">순이익 변화</p>
              {netChange !== null ? <PnlText value={netChange} suffix="%" /> : <span className="text-cyan-300/40">-</span>}
              <p className="text-[10px] text-cyan-300/40 mt-1">{fmt(prevData.net)} → {fmt(curData?.net || 0)}</p>
            </div>
          </div>
        </>
      )}

      {/* 다년도 비교 바차트 */}
      {yearChartData.length > 1 && (
        <>
          <h3 className="text-cyan-400 font-semibold text-sm border-l-2 border-cyan-400 pl-2">년도별 수입 / 지출 비교</h3>
          <div className="p-4 bg-slate-800/30 rounded-lg border border-cyan-500/10">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={yearChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,210,255,0.05)" vertical={false} />
                <XAxis dataKey="year" stroke="#4a6d7c" fontSize={12} tickLine={false} />
                <YAxis stroke="#4a6d7c" fontSize={11} tickFormatter={v => `${(v / 1e4).toFixed(0)}만`} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: 'rgba(10,25,40,0.95)', border: '1px solid rgba(0,210,255,0.3)', borderRadius: '8px' }}
                  formatter={(v, name) => [fmt(v), name === 'income' ? '수입' : name === 'expense' ? '지출' : '순이익']}
                  cursor={{fill: 'rgba(0,210,255,0.05)'}}
                />
                <Bar dataKey="income" name="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* 년도별 세부 비교 테이블 */}
      {years.length > 0 && (
        <>
          <h3 className="text-cyan-400 font-semibold text-sm border-l-2 border-cyan-400 pl-2">년도별 현금흐름 비교표</h3>
          <CyberTable
            headers={['년도', {label:'수입',align:'right'}, {label:'지출',align:'right'}, {label:'순이익',align:'right'}, {label:'저축률',align:'right'}]}
            rows={years.map(y => {
              const yd = yearlyCompareData[y]
              const sr = yd.income > 0 ? ((yd.net / yd.income) * 100) : 0
              return [
                <span className={`font-bold ${y === currentYear ? 'text-cyan-400' : 'text-cyan-200'}`}>{y}년 {y === currentYear ? '(올해)' : ''}</span>,
                <span className="text-emerald-400 font-semibold">{fmtC(yd.income)}</span>,
                <span className="text-rose-400 font-semibold">{fmtC(yd.expense)}</span>,
                <PnlText value={yd.net} suffix="원" />,
                <span className={`font-bold ${sr >= 20 ? 'text-emerald-400' : sr >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>{sr.toFixed(1)}%</span>
              ]
            })}
          />
        </>
      )}

      {/* 월별 년도간 비교 (전년 vs 올해) */}
      {prevData && curData && prevData.monthly && curData.monthly && (
        <>
          <h3 className="text-cyan-400 font-semibold text-sm border-l-2 border-cyan-400 pl-2">월별 비교 ({prevYear}년 vs {currentYear}년)</h3>
          <div className="p-4 bg-slate-800/30 rounded-lg border border-cyan-500/10">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={curData.monthly.map((m, i) => ({
                month: m.month,
                [`${prevYear} 순이익`]: prevData.monthly[i]?.net || 0,
                [`${currentYear} 순이익`]: m.net || 0
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,210,255,0.05)" vertical={false} />
                <XAxis dataKey="month" stroke="#4a6d7c" fontSize={11} tickLine={false} />
                <YAxis stroke="#4a6d7c" fontSize={11} tickFormatter={v => `${(v / 1e4).toFixed(0)}만`} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: 'rgba(10,25,40,0.95)', border: '1px solid rgba(0,210,255,0.3)', borderRadius: '8px' }}
                  formatter={(v) => [fmt(v)]}
                  cursor={{fill: 'rgba(0,210,255,0.05)'}}
                />
                <Bar dataKey={`${prevYear} 순이익`} fill="#6366f1" radius={[4, 4, 0, 0]} opacity={0.6} />
                <Bar dataKey={`${currentYear} 순이익`} fill="#00d4ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <CyberTable
            headers={['월', {label:`${prevYear} 수입`,align:'right'}, {label:`${prevYear} 지출`,align:'right'}, {label:`${currentYear} 수입`,align:'right'}, {label:`${currentYear} 지출`,align:'right'}, {label:'증감',align:'right'}]}
            rows={curData.monthly.map((m, i) => {
              const prev = prevData.monthly[i] || { income: 0, expense: 0, net: 0 }
              const hasData = m.income > 0 || m.expense > 0 || prev.income > 0 || prev.expense > 0
              if (!hasData) return null
              const diff = m.net - prev.net
              return [
                <span className="font-bold text-cyan-200">{m.month}</span>,
                <span className="text-cyan-300/60">{fmtC(prev.income)}</span>,
                <span className="text-cyan-300/60">{fmtC(prev.expense)}</span>,
                <span className="text-emerald-400 font-semibold">{fmtC(m.income)}</span>,
                <span className="text-rose-400 font-semibold">{fmtC(m.expense)}</span>,
                <PnlText value={diff} suffix="원" />
              ]
            }).filter(Boolean)}
          />
        </>
      )}
    </div>
  )
}

/* ═══ 8. Market ═══ */
// 일/주/월 트렌드 차트 + 메타 정보를 보여주는 Market Overview 상세 모달
const RANGE_PRESETS = {
  day: { range: '1mo', interval: '1d', label: '일간', desc: '최근 1개월 일별 종가' },
  week: { range: '6mo', interval: '1wk', label: '주간', desc: '최근 6개월 주별 종가' },
  month: { range: '5y', interval: '1mo', label: '월간', desc: '최근 5년 월별 종가' }
}

const formatPriceTick = (value, unit) => {
  if (value == null || Number.isNaN(value)) return ''
  const num = Number(value)
  if (unit === 'USD') {
    if (num >= 10000) return `$${(num / 1000).toFixed(1)}K`
    return `$${num.toFixed(0)}`
  }
  if (num >= 10000) return `${(num / 1000).toFixed(0)}K`
  return num.toFixed(0)
}

const formatPriceFull = (value, unit) => {
  if (value == null || Number.isNaN(value)) return '-'
  const num = Number(value)
  if (unit === 'USD') return `$${num.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  return num.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
}

const MarketDetail = ({ d }) => {
  const { label = '', value = '', change = 0, symbol = '', unit = 'USD' } = d || {}

  const [preset, setPreset] = useState('day')
  const [series, setSeries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // 사용자가 차트의 점을 클릭하여 고른 시점. null 이면 최근 시점을 자동 표시.
  const [selectedPoint, setSelectedPoint] = useState(null)
  // 호버 중인 시점 (실시간 미리보기) — 클릭 핀과 별개.
  const [hoverPoint, setHoverPoint] = useState(null)

  useEffect(() => {
    if (!symbol) {
      setLoading(false)
      return
    }
    let cancelled = false
    const cfg = RANGE_PRESETS[preset]
    setLoading(true)
    setError(null)
    marketDataService
      .getHistoricalPrices(symbol, cfg.range, cfg.interval)
      .then(res => {
        if (cancelled) return
        const list = Array.isArray(res?.series) ? res.series : []
        setSeries(list)
        if (list.length === 0) setError('데이터를 받지 못했습니다.')
      })
      .catch(err => {
        if (cancelled) return
        setError(err?.message || '시계열 조회 실패')
        setSeries([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [symbol, preset])

  // 프리셋(기간) 변경 시 핀/호버 선택 초기화
  useEffect(() => {
    setSelectedPoint(null)
    setHoverPoint(null)
  }, [preset])

  // 시계열 통계 계산
  const stats = (() => {
    if (!series || series.length < 2) return null
    const closes = series.map(s => Number(s.close)).filter(n => Number.isFinite(n))
    if (closes.length < 2) return null
    const first = closes[0]
    const last = closes[closes.length - 1]
    const min = Math.min(...closes)
    const max = Math.max(...closes)
    const totalChange = last - first
    const totalChangePercent = first > 0 ? ((last - first) / first) * 100 : 0
    return { first, last, min, max, totalChange, totalChangePercent }
  })()

  let insight = ''
  if (change >= 2) insight = '강한 매수세가 유입되는 급등 구간입니다.'
  else if (change > 0) insight = '안정적인 상승 흐름을 유지하고 있습니다.'
  else if (change > -2) insight = '약보합 혹은 횡보 조정을 거치고 있습니다.'
  else insight = '매도세가 강한 하락 구간입니다. 리스크 관리에 유의하세요.'

  return (
    <div className="space-y-5">
      <AIInsightBadge icon={Globe} title="Market Sentiment" message={insight} type={change >= 0 ? 'success' : 'danger'} />

      {/* 현재 값 요약 */}
      <div className="cyber-stat-item text-center py-6 bg-slate-800/30">
        <p className="text-cyan-300/60 text-xs mb-2 uppercase tracking-widest">{label} {symbol && `(${symbol})`}</p>
        <p className="text-white font-black text-4xl sm:text-5xl mb-3 tracking-tight">{value}</p>
        <div className="inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700">
          {change >= 0 ? <ArrowUpRight className="w-4 h-4 text-emerald-400" /> : <ArrowDownRight className="w-4 h-4 text-rose-400" />}
          <span className={`text-base font-bold ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {Math.abs(change).toFixed(2)}%
          </span>
          <span className="text-xs text-slate-500">vs prev close</span>
        </div>
      </div>

      {/* 일/주/월 토글 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h4 className="text-sm font-semibold text-cyan-300">트렌드 차트</h4>
          <span className="text-xs text-slate-500">— {RANGE_PRESETS[preset].desc}</span>
        </div>
        <div className="flex items-center gap-1 bg-slate-800/50 border border-cyan-400/30 p-1 rounded-lg">
          {Object.entries(RANGE_PRESETS).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setPreset(key)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                preset === key
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-cyan-300/60 hover:text-cyan-300'
              }`}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* 차트 */}
      <div className="cyber-card p-4">
        {loading ? (
          <div className="flex items-center justify-center h-[260px] text-cyan-300/60 text-sm">로딩 중...</div>
        ) : error ? (
          <div className="flex items-center justify-center h-[260px] text-rose-300/80 text-sm">{error}</div>
        ) : series.length < 2 ? (
          <div className="flex items-center justify-center h-[260px] text-slate-400 text-sm">표시할 데이터가 없습니다</div>
        ) : (
          <>
            {/* 선택된 시점 패널 — 클릭으로 핀, 호버 시 임시 미리보기. 둘 다 없으면 최근 값 */}
            {(() => {
              const activePoint = hoverPoint || selectedPoint || series[series.length - 1]
              const firstClose = stats?.first ?? activePoint.close
              const diff = activePoint.close - firstClose
              const diffPct = firstClose > 0 ? (diff / firstClose) * 100 : 0
              const isPinned = !!selectedPoint && !hoverPoint
              return (
                <div className={`flex items-center justify-between gap-3 mb-3 p-2 rounded-lg border ${isPinned ? 'bg-cyan-500/10 border-cyan-400/40' : 'bg-slate-800/40 border-slate-700'} flex-wrap`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] uppercase tracking-wider ${isPinned ? 'text-cyan-300' : 'text-slate-400'}`}>
                      {isPinned ? '📍 선택' : hoverPoint ? '👁️ 미리보기' : '최근'}
                    </span>
                    <span className="text-xs text-cyan-200 font-mono">{activePoint.date}</span>
                    <span className="text-base sm:text-lg font-bold text-white">{formatPriceFull(activePoint.close, unit)}</span>
                    <span className={`text-xs font-semibold ${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {diff >= 0 ? '+' : ''}{diffPct.toFixed(2)}% (vs 시작)
                    </span>
                  </div>
                  {selectedPoint && (
                    <button
                      onClick={() => setSelectedPoint(null)}
                      className="text-[10px] text-slate-400 hover:text-rose-300 px-2 py-0.5 rounded border border-slate-700 hover:border-rose-400/40 transition-colors"
                    >
                      핀 해제
                    </button>
                  )}
                </div>
              )
            })()}

            <p className="text-[10px] text-slate-500 mb-1 text-center">
              💡 차트의 점을 클릭하면 해당 시점이 고정됩니다. 모바일은 탭으로 선택.
            </p>

            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={series}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                onClick={(state) => {
                  const payload = state?.activePayload?.[0]?.payload
                  if (payload) {
                    setSelectedPoint(payload)
                  }
                }}
                onMouseMove={(state) => {
                  const payload = state?.activePayload?.[0]?.payload
                  setHoverPoint(payload || null)
                }}
                onMouseLeave={() => setHoverPoint(null)}
              >
                <defs>
                  <linearGradient id="marketGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,210,255,0.1)" />
                <XAxis
                  dataKey="date"
                  stroke="#4a6d7c"
                  fontSize={10}
                  tickFormatter={(v) => {
                    if (!v || v.length < 7) return v
                    return preset === 'month' ? v.substring(0, 7) : v.substring(5)
                  }}
                  minTickGap={20}
                />
                <YAxis
                  stroke="#4a6d7c"
                  fontSize={10}
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => formatPriceTick(v, unit)}
                />
                <Tooltip
                  contentStyle={{ background: 'rgba(10,25,40,0.95)', border: '1px solid rgba(0,210,255,0.3)', borderRadius: '8px' }}
                  labelStyle={{ color: '#00d4ff' }}
                  formatter={(v) => [formatPriceFull(v, unit), label]}
                />
                {stats?.first != null && (
                  <ReferenceLine y={stats.first} stroke="rgba(148,163,184,0.4)" strokeDasharray="3 3" />
                )}
                {/* 클릭으로 고정된 시점 강조선 */}
                {selectedPoint && (
                  <ReferenceLine x={selectedPoint.date} stroke="#67e8f9" strokeWidth={1.5} strokeDasharray="2 4" />
                )}
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke="#00d4ff"
                  strokeWidth={2}
                  dot={{ r: 1.5, fill: '#00d4ff', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#67e8f9', stroke: '#0e7490', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* 통계 요약 */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 text-xs">
                <div className="bg-slate-800/30 rounded p-2">
                  <p className="text-cyan-300/60 mb-1">시작</p>
                  <p className="font-bold text-white">{formatPriceFull(stats.first, unit)}</p>
                </div>
                <div className="bg-slate-800/30 rounded p-2">
                  <p className="text-cyan-300/60 mb-1">현재</p>
                  <p className="font-bold text-white">{formatPriceFull(stats.last, unit)}</p>
                </div>
                <div className="bg-slate-800/30 rounded p-2">
                  <p className="text-cyan-300/60 mb-1">최저 / 최고</p>
                  <p className="font-bold text-white text-[11px]">
                    {formatPriceFull(stats.min, unit)} / {formatPriceFull(stats.max, unit)}
                  </p>
                </div>
                <div className="bg-slate-800/30 rounded p-2">
                  <p className="text-cyan-300/60 mb-1">기간 변화</p>
                  <p className={`font-bold ${stats.totalChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {stats.totalChange >= 0 ? '+' : ''}{stats.totalChangePercent.toFixed(2)}%
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ═══ 9/10. Performers ═══ */
const PerformersDetail = ({ d, isGainer }) => {
  const items = d?.items || []
  const maxVal = items.length > 0 ? Math.max(...items.map(i => Math.abs(i.profitPercent))) : 1

  return (
    <div className="space-y-4">
      <AIInsightBadge 
        icon={isGainer ? TrendingUp : TrendingDown} 
        title={isGainer ? "수익 견인 종목" : "손실 방어 필요 종목"} 
        message={isGainer ? "포트폴리오 수익을 견인하는 핵심 동력원입니다." : "시장 상황에 따라 추가 매수(물타기) 혹은 손절 기준을 재점검하세요."}
        type={isGainer ? 'success' : 'danger'}
      />
      <CyberTable
        headers={['순위', '종목', {label:'평가금 / 손익액',align:'right'}, {label:'수익률 크기',align:'left'}, {label:'수익률',align:'right'}]}
        rows={items.map((p, i) => [
          <span className="font-bold opacity-50">#{i + 1}</span>,
          <div className="flex flex-col">
            <span className="font-bold">{p.symbol}</span>
            {p.name !== p.symbol && <span className="text-[10px] text-cyan-300/40">{p.name}</span>}
          </div>,
          <div className="flex flex-col items-end">
            <span className="font-bold">{fmtC(p.valueKRW || 0)}</span>
            <span className="text-xs"><PnlText value={p.profitKRW || 0} suffix="원" /></span>
          </div>,
          <SparklineBar value={p.profitPercent} max={maxVal} color={isGainer ? '#10b981' : '#f43f5e'} />,
          <PnlText value={p.profitPercent} suffix="%" />
        ])}
      />
    </div>
  )
}

/* ═══ 11. Allocation ═══ */
const AllocationDetail = ({ d }) => {
  const { allocationData = [], portfolioSummary = {} } = d
  const total = portfolioSummary.totalValueKRW || 1
  
  // 위험도 판별 로직
  const stockCrypto = allocationData.filter(a => ['주식', '코인', 'Stock', 'Crypto'].some(k => a.name.includes(k))).reduce((s, a) => s + a.value, 0)
  const safeAsset = allocationData.filter(a => ['현금', '예금', '적금', 'Cash', 'Deposit'].some(k => a.name.includes(k))).reduce((s, a) => s + a.value, 0)
  const stockRatio = (stockCrypto / total) * 100
  const safeRatio = (safeAsset / total) * 100

  let riskType = 'Moderate (중도성향)'
  let riskMsg = '위험 자산과 안전 자산이 균형 잡힌 표준적인 포트폴리오입니다.'
  let badgeType = 'info'

  if (stockRatio >= 70) {
    riskType = 'Aggressive (공격투자형)'
    riskMsg = `주식/코인 등 위험자산 비중이 ${stockRatio.toFixed(0)}%로 매우 높습니다. 시장 하락 시 변동성 위험이 크므로 대비가 필요합니다.`
    badgeType = 'danger'
  } else if (safeRatio >= 50) {
    riskType = 'Conservative (안전지향형)'
    riskMsg = `안전 자산 비중이 ${safeRatio.toFixed(0)}%로 높습니다. 자산 보호에는 유리하지만 인플레이션 방어를 위한 투자처 발굴이 필요할 수 있습니다.`
    badgeType = 'success'
  }

  return (
    <div className="space-y-6">
      <AIInsightBadge icon={Zap} title={`Risk Profile : ${riskType}`} message={riskMsg} type={badgeType} />

      <div className="p-4 bg-slate-800/30 rounded-lg border border-cyan-500/10">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={allocationData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={4} stroke="none">
              {allocationData.map((e, i) => <Cell key={e.name} fill={CYBER_COLORS[i % CYBER_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: 'rgba(10,25,40,0.95)', border: '1px solid rgba(0,210,255,0.3)', borderRadius: '8px' }} formatter={v => fmt(v)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <CyberTable
        headers={['자산 클래스명', {label:'투입 금액',align:'right'}, {label:'비중 점유율',align:'right'}]}
        rows={allocationData.map((a, i) => [
          <span className="flex items-center gap-3 font-medium">
            <span className="w-3 h-3 rounded-full shrink-0 shadow-md" style={{ background: CYBER_COLORS[i % CYBER_COLORS.length] }} />
            {a.name}
          </span>,
          fmt(a.value),
          <span className="text-cyan-200 font-bold">{((a.value / total) * 100).toFixed(1)}%</span>
        ])}
      />
    </div>
  )
}

/* ═══ 12. Goals ═══ */
const GoalsDetail = ({ d }) => {
  const { goals = [] } = d
  return (
    <div className="space-y-6">
      <AIInsightBadge icon={Target} title="목표 추적 시스템" message={`${goals.length}개의 재무 목표를 트래킹하고 있습니다. 100% 달성에 가장 근접한 목표에 화력을 집중해보세요.`} type="info" />
      {goals.length === 0 && <p className="text-cyan-300/40 text-center py-8">설정된 목표가 없습니다</p>}
      <div className="space-y-4">
        {goals.map((g, i) => (
          <div key={i} className="p-4 rounded-lg bg-slate-800/40 border border-cyan-500/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-cyan-100 font-bold text-base">{g.name}</span>
              <span className={`font-black text-xl ${g.progress >= 100 ? 'neon-text-green text-emerald-400' : 'text-cyan-400'}`}>
                {g.progress?.toFixed(1)}%
              </span>
            </div>
            <div className="cyber-progress h-2 bg-slate-900 overflow-hidden">
              <div className="cyber-progress-bar h-full transition-all duration-1000" style={{ width: `${Math.min(g.progress || 0, 100)}%`, background: g.progress >= 100 ? '#10b981' : '#00d4ff' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══ 13. Net Change ═══ */
const NetChangeDetail = ({ d }) => {
  const { monthlyNetChanges = [], yearlyFlow = {} } = d
  
  const totalIncome = monthlyNetChanges.reduce((sum, m) => sum + (m.income || 0), 0)
  const totalExpense = monthlyNetChanges.reduce((sum, m) => sum + (m.expense || 0), 0)
  const totalNet = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? ((totalNet / totalIncome) * 100) : 0
  const activeMonths = monthlyNetChanges.filter(m => m.income > 0 || m.expense > 0)
  const avgMonthlyNet = activeMonths.length > 0 ? totalNet / activeMonths.length : 0
  const bestMonth = [...monthlyNetChanges].sort((a, b) => b.value - a.value)[0]
  const worstMonth = [...monthlyNetChanges].sort((a, b) => a.value - b.value)[0]

  return (
    <div className="space-y-6">
      <AIInsightBadge 
        icon={BarChart3} 
        title="현금흐름 종합 분석" 
        message={`올해 총 수입 ${fmt(totalIncome)} 중 ${savingsRate.toFixed(1)}%를 저축/잉여금으로 확보하고 있습니다. ${bestMonth?.month || ''}에 가장 많은 잉여금이 발생했습니다.`}
        type={savingsRate >= 20 ? 'success' : savingsRate >= 0 ? 'warning' : 'danger'}
      />

      {/* 연간 요약 지표 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="cyber-stat-item text-center p-4">
          <p className="text-cyan-300/60 text-xs mb-1">연간 총 수입</p>
          <p className="neon-text-green font-bold text-xl">{fmt(totalIncome)}</p>
        </div>
        <div className="cyber-stat-item text-center p-4 bg-slate-800/40">
          <p className="text-cyan-300/60 text-xs mb-1">연간 총 지출</p>
          <p className="neon-text-red font-bold text-xl">{fmt(totalExpense)}</p>
        </div>
        <div className="cyber-stat-item text-center p-4 bg-slate-800/40">
          <p className="text-cyan-300/60 text-xs mb-1">순이익 (잉여금)</p>
          <p className={`font-bold text-xl ${totalNet >= 0 ? 'neon-text-green' : 'neon-text-red'}`}>{fmt(totalNet)}</p>
        </div>
        <div className="cyber-stat-item text-center p-4 bg-slate-800/40">
          <p className="text-cyan-300/60 text-xs mb-1">저축률</p>
          <p className={`font-bold text-xl ${savingsRate >= 20 ? 'neon-text-green' : savingsRate >= 0 ? 'text-amber-400' : 'neon-text-red'}`}>{savingsRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* 수입/지출 비교 바차트 */}
      <h3 className="text-cyan-400 font-semibold text-sm border-l-2 border-cyan-400 pl-2">월별 수입 vs 지출 비교</h3>
      <div className="p-4 bg-slate-800/30 rounded-lg border border-cyan-500/10">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyNetChanges}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,210,255,0.05)" vertical={false} />
            <XAxis dataKey="month" stroke="#4a6d7c" fontSize={11} tickLine={false} />
            <YAxis stroke="#4a6d7c" fontSize={11} tickFormatter={v => `${(v / 1e4).toFixed(0)}만`} axisLine={false} tickLine={false} />
            <Tooltip 
              contentStyle={{ background: 'rgba(10,25,40,0.95)', border: '1px solid rgba(0,210,255,0.3)', borderRadius: '8px' }} 
              formatter={(v, name) => [fmt(v), name === 'income' ? '수입' : name === 'expense' ? '지출' : '순변동']}
              cursor={{fill: 'rgba(0,210,255,0.05)'}}
            />
            <Bar dataKey="income" name="income" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.8} />
            <Bar dataKey="expense" name="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} opacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 순변동 흐름 차트 */}
      <h3 className="text-cyan-400 font-semibold text-sm border-l-2 border-cyan-400 pl-2">월별 순변동 흐름</h3>
      <div className="p-4 bg-slate-800/30 rounded-lg border border-cyan-500/10">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyNetChanges}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,210,255,0.05)" vertical={false} />
            <XAxis dataKey="month" stroke="#4a6d7c" fontSize={11} tickLine={false} />
            <YAxis stroke="#4a6d7c" fontSize={11} tickFormatter={v => `${(v / 1e4).toFixed(0)}만`} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'rgba(10,25,40,0.95)', border: '1px solid rgba(0,210,255,0.3)', borderRadius: '8px' }} formatter={v => [fmt(v), '순변동']} cursor={{fill: 'rgba(0,210,255,0.05)'}} />
            <Bar dataKey="value" radius={[4, 4, 4, 4]}>
              {monthlyNetChanges.map((e, i) => <Cell key={i} fill={e.value >= 0 ? '#10b981' : '#f43f5e'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 월별 세부 내역 테이블 */}
      <h3 className="text-cyan-400 font-semibold text-sm border-l-2 border-cyan-400 pl-2">월별 세부 내역</h3>
      <CyberTable
        headers={['월', {label:'수입',align:'right'}, {label:'지출',align:'right'}, {label:'순변동',align:'right'}, {label:'비율',align:'right'}]}
        rows={monthlyNetChanges.filter(m => m.income > 0 || m.expense > 0).map(m => [
          <span className="font-bold text-cyan-200">{m.month}</span>,
          <span className="text-emerald-400 font-semibold">{fmtC(m.income || 0)}</span>,
          <span className="text-rose-400 font-semibold">{fmtC(m.expense || 0)}</span>,
          <PnlText value={m.value} suffix="원" />,
          <span className={`text-xs font-bold ${(m.income || 0) > 0 && ((m.value / m.income) * 100) >= 20 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {(m.income || 0) > 0 ? ((m.value / m.income) * 100).toFixed(1) : 0}%
          </span>
        ])}
      />

      {/* 하이라이트 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="cyber-stat-item p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-center">
          <p className="text-cyan-300/60 text-xs mb-1">🟢 최고 잉여금 ({bestMonth?.month})</p>
          <p className="neon-text-green font-bold text-lg">{fmt(bestMonth?.value || 0)}</p>
        </div>
        <div className="cyber-stat-item p-4 bg-rose-500/5 border border-rose-500/20 rounded-lg text-center">
          <p className="text-cyan-300/60 text-xs mb-1">🔴 최저/적자 ({worstMonth?.month})</p>
          <p className="neon-text-red font-bold text-lg">{fmt(worstMonth?.value || 0)}</p>
        </div>
      </div>
    </div>
  )
}

/* ═══ 14. Activities ═══ */
const ActivitiesDetail = ({ d }) => {
  const { activities = [] } = d
  return (
    <div className="space-y-6">
      <AIInsightBadge icon={Clock} title="타임라인 로거" message="시스템에 기록된 자산 매수, 매도, 배당 수령 등 모든 활동 로그입니다. 투명한 트래킹을 제공합니다." type="info" />
      <CyberTable
        headers={['이벤트 유형', '상세 설명', {label:'변동액',align:'right'}, '발생 날짜']}
        rows={activities.map(a => [
          <span className={`px-2 py-1 rounded text-xs font-bold ${a.type === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : a.type === 'sell' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
            {a.type === 'buy' ? 'BUY' : a.type === 'sell' ? 'SELL' : 'DIVIDEND'}
          </span>,
          <div className="flex flex-col">
            <span className="font-medium text-cyan-50">{a.symbol || ''} {a.type === 'buy' ? '매수' : a.type === 'sell' ? '매도' : '배당'}</span>
            {a.name && <span className="text-[10px] text-cyan-300/40">{a.name}</span>}
          </div>,
          <PnlText value={a.amount} suffix="원" />,
          <span className="text-cyan-300/60 text-xs">{a.date}</span>
        ])}
      />
    </div>
  )
}

/* ═══ Benchmark 심층 분석 ═══ */
const BenchmarkDetail = ({ d }) => {
  const { snapshots = [], spy = null, kospi = null } = d || {}

  const portfolioSeries = normalizeToBase100(portfolioSnapshotsToSeries(snapshots))
  const spySeries = normalizeToBase100(downsampleToMonthly(spy?.series || []))
  const kospiSeries = normalizeToBase100(downsampleToMonthly(kospi?.series || []))
  const merged = mergeForChart({ portfolio: portfolioSeries, spy: spySeries, kospi: kospiSeries })

  const alphaSpy = calculateAlpha(portfolioSeries, spySeries)
  const alphaKospi = calculateAlpha(portfolioSeries, kospiSeries)

  // 시작 / 현재 누적 수익률
  const lastIndexed = (series) => [...series].reverse().find(p => p?.indexed != null)?.indexed ?? null
  const pLast = lastIndexed(portfolioSeries)
  const sLast = lastIndexed(spySeries)
  const kLast = lastIndexed(kospiSeries)

  const periodLabel = portfolioSeries.length > 0
    ? `${portfolioSeries[0].date} ~ ${portfolioSeries[portfolioSeries.length - 1].date}`
    : '데이터 부족'

  let insight = ''
  if (alphaSpy != null && alphaKospi != null) {
    if (alphaSpy >= 0 && alphaKospi >= 0) insight = `글로벌·국내 벤치마크 모두 상회. 종목 선택이 양 시장의 시세를 끌어내고 있습니다 (SPY +${alphaSpy}%p, KOSPI +${alphaKospi}%p).`
    else if (alphaSpy < 0 && alphaKospi < 0) insight = `두 벤치마크 모두 미달. 비중·종목 구성을 재점검하세요 (SPY ${alphaSpy}%p, KOSPI ${alphaKospi}%p).`
    else if (alphaSpy >= 0) insight = `미국 시장은 상회(SPY +${alphaSpy}%p)하지만 국내 대비(${alphaKospi}%p)는 약함. KRW 자산 비중 확대 검토 가능.`
    else insight = `국내 시장 상회(KOSPI +${alphaKospi}%p), 미국 대비(${alphaSpy}%p) 약함. USD 자산 비중 강화 검토.`
  } else insight = '벤치마크 비교에 필요한 데이터가 누적되면 더 정확한 분석이 가능합니다.'

  if (portfolioSeries.length < 2) {
    return (
      <div className="text-center py-12">
        <Activity className="w-10 h-10 text-cyan-400/40 mx-auto mb-3" />
        <p className="text-cyan-300/60">월별 스냅샷이 최소 2개 이상 누적되어야 분석이 가능합니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <AIInsightBadge icon={TrendingUp} title="Benchmark Sentiment" message={insight} type={(alphaSpy ?? 0) >= 0 && (alphaKospi ?? 0) >= 0 ? 'success' : 'danger'} />

      {/* α 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="cyber-stat-item p-3 bg-slate-800/40">
          <p className="text-cyan-300/60 text-[10px] uppercase tracking-wider mb-1">기간</p>
          <p className="text-cyan-200 text-xs font-mono">{periodLabel}</p>
        </div>
        <div className="cyber-stat-item p-3 bg-slate-800/40">
          <p className="text-cyan-300/60 text-[10px] uppercase tracking-wider mb-1">α vs SPY</p>
          <p className={`text-lg font-bold ${(alphaSpy ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {alphaSpy != null ? `${alphaSpy >= 0 ? '+' : ''}${alphaSpy}%p` : '-'}
          </p>
        </div>
        <div className="cyber-stat-item p-3 bg-slate-800/40">
          <p className="text-cyan-300/60 text-[10px] uppercase tracking-wider mb-1">α vs KOSPI</p>
          <p className={`text-lg font-bold ${(alphaKospi ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {alphaKospi != null ? `${alphaKospi >= 0 ? '+' : ''}${alphaKospi}%p` : '-'}
          </p>
        </div>
      </div>

      {/* 큰 차트 */}
      <div className="cyber-card p-4">
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={merged} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,210,255,0.1)" />
            <XAxis dataKey="month" stroke="#4a6d7c" fontSize={11} />
            <YAxis stroke="#4a6d7c" fontSize={11} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: 'rgba(10,25,40,0.95)', border: '1px solid rgba(0,210,255,0.3)', borderRadius: '8px' }}
              labelStyle={{ color: '#00d4ff' }}
              formatter={(v, name) => {
                const labels = { portfolio: '내 포트폴리오', spy: 'S&P 500', kospi: 'KOSPI' }
                if (v == null) return ['-', labels[name] || name]
                return [`${v} (${(v - 100).toFixed(2)}%)`, labels[name] || name]
              }}
            />
            <ReferenceLine y={100} stroke="rgba(148,163,184,0.4)" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="portfolio" stroke="#00d4ff" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
            <Line type="monotone" dataKey="spy" stroke="#34d399" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="kospi" stroke="#fb7185" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-slate-500 mt-2 text-center">
          시작 시점을 100 으로 두고 이후 누적 수익률 비율을 비교합니다.
        </p>
      </div>

      {/* 누적 수익률 표 */}
      <CyberTable
        headers={['지표', { label: '시작', align: 'right' }, { label: '현재', align: 'right' }, { label: '누적 수익률', align: 'right' }]}
        rows={[
          ['🟦 내 포트폴리오', '100.00', pLast != null ? pLast.toFixed(2) : '-', pLast != null ? <PnlText value={pLast - 100} suffix="%" /> : '-'],
          ['🟢 SPY', '100.00', sLast != null ? sLast.toFixed(2) : '-', sLast != null ? <PnlText value={sLast - 100} suffix="%" /> : '-'],
          ['🟥 KOSPI', '100.00', kLast != null ? kLast.toFixed(2) : '-', kLast != null ? <PnlText value={kLast - 100} suffix="%" /> : '-']
        ]}
      />
    </div>
  )
}

/* ═══ 월간 종합 수익 심층 분석 ═══ */
const MonthlyReturnDetail = ({ d }) => {
  const { snapshots = [] } = d || {}

  // BenchmarkChart 와 동일한 계산 로직 — 매월 자본수익 + 배당 delta
  const series = (() => {
    if (!Array.isArray(snapshots) || snapshots.length === 0) return []
    const sorted = [...snapshots].filter(s => s?.date).sort((a, b) => a.date.localeCompare(b.date))
    return sorted.map((s, idx) => {
      const prev = idx > 0 ? sorted[idx - 1] : null
      const cg = idx === 0 ? 0 : (Number(s.totalProfit) || 0) - (Number(prev?.totalProfit) || 0)
      const dv = idx === 0 ? 0 : (Number(s.dividendTotal) || 0) - (Number(prev?.dividendTotal) || 0)
      const total = cg + dv
      const monthLabel = s.date.length >= 7 ? `${parseInt(s.date.substring(5, 7), 10)}월` : s.date
      return { date: s.date, month: monthLabel, capitalGain: cg, dividend: dv, total }
    })
  })()

  if (series.length < 2) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-10 h-10 text-cyan-400/40 mx-auto mb-3" />
        <p className="text-cyan-300/60">월별 스냅샷이 최소 2개 이상 누적되어야 분석이 가능합니다.</p>
      </div>
    )
  }

  // 누적 라인용 데이터
  const cumulative = (() => {
    let acc = 0
    return series.map(s => {
      acc += s.total
      return { month: s.month, date: s.date, cumulative: acc }
    })
  })()

  // 통계
  const totalReturn = series.reduce((s, d) => s + d.total, 0)
  const totalCapital = series.reduce((s, d) => s + d.capitalGain, 0)
  const totalDividend = series.reduce((s, d) => s + d.dividend, 0)
  const positiveMonths = series.filter(d => d.total > 0).length
  const negativeMonths = series.filter(d => d.total < 0).length
  const bestMonth = series.reduce((best, cur) => cur.total > (best?.total ?? -Infinity) ? cur : best, null)
  const worstMonth = series.reduce((worst, cur) => cur.total < (worst?.total ?? Infinity) ? cur : worst, null)
  const avgMonthly = series.length > 0 ? totalReturn / series.length : 0

  let insight = ''
  if (totalReturn > 0) {
    insight = `기간 누적 ${fmtC(totalReturn)} 의 종합 수익을 확보. 자본수익 ${fmtC(totalCapital)} + 배당 ${fmtC(totalDividend)}.`
  } else {
    insight = `기간 누적 ${fmtC(totalReturn)} 의 손실. 배당 ${fmtC(totalDividend)} 으로 자본손실(${fmtC(totalCapital)})을 일부 상쇄 중.`
  }

  return (
    <div className="space-y-5">
      <AIInsightBadge icon={BarChart3} title="Monthly Return Sentiment" message={insight} type={totalReturn >= 0 ? 'success' : 'danger'} />

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="cyber-stat-item p-3 bg-slate-800/40">
          <p className="text-cyan-300/60 text-[10px] uppercase mb-1">기간 누적</p>
          <p className={`text-base font-bold ${totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalReturn >= 0 ? '+' : ''}{fmtC(totalReturn)}
          </p>
        </div>
        <div className="cyber-stat-item p-3 bg-slate-800/40">
          <p className="text-cyan-300/60 text-[10px] uppercase mb-1">월 평균</p>
          <p className={`text-base font-bold ${avgMonthly >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {avgMonthly >= 0 ? '+' : ''}{fmtC(avgMonthly)}
          </p>
        </div>
        <div className="cyber-stat-item p-3 bg-slate-800/40">
          <p className="text-cyan-300/60 text-[10px] uppercase mb-1">+ / − 월</p>
          <p className="text-base font-bold text-white">
            <span className="text-emerald-400">{positiveMonths}</span> / <span className="text-rose-400">{negativeMonths}</span>
          </p>
        </div>
        <div className="cyber-stat-item p-3 bg-slate-800/40">
          <p className="text-cyan-300/60 text-[10px] uppercase mb-1">최고 / 최저 월</p>
          <p className="text-[11px] font-bold text-white">
            <span className="text-emerald-400">{bestMonth?.date?.substring(5)}({fmtC(bestMonth?.total || 0)})</span><br />
            <span className="text-rose-400">{worstMonth?.date?.substring(5)}({fmtC(worstMonth?.total || 0)})</span>
          </p>
        </div>
      </div>

      {/* 누적 수익 라인차트 */}
      <div className="cyber-card p-4">
        <p className="text-sm font-semibold text-cyan-300 mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" /> 누적 종합 수익 추이
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={cumulative}>
            <defs>
              <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,210,255,0.1)" />
            <XAxis dataKey="month" stroke="#4a6d7c" fontSize={11} />
            <YAxis stroke="#4a6d7c" fontSize={11} tickFormatter={fmtC} />
            <Tooltip
              contentStyle={{ background: 'rgba(10,25,40,0.95)', border: '1px solid rgba(0,210,255,0.3)', borderRadius: '8px' }}
              labelStyle={{ color: '#00d4ff' }}
              formatter={(v) => [fmtC(v), '누적 수익']}
            />
            <ReferenceLine y={0} stroke="rgba(148,163,184,0.4)" />
            <Area type="monotone" dataKey="cumulative" stroke="#00d4ff" strokeWidth={2} fill="url(#cumGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 월별 상세 표 */}
      <CyberTable
        headers={['월', { label: '자본수익', align: 'right' }, { label: '배당', align: 'right' }, { label: '종합', align: 'right' }]}
        rows={series.map(s => [
          <div className="flex flex-col">
            <span className="font-bold text-cyan-200">{s.month}</span>
            <span className="text-[10px] text-cyan-300/40">{s.date}</span>
          </div>,
          <PnlText value={s.capitalGain} suffix="원" />,
          <span className="text-amber-300">{fmtC(s.dividend)}</span>,
          <PnlText value={s.total} suffix="원" />
        ])}
      />
    </div>
  )
}

export default DashboardDetailDialog
