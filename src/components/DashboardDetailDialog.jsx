import { useEffect } from 'react'
import { X, TrendingUp, TrendingDown, Wallet, BarChart3, PiggyBank, Target, Globe, Zap, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const CYBER_COLORS = ['#00d4ff', '#00ff88', '#ffd700', '#ff6b6b', '#a855f7', '#06b6d4', '#f97316']

const fmt = (v, cur = 'KRW') => {
  if (!Number.isFinite(v)) return '-'
  if (cur === 'USD') return `$${Math.round(v).toLocaleString('en-US')}`
  return `${Math.round(v).toLocaleString('ko-KR')}원`
}

const fmtC = (v) => {
  if (!Number.isFinite(v)) return '-'
  const a = Math.abs(v)
  if (a >= 1e8) return `${(v / 1e8).toFixed(1)}억`
  if (a >= 1e4) return `${(v / 1e4).toFixed(0)}만`
  return v.toLocaleString()
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
    portfolio: '📊 Portfolio 상세 현황',
    assetStatus: '📈 Asset Status 상세',
    profit: '💰 수익/손실 종목 상세',
    dividend: '🪙 배당금 상세 현황',
    growthRate: '📉 Growth Rate 상세',
    account: `🏦 ${dialogData?.account || '계좌'} 상세`,
    yearlyFlow: '📋 연간 수입/지출 상세',
    market: `🌐 ${dialogData?.label || 'Market'} 상세`,
    gainers: '🟢 수익 종목 전체',
    losers: '🔴 손실 종목 전체',
    allocation: '🎯 자산 배분 상세',
    goals: '🎯 목표 달성 현황',
    netChange: '📊 월별 순변동 상세',
    activities: '🕐 전체 활동 내역'
  }[dialogType] || '상세 현황'

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-[60] backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-4 sm:inset-8 md:inset-12 lg:inset-16 z-[61] flex items-center justify-center">
        <div className="cyber-card cyber-card-glow w-full h-full max-h-full flex flex-col overflow-hidden animate-[fadeScaleIn_0.25s_ease-out]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-cyan-500/20 shrink-0">
            <h2 className="text-lg font-bold neon-text-cyan truncate">{title}</h2>
            <button onClick={onClose} className="cyber-btn p-2 shrink-0 ml-2"><X className="w-5 h-5" /></button>
          </div>
          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 cyber-scrollbar">
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
    default: return <p className="text-cyan-300/50">알 수 없는 타입</p>
  }
}

