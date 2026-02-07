import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  FileText,
  Target,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  PiggyBank,
  BarChart3,
  Activity,
  Zap,
  Globe,
  Clock
} from 'lucide-react'
import { format, startOfMonth, subMonths } from 'date-fns'
import { ko } from 'date-fns/locale'
import marketDataService from '../services/marketDataService'
import dataSync from '../utils/dataSync'

const DEFAULT_USD_KRW = 1340

const Dashboard = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [marketData, setMarketData] = useState(null)
  const [portfolioSummary, setPortfolioSummary] = useState({
    totalValueKRW: 0,
    totalProfitKRW: 0,
    totalValueUSD: 0,
    profitPercent: 0
  })
  const [accountSummary, setAccountSummary] = useState([])
  const [assetStatusTotal, setAssetStatusTotal] = useState(0)
  const [allocationData, setAllocationData] = useState([])
  const [portfolioHistory, setPortfolioHistory] = useState([])
  const [goalSummary, setGoalSummary] = useState({ goals: [] })
  const [topPerformers, setTopPerformers] = useState({ gainers: [], losers: [] })
  const [recentActivities, setRecentActivities] = useState([])
  const [dividendTotal, setDividendTotal] = useState(0)

  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    try {
      const [market, loadedAssets, loadedLogs, loadedGoals, assetAccountData] = await Promise.all([
        marketDataService.getAllMarketData().catch(() => null),
        dataSync.loadPortfolioAssets(),
        dataSync.loadInvestmentLogs(),
        dataSync.loadGoals(),
        dataSync.loadUserSetting('asset_account_data')
      ])

      const usdToKrw = market?.currency?.usdKrw?.rate || DEFAULT_USD_KRW
      setMarketData(market)

      const assetsRaw = Array.isArray(loadedAssets) ? loadedAssets : []
      const logsRaw = Array.isArray(loadedLogs) ? loadedLogs : []
      const goalsRaw = Array.isArray(loadedGoals) ? loadedGoals : []

      const currentYear = new Date().getFullYear()
      const yearAccounts = assetAccountData?.[currentYear] || {}
      let assetTotalValue = 0
      Object.values(yearAccounts).forEach(cats => {
        Object.values(cats).forEach(v => { assetTotalValue += Number(v || 0) })
      })
      setAssetStatusTotal(assetTotalValue)

      const { totals, allocation, assetsMap, performance, accountBreakdown } = buildPortfolioSummary(assetsRaw, usdToKrw)
      setPortfolioSummary(totals)
      setAccountSummary(accountBreakdown)
      setAllocationData(allocation)

      const sorted = [...performance].sort((a, b) => b.profitPercent - a.profitPercent)
      setTopPerformers({
        gainers: sorted.filter(p => p.profitPercent > 0).slice(0, 3),
        losers: sorted.filter(p => p.profitPercent < 0).slice(-3).reverse()
      })

      const dividendData = await dataSync.loadUserSetting('dividend_transactions')
      const yearlyDividends = (dividendData || []).filter(d => new Date(d.date).getFullYear() === currentYear)
      const totalDividend = yearlyDividends.reduce((sum, d) => {
        return sum + (d.currency === 'USD' ? d.amount * usdToKrw : d.amount)
      }, 0)
      setDividendTotal(totalDividend)

      const history = buildPortfolioHistory(logsRaw, usdToKrw, assetsMap, totals.totalValueKRW)
      setPortfolioHistory(history)

      setGoalSummary(summarizeGoals(goalsRaw))
      setRecentActivities(buildRecentActivities(logsRaw, dividendData || [], assetsMap, usdToKrw))
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDashboardData() }, [loadDashboardData])

  const marketHighlights = useMemo(() => buildMarketHighlights(marketData), [marketData])

  if (loading) {
    return (
      <div className="cyber-dashboard min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="cyber-hub-ring cyber-hub-ring-outer w-20 h-20 mx-auto mb-4" />
          <p className="text-cyan-400 text-sm">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="cyber-dashboard min-h-screen p-4 sm:p-6 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold neon-text-cyan">Investment Dashboard</h1>
          <p className="text-cyan-300/60 text-sm mt-1">Portfolio Analysis & Performance</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/portfolio')} className="cyber-btn flex items-center gap-2">
            <Plus className="w-4 h-4" /> 자산추가
          </button>
          <button onClick={() => navigate('/investment-log')} className="cyber-btn flex items-center gap-2">
            <FileText className="w-4 h-4" /> 거래기록
          </button>
          <button onClick={loadDashboardData} className="cyber-btn flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-4 sm:gap-6">
        {/* Left Column - Charts */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          {/* Portfolio History Chart */}
          <div className="cyber-card cyber-card-glow p-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-cyan-400 font-semibold text-sm uppercase tracking-wide">Growth Rate</h3>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={portfolioHistory}>
                <defs>
                  <linearGradient id="cyberGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,210,255,0.1)" />
                <XAxis dataKey="month" stroke="#4a6d7c" fontSize={10} />
                <YAxis stroke="#4a6d7c" fontSize={10} tickFormatter={v => `${(v / 1e6).toFixed(0)}M`} />
                <Tooltip
                  contentStyle={{ background: 'rgba(10,25,40,0.95)', border: '1px solid rgba(0,210,255,0.3)', borderRadius: '8px' }}
                  labelStyle={{ color: '#00d4ff' }}
                  formatter={(v) => [formatCurrency(v, 'KRW'), 'Value']}
                />
                <Area type="monotone" dataKey="value" stroke="#00d4ff" strokeWidth={2} fill="url(#cyberGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Account Summary Table */}
          <div className="cyber-card cyber-card-glow p-4">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-4 h-4 text-cyan-400" />
              <h3 className="text-cyan-400 font-semibold text-sm uppercase tracking-wide">Account Summary</h3>
            </div>
            <div className="cyber-table overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left">Account</th>
                    <th className="text-right">Value</th>
                    <th className="text-right">Return</th>
                  </tr>
                </thead>
                <tbody>
                  {accountSummary.slice(0, 5).map(acc => (
                    <tr key={acc.account}>
                      <td className="text-cyan-200">{acc.account}</td>
                      <td className="text-right text-white">{formatCompact(acc.totalValueKRW)}</td>
                      <td className={`text-right ${acc.profitPercent >= 0 ? 'neon-text-green' : 'neon-text-red'}`}>
                        {acc.profitPercent >= 0 ? '+' : ''}{acc.profitPercent.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Center - Hub */}
        <div className="col-span-12 lg:col-span-6">
          {/* Center Hub */}
          <div className="cyber-card cyber-card-glow p-6 mb-4">
            <div className="flex flex-col lg:flex-row items-center gap-6">
              {/* Left Stats */}
              <div className="flex-1 space-y-3 w-full lg:w-auto">
                <StatBox
                  icon={Wallet}
                  label="Total Portfolio"
                  value={formatCurrency(portfolioSummary.totalValueKRW, 'KRW')}
                  sub={`USD ${formatCurrency(portfolioSummary.totalValueUSD, 'USD')}`}
                  color="cyan"
                />
                <StatBox
                  icon={BarChart3}
                  label="Asset Status TOTAL"
                  value={formatCurrency(assetStatusTotal, 'KRW')}
                  color="cyan"
                />
              </div>

              {/* Center Ring */}
              <div className="cyber-hub flex-shrink-0">
                <div className="cyber-hub-ring cyber-hub-ring-outer" />
                <div className="cyber-hub-ring cyber-hub-ring-middle" />
                <div className="cyber-hub-ring cyber-hub-ring-inner" />
                <div className="cyber-hub-center">
                  <span className="text-cyan-400 text-xs uppercase tracking-wider mb-1">Portfolio</span>
                  <span className={`text-2xl font-bold ${portfolioSummary.profitPercent >= 0 ? 'neon-text-green' : 'neon-text-red'}`}>
                    {portfolioSummary.profitPercent >= 0 ? '+' : ''}{portfolioSummary.profitPercent.toFixed(2)}%
                  </span>
                  <span className="text-cyan-300/60 text-xs mt-1">Total Return</span>
                </div>
              </div>

              {/* Right Stats */}
              <div className="flex-1 space-y-3 w-full lg:w-auto">
                <StatBox
                  icon={TrendingUp}
                  label="Total Profit"
                  value={formatCurrency(portfolioSummary.totalProfitKRW, 'KRW')}
                  positive={portfolioSummary.totalProfitKRW >= 0}
                />
                <StatBox
                  icon={PiggyBank}
                  label="Annual Dividend"
                  value={formatCurrency(dividendTotal, 'KRW')}
                  sub={`Monthly ${formatCurrency(dividendTotal / 12, 'KRW')}`}
                  color="gold"
                />
              </div>
            </div>
          </div>

          {/* Market Strip */}
          {marketHighlights && (
            <div className="cyber-card cyber-card-glow p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-400 font-semibold text-sm uppercase tracking-wide">Market Overview</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {marketHighlights.map(item => (
                  <div key={item.label} className="cyber-stat-item text-center">
                    <p className="text-cyan-300/60 text-xs mb-1">{item.label}</p>
                    <p className="text-white font-bold text-sm">{item.value}</p>
                    <p className={`text-xs flex items-center justify-center gap-1 mt-1 ${item.change >= 0 ? 'neon-text-green' : 'neon-text-red'}`}>
                      {item.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(item.change).toFixed(2)}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Performers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="cyber-card cyber-card-glow p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-semibold text-xs uppercase">Top Gainers</span>
              </div>
              <div className="space-y-2">
                {topPerformers.gainers.length > 0 ? topPerformers.gainers.map(item => (
                  <div key={item.symbol} className="flex items-center justify-between text-sm">
                    <span className="text-cyan-200">{item.symbol}</span>
                    <span className="neon-text-green">+{item.profitPercent.toFixed(1)}%</span>
                  </div>
                )) : <p className="text-cyan-300/40 text-xs">No gainers</p>}
              </div>
            </div>
            <div className="cyber-card cyber-card-glow p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="w-4 h-4 text-rose-400" />
                <span className="text-rose-400 font-semibold text-xs uppercase">Top Losers</span>
              </div>
              <div className="space-y-2">
                {topPerformers.losers.length > 0 ? topPerformers.losers.map(item => (
                  <div key={item.symbol} className="flex items-center justify-between text-sm">
                    <span className="text-cyan-200">{item.symbol}</span>
                    <span className="neon-text-red">{item.profitPercent.toFixed(1)}%</span>
                  </div>
                )) : <p className="text-cyan-300/40 text-xs">No losers</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          {/* Asset Allocation */}
          <div className="cyber-card cyber-card-glow p-4">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-cyan-400" />
              <h3 className="text-cyan-400 font-semibold text-sm uppercase tracking-wide">Asset Allocation</h3>
            </div>
            {allocationData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={allocationData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={3}
                    >
                      {allocationData.map((entry, idx) => (
                        <Cell key={entry.name} fill={CYBER_COLORS[idx % CYBER_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'rgba(10,25,40,0.95)', border: '1px solid rgba(0,210,255,0.3)', borderRadius: '8px' }}
                      formatter={(v) => formatCurrency(v, 'KRW')}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-3">
                  {allocationData.map((item, idx) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: CYBER_COLORS[idx % CYBER_COLORS.length] }} />
                        <span className="text-cyan-200">{item.name}</span>
                      </div>
                      <span className="text-white">{((item.value / portfolioSummary.totalValueKRW) * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <p className="text-cyan-300/40 text-xs text-center py-8">No allocation data</p>}
          </div>

          {/* Goals Progress */}
          <div className="cyber-card cyber-card-glow p-4">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-cyan-400" />
              <h3 className="text-cyan-400 font-semibold text-sm uppercase tracking-wide">Goal Progress</h3>
            </div>
            <div className="space-y-3">
              {goalSummary.goals.slice(0, 3).map(goal => (
                <div key={goal.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-cyan-200 truncate">{goal.name}</span>
                    <span className="text-white">{goal.progress?.toFixed(0)}%</span>
                  </div>
                  <div className="cyber-progress">
                    <div className="cyber-progress-bar" style={{ width: `${Math.min(goal.progress || 0, 100)}%` }} />
                  </div>
                </div>
              ))}
              {goalSummary.goals.length === 0 && <p className="text-cyan-300/40 text-xs text-center py-4">No goals set</p>}
              {goalSummary.goals.length > 3 && (
                <button onClick={() => navigate('/goals')} className="text-cyan-400 text-xs hover:underline">
                  +{goalSummary.goals.length - 3} more goals
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - Recent Activities */}
      <div className="mt-6">
        <div className="cyber-card cyber-card-glow p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h3 className="text-cyan-400 font-semibold text-sm uppercase tracking-wide">Recent Activities</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentActivities.slice(0, 4).map((act, idx) => (
              <div key={idx} className="cyber-stat-item">
                <div className="flex items-center gap-3">
                  <div className="cyber-icon-circle">
                    {act.type === 'buy' ? <Plus className="w-4 h-4 text-cyan-400" /> :
                     act.type === 'sell' ? <DollarSign className="w-4 h-4 text-emerald-400" /> :
                     <PiggyBank className="w-4 h-4 text-amber-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-cyan-200 text-sm font-medium truncate">{act.title}</p>
                    <p className="text-cyan-300/50 text-xs">{act.date}</p>
                  </div>
                  <span className={`text-sm font-bold ${act.amount >= 0 ? 'neon-text-green' : 'neon-text-red'}`}>
                    {act.amount >= 0 ? '+' : ''}{formatCompact(act.amount)}
                  </span>
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && (
              <p className="text-cyan-300/40 text-xs col-span-4 text-center py-4">No recent activities</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Stat Box Component
const StatBox = ({ icon: Icon, label, value, sub, positive, color = 'default' }) => {
  const colorClass = color === 'gold' ? 'neon-text-gold' : color === 'cyan' ? 'neon-text-cyan' :
    (positive !== undefined ? (positive ? 'neon-text-green' : 'neon-text-red') : 'text-white')

  return (
    <div className="cyber-stat-item">
      <div className="flex items-center gap-3">
        <div className="cyber-icon-circle">
          <Icon className="w-4 h-4 text-cyan-400" />
        </div>
        <div>
          <p className="text-cyan-300/60 text-xs uppercase tracking-wide">{label}</p>
          <p className={`text-lg font-bold ${colorClass}`}>{value}</p>
          {sub && <p className="text-cyan-300/40 text-xs">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

// Color palette for cyber theme
const CYBER_COLORS = ['#00d4ff', '#00ff88', '#ffd700', '#ff6b6b', '#a855f7', '#06b6d4', '#f97316']

// Utility Functions
const formatCurrency = (value, currency = 'KRW') => {
  if (!Number.isFinite(value)) return '-'
  if (currency === 'USD') return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  return `${value.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원`
}

const formatCompact = (value) => {
  if (!Number.isFinite(value)) return '-'
  const abs = Math.abs(value)
  if (abs >= 1e8) return `${(value / 1e8).toFixed(1)}억`
  if (abs >= 1e4) return `${(value / 1e4).toFixed(0)}만`
  return value.toLocaleString()
}

const buildPortfolioSummary = (assets, usdToKrw) => {
  let totalValueKRW = 0, totalValueUSD = 0, totalProfitKRW = 0
  const allocationMap = {}, assetsMap = {}, accountMap = {}, performance = []

  assets.forEach(asset => {
    const qty = Number(asset.quantity || 0)
    const curPrice = Number(asset.currentPrice || asset.avgPrice || 0)
    const avgPrice = Number(asset.avgPrice || 0)
    const currency = asset.currency || 'USD'
    const type = asset.type || '기타'
    const account = asset.account || '기본계좌'

    const totalVal = qty * curPrice
    const totalProfit = qty * (curPrice - avgPrice)
    const valueKRW = currency === 'USD' ? totalVal * usdToKrw : totalVal
    const profitKRW = currency === 'USD' ? totalProfit * usdToKrw : totalProfit
    const valueUSD = currency === 'KRW' ? totalVal / usdToKrw : totalVal
    const profitPercent = avgPrice > 0 ? ((curPrice - avgPrice) / avgPrice) * 100 : 0

    totalValueKRW += valueKRW
    totalProfitKRW += profitKRW
    totalValueUSD += valueUSD

    allocationMap[type] = (allocationMap[type] || 0) + valueKRW
    if (!accountMap[account]) accountMap[account] = { account, totalValueKRW: 0, profitKRW: 0 }
    accountMap[account].totalValueKRW += valueKRW
    accountMap[account].profitKRW += profitKRW

    assetsMap[asset.symbol] = { ...asset, valueKRW, currency, profitKRW, profitPercent }
    performance.push({ symbol: asset.symbol, name: asset.name || asset.symbol, profitPercent: Number(profitPercent.toFixed(2)) })
  })

  Object.values(accountMap).forEach(acc => {
    const invested = acc.totalValueKRW - acc.profitKRW
    acc.profitPercent = invested > 0 ? (acc.profitKRW / invested) * 100 : 0
  })

  const profitPercent = totalValueKRW - totalProfitKRW !== 0 ? (totalProfitKRW / (totalValueKRW - totalProfitKRW)) * 100 : 0
  const allocation = Object.entries(allocationMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  const accountBreakdown = Object.values(accountMap).sort((a, b) => b.totalValueKRW - a.totalValueKRW)

  return { totals: { totalValueKRW, totalValueUSD, totalProfitKRW, profitPercent }, allocation, assetsMap, performance, accountBreakdown }
}

const buildPortfolioHistory = (logs, usdToKrw, assetsMap, currentTotal) => {
  const months = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const date = subMonths(startOfMonth(now), i)
    months.push({ key: format(date, 'yyyy-MM'), label: format(date, 'M월', { locale: ko }) })
  }

  const logsWithKRW = logs.map(log => {
    const asset = assetsMap[log.asset]
    const total = Number(log.total || Number(log.quantity || 0) * Number(log.price || 0))
    const currency = asset?.currency || log.currency || 'USD'
    return { ...log, totalKRW: currency === 'USD' ? total * usdToKrw : total }
  })

  let cum = 0
  const trend = months.map(m => {
    const net = logsWithKRW.filter(l => l.date && format(new Date(l.date), 'yyyy-MM') === m.key)
      .reduce((s, l) => s + (l.type === 'buy' ? l.totalKRW : -l.totalKRW), 0)
    cum += net
    return { month: m.label, cumulative: cum }
  })

  const scale = trend.length && trend[trend.length - 1].cumulative ? currentTotal / trend[trend.length - 1].cumulative : 1
  return trend.map(t => ({ month: t.month, value: Math.max(t.cumulative * scale, 0) }))
}

const summarizeGoals = (goals) => {
  if (!goals.length) return { goals: [] }
  return {
    goals: goals.map(g => {
      const target = Number(g.targetAmount || 0)
      const current = Number(g.currentAmount || 0)
      return { name: g.name, progress: target > 0 ? Math.min((current / target) * 100, 100) : 0 }
    }).sort((a, b) => b.progress - a.progress)
  }
}

const buildRecentActivities = (logs, dividends, assetsMap, usdToKrw) => {
  const activities = []
  logs.slice(0, 5).forEach(log => {
    const asset = assetsMap[log.asset]
    const total = Number(log.total || 0)
    const amountKRW = (asset?.currency || 'USD') === 'USD' ? total * usdToKrw : total
    activities.push({
      type: log.type, title: `${log.asset} ${log.type === 'buy' ? '매수' : '매도'}`,
      amount: log.type === 'buy' ? -amountKRW : amountKRW,
      date: log.date ? format(new Date(log.date), 'M/d') : '-',
      ts: new Date(log.date).getTime()
    })
  })
  dividends.slice(0, 3).forEach(d => {
    const amountKRW = d.currency === 'USD' ? d.amount * usdToKrw : d.amount
    activities.push({ type: 'dividend', title: `${d.symbol} 배당`, amount: amountKRW, date: d.date ? format(new Date(d.date), 'M/d') : '-', ts: new Date(d.date).getTime() })
  })
  return activities.sort((a, b) => b.ts - a.ts)
}

const buildMarketHighlights = (marketData) => {
  if (!marketData) return null
  const hl = []
  if (marketData.stocks?.sp500) hl.push({ label: 'S&P 500', value: `$${marketData.stocks.sp500.price?.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, change: marketData.stocks.sp500.changePercent || 0 })
  if (marketData.crypto?.bitcoin) hl.push({ label: 'Bitcoin', value: `$${marketData.crypto.bitcoin.price?.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, change: marketData.crypto.bitcoin.change24h || 0 })
  if (marketData.currency?.usdKrw) hl.push({ label: 'USD/KRW', value: marketData.currency.usdKrw.rate?.toLocaleString('ko-KR'), change: ((marketData.currency.usdKrw.rate - DEFAULT_USD_KRW) / DEFAULT_USD_KRW) * 100 })
  return hl.length ? hl : null
}

export default Dashboard