/* ═══ Shared Table ═══ */
const CyberTable = ({ headers, rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr>{headers.map((h, i) => <th key={i} className="text-left px-3 py-2 text-cyan-400 border-b border-cyan-500/20 whitespace-nowrap" style={h.align ? {textAlign: h.align} : {}}>{h.label || h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-cyan-500/10 hover:bg-cyan-500/5 transition-colors">
            {row.map((cell, j) => <td key={j} className="px-3 py-2.5 text-cyan-100 whitespace-nowrap" style={headers[j]?.align ? {textAlign: headers[j].align} : {}}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const PnlText = ({ value, suffix = '' }) => {
  const pos = value >= 0
  return <span className={pos ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'text-rose-400 drop-shadow-[0_0_6px_rgba(251,113,133,0.5)]'}>{pos ? '+' : ''}{typeof value === 'number' ? value.toFixed(1) : value}{suffix}</span>
}

/* ═══ 1. Portfolio ═══ */
const PortfolioDetail = ({ d }) => {
  const { accountSummary = [], portfolioSummary = {} } = d
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { l: '총 평가액', v: fmt(portfolioSummary.totalValueKRW), c: 'neon-text-cyan' },
          { l: 'USD 환산', v: fmt(portfolioSummary.totalValueUSD, 'USD'), c: 'text-white' },
          { l: '총 수익금', v: fmt(portfolioSummary.totalProfitKRW), c: portfolioSummary.totalProfitKRW >= 0 ? 'neon-text-green' : 'neon-text-red' },
          { l: '총 수익률', v: `${portfolioSummary.profitPercent?.toFixed(2)}%`, c: portfolioSummary.profitPercent >= 0 ? 'neon-text-green' : 'neon-text-red' }
        ].map((s, i) => (
          <div key={i} className="cyber-stat-item text-center">
            <p className="text-cyan-300/60 text-xs mb-1">{s.l}</p>
            <p className={`font-bold text-lg ${s.c}`}>{s.v}</p>
          </div>
        ))}
      </div>
      <h3 className="text-cyan-400 font-semibold text-sm">계좌별 상세</h3>
      <CyberTable
        headers={['계좌', {label:'평가액',align:'right'}, {label:'수익금',align:'right'}, {label:'수익률',align:'right'}, {label:'종목수',align:'right'}]}
        rows={accountSummary.map(a => [
          a.account,
          fmtC(a.totalValueKRW),
          <PnlText value={a.profitKRW} suffix={` (${fmtC(a.profitKRW)})`} />,
          <PnlText value={a.profitPercent} suffix="%" />,
          `${a.assetCount}개`
        ])}
      />
    </div>
  )
}

/* ═══ 2. Asset Status ═══ */
const AssetStatusDetail = ({ d }) => {
  const { trendAsset = [], assetStatusTotal = 0 } = d
  return (
    <div className="space-y-6">
      <div className="cyber-stat-item text-center">
        <p className="text-cyan-300/60 text-xs mb-1">Asset Status TOTAL</p>
        <p className="neon-text-cyan font-bold text-2xl">{fmt(assetStatusTotal)}</p>
      </div>
      <h3 className="text-cyan-400 font-semibold text-sm">월별 추이</h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={trendAsset}>
          <defs>
            <linearGradient id="gradAssetDlg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,210,255,0.1)" />
          <XAxis dataKey="month" stroke="#4a6d7c" fontSize={11} />
          <YAxis stroke="#4a6d7c" fontSize={11} tickFormatter={v => `${(v / 1e6).toFixed(0)}M`} />
          <Tooltip contentStyle={{ background: 'rgba(10,25,40,0.95)', border: '1px solid rgba(0,210,255,0.3)', borderRadius: '8px' }} formatter={v => [fmt(v), 'Asset Status']} />
          <Area type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={2} fill="url(#gradAssetDlg)" dot={{ r: 3, fill: '#a855f7' }} connectNulls />
        </AreaChart>
      </ResponsiveContainer>
      <CyberTable
        headers={['월', {label:'금액',align:'right'}]}
        rows={trendAsset.filter(t => t.value !== null).map(t => [t.month, fmt(t.value)])}
      />
    </div>
  )
}

/* ═══ 3. Profit ═══ */
const ProfitDetail = ({ d }) => {
  const { performance = [], portfolioSummary = {} } = d
  const sorted = [...performance].sort((a, b) => b.profitPercent - a.profitPercent)
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="cyber-stat-item text-center">
          <p className="text-cyan-300/60 text-xs mb-1">총 수익금</p>
          <p className={`font-bold text-xl ${portfolioSummary.totalProfitKRW >= 0 ? 'neon-text-green' : 'neon-text-red'}`}>{fmt(portfolioSummary.totalProfitKRW)}</p>
        </div>
        <div className="cyber-stat-item text-center">
          <p className="text-cyan-300/60 text-xs mb-1">총 수익률</p>
          <p className={`font-bold text-xl ${portfolioSummary.profitPercent >= 0 ? 'neon-text-green' : 'neon-text-red'}`}>{portfolioSummary.profitPercent?.toFixed(2)}%</p>
        </div>
      </div>
      <h3 className="text-cyan-400 font-semibold text-sm">종목별 수익 랭킹 ({sorted.length}종목)</h3>
      <CyberTable
        headers={['#', '종목', '이름', {label:'수익률',align:'right'}]}
        rows={sorted.map((p, i) => [i + 1, p.symbol, p.name !== p.symbol ? p.name : '-', <PnlText value={p.profitPercent} suffix="%" />])}
      />
    </div>
  )
}

/* ═══ 4. Dividend ═══ */
const DividendDetail = ({ d }) => {
  const { dividendTotal = 0, trendDividend = [] } = d
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="cyber-stat-item text-center">
          <p className="text-cyan-300/60 text-xs mb-1">연간 배당 합계</p>
          <p className="neon-text-gold font-bold text-xl">{fmt(dividendTotal)}</p>
        </div>
        <div className="cyber-stat-item text-center">
          <p className="text-cyan-300/60 text-xs mb-1">월 평균 배당</p>
          <p className="neon-text-gold font-bold text-xl">{fmt(dividendTotal / 12)}</p>
        </div>
      </div>
      <h3 className="text-cyan-400 font-semibold text-sm">월별 배당 추이</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={trendDividend}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,210,255,0.1)" />
          <XAxis dataKey="month" stroke="#4a6d7c" fontSize={11} />
          <YAxis stroke="#4a6d7c" fontSize={11} tickFormatter={v => `${(v / 1e4).toFixed(0)}만`} />
          <Tooltip contentStyle={{ background: 'rgba(10,25,40,0.95)', border: '1px solid rgba(0,210,255,0.3)', borderRadius: '8px' }} formatter={v => [fmt(v), '배당금']} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#ffd700" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ═══ 5. Growth Rate ═══ */
const GrowthRateDetail = ({ d }) => {
  const { portfolioHistory = [] } = d
  return (
    <div className="space-y-6">
      <h3 className="text-cyan-400 font-semibold text-sm">포트폴리오 vs 자산 추이 (최근 6개월)</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={portfolioHistory}>
          <defs>
            <linearGradient id="gP2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} /><stop offset="95%" stopColor="#00d4ff" stopOpacity={0} /></linearGradient>
            <linearGradient id="gA2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} /><stop offset="95%" stopColor="#a855f7" stopOpacity={0} /></linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,210,255,0.1)" />
          <XAxis dataKey="month" stroke="#4a6d7c" fontSize={11} />
          <YAxis stroke="#4a6d7c" fontSize={11} tickFormatter={v => `${(v / 1e6).toFixed(0)}M`} />
          <Tooltip contentStyle={{ background: 'rgba(10,25,40,0.95)', border: '1px solid rgba(0,210,255,0.3)', borderRadius: '8px' }} formatter={(v, n) => [fmt(v), n === 'portfolio' ? 'Portfolio' : 'Asset Status']} />
          <Area type="monotone" dataKey="portfolio" stroke="#00d4ff" strokeWidth={2} fill="url(#gP2)" dot={{ r: 3, fill: '#00d4ff' }} connectNulls />
          <Area type="monotone" dataKey="assetStatus" stroke="#a855f7" strokeWidth={2} fill="url(#gA2)" dot={{ r: 3, fill: '#a855f7' }} connectNulls />
        </AreaChart>
      </ResponsiveContainer>
      <CyberTable
        headers={['월', {label:'Portfolio',align:'right'}, {label:'Asset Status',align:'right'}]}
        rows={portfolioHistory.map(h => [h.month, h.portfolio ? fmt(h.portfolio) : '-', h.assetStatus ? fmt(h.assetStatus) : '-'])}
      />
    </div>
  )
}

/* ═══ 6. Account ═══ */
const AccountDetail = ({ d }) => {
  const { account = '', assets = [] } = d
  return (
    <div className="space-y-4">
      <p className="text-cyan-300/60 text-sm">보유 종목 {assets.length}개</p>
      <CyberTable
        headers={['종목', '이름', {label:'수량',align:'right'}, {label:'평단가',align:'right'}, {label:'현재가',align:'right'}, {label:'평가액',align:'right'}, {label:'수익률',align:'right'}]}
        rows={assets.map(a => [
          a.symbol, a.name || '-', a.qty, 
          a.currency === 'USD' ? `$${a.avgPrice?.toLocaleString()}` : `₩${a.avgPrice?.toLocaleString()}`,
          a.currency === 'USD' ? `$${a.curPrice?.toLocaleString()}` : `₩${a.curPrice?.toLocaleString()}`,
          fmtC(a.valueKRW),
          <PnlText value={a.profitPercent} suffix="%" />
        ])}
      />
    </div>
  )
}

/* ═══ 7. Yearly Flow ═══ */
const YearlyFlowDetail = ({ d }) => {
  const { yearlyFlow = {}, monthlyNetChanges = [] } = d
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="cyber-stat-item text-center">
          <p className="text-cyan-300/60 text-xs mb-1">연간 수입</p>
          <p className="text-emerald-400 font-bold text-lg drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">+{fmtC(yearlyFlow.income)}</p>
        </div>
        <div className="cyber-stat-item text-center">
          <p className="text-cyan-300/60 text-xs mb-1">연간 지출</p>
          <p className="text-rose-400 font-bold text-lg drop-shadow-[0_0_8px_rgba(251,113,133,0.5)]">-{fmtC(yearlyFlow.expense)}</p>
        </div>
        <div className="cyber-stat-item text-center">
          <p className="text-cyan-300/60 text-xs mb-1">순변동</p>
          <p className={`font-bold text-lg ${yearlyFlow.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{yearlyFlow.net >= 0 ? '+' : ''}{fmtC(yearlyFlow.net)}</p>
        </div>
      </div>
      <CyberTable
        headers={['월', {label:'순변동',align:'right'}]}
        rows={monthlyNetChanges.map(m => [m.month, <PnlText value={m.value} suffix={` (${fmtC(m.value)})`} />])}
      />
    </div>
  )
}

/* ═══ 8. Market ═══ */
const MarketDetail = ({ d }) => {
  const { label = '', value = '', change = 0 } = d
  return (
    <div className="space-y-6">
      <div className="cyber-stat-item text-center py-8">
        <p className="text-cyan-300/60 text-sm mb-2">{label}</p>
        <p className="text-white font-bold text-3xl mb-2">{value}</p>
        <p className={`text-lg flex items-center justify-center gap-1 ${change >= 0 ? 'neon-text-green' : 'neon-text-red'}`}>
          {change >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
          {Math.abs(change).toFixed(2)}%
        </p>
      </div>
      <div className="text-cyan-300/40 text-xs text-center">실시간 시장 데이터는 외부 API를 통해 갱신됩니다</div>
    </div>
  )
}

/* ═══ 9/10. Performers (Gainers/Losers) ═══ */
const PerformersDetail = ({ d, isGainer }) => {
  const items = d?.items || []
  return (
    <div className="space-y-4">
      <p className="text-cyan-300/60 text-sm">{isGainer ? '수익' : '손실'} 종목 {items.length}개</p>
      <CyberTable
        headers={['#', '종목', '이름', {label:'수익률',align:'right'}]}
        rows={items.map((p, i) => [i + 1, p.symbol, p.name !== p.symbol ? p.name : '-', <PnlText value={p.profitPercent} suffix="%" />])}
      />
    </div>
  )
}

/* ═══ 11. Allocation ═══ */
const AllocationDetail = ({ d }) => {
  const { allocationData = [], portfolioSummary = {} } = d
  const total = portfolioSummary.totalValueKRW || 1
  return (
    <div className="space-y-6">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={allocationData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: '#4a6d7c' }}>
            {allocationData.map((e, i) => <Cell key={e.name} fill={CYBER_COLORS[i % CYBER_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ background: 'rgba(10,25,40,0.95)', border: '1px solid rgba(0,210,255,0.3)', borderRadius: '8px' }} formatter={v => fmt(v)} />
        </PieChart>
      </ResponsiveContainer>
      <CyberTable
        headers={['자산 유형', {label:'금액',align:'right'}, {label:'비중',align:'right'}]}
        rows={allocationData.map((a, i) => [
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full shrink-0" style={{ background: CYBER_COLORS[i % CYBER_COLORS.length] }} />{a.name}</span>,
          fmt(a.value),
          `${((a.value / total) * 100).toFixed(1)}%`
        ])}
      />
    </div>
  )
}

/* ═══ 12. Goals ═══ */
const GoalsDetail = ({ d }) => {
  const { goals = [] } = d
  return (
    <div className="space-y-4">
      {goals.length === 0 && <p className="text-cyan-300/40 text-center py-8">설정된 목표가 없습니다</p>}
      {goals.map((g, i) => (
        <div key={i} className="cyber-stat-item">
          <div className="flex items-center justify-between mb-2">
            <span className="text-cyan-200 font-medium">{g.name}</span>
            <span className={`font-bold ${g.progress >= 100 ? 'neon-text-green' : 'text-white'}`}>{g.progress?.toFixed(0)}%</span>
          </div>
          <div className="cyber-progress"><div className="cyber-progress-bar" style={{ width: `${Math.min(g.progress || 0, 100)}%` }} /></div>
        </div>
      ))}
    </div>
  )
}

/* ═══ 13. Net Change ═══ */
const NetChangeDetail = ({ d }) => {
  const { monthlyNetChanges = [] } = d
  return (
    <div className="space-y-6">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={monthlyNetChanges}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,210,255,0.1)" />
          <XAxis dataKey="month" stroke="#4a6d7c" fontSize={11} />
          <YAxis stroke="#4a6d7c" fontSize={11} tickFormatter={v => `${(v / 1e4).toFixed(0)}만`} />
          <Tooltip contentStyle={{ background: 'rgba(10,25,40,0.95)', border: '1px solid rgba(0,210,255,0.3)', borderRadius: '8px' }} formatter={v => [fmt(v), '순변동']} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {monthlyNetChanges.map((e, i) => <Cell key={i} fill={e.value >= 0 ? '#00ff88' : '#ff6b6b'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <CyberTable
        headers={['월', {label:'순변동',align:'right'}]}
        rows={monthlyNetChanges.map(m => [m.month, <PnlText value={m.value} suffix={` (${fmtC(m.value)})`} />])}
      />
    </div>
  )
}

/* ═══ 14. Activities ═══ */
const ActivitiesDetail = ({ d }) => {
  const { activities = [] } = d
  return (
    <div className="space-y-4">
      <p className="text-cyan-300/60 text-sm">전체 {activities.length}건</p>
      <CyberTable
        headers={['유형', '내용', {label:'금액',align:'right'}, '날짜']}
        rows={activities.map(a => [
          a.type === 'buy' ? '🟢 매수' : a.type === 'sell' ? '🔴 매도' : '🟡 배당',
          a.title,
          <PnlText value={a.amount} suffix={` (${fmtC(a.amount)})`} />,
          a.date
        ])}
      />
    </div>
  )
}

export default DashboardDetailDialog
