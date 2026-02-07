import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Area,
  AreaChart,
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
  Info,
  Clock,
  DollarSign,
  PiggyBank,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import { format, startOfMonth, subMonths } from 'date-fns'
import { ko } from 'date-fns/locale'
import ChartCard from '../components/ChartCard'
import marketDataService from '../services/marketDataService'
import dataSync from '../utils/dataSync'

const DEFAULT_USD_KRW = 1340

const Dashboard = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [marketData, setMarketData] = useState(null)
  const [portfolioSummary, setPortfolioSummary] = useState({
    totalValueKRW: 0,
    totalProfitKRW: 0,
    totalValueUSD: 0,
    profitPercent: 0
  })
  const [allocationData, setAllocationData] = useState([])
  const [portfolioHistory, setPortfolioHistory] = useState([])
  const [goalSummary, setGoalSummary] = useState({
    averageProgress: 0,
    totalGoals: 0,
    goals: []
  })
  const [topPerformers, setTopPerformers] = useState({ gainers: [], losers: [] })
  const [recentActivities, setRecentActivities] = useState([])
  const [dividendTotal, setDividendTotal] = useState(0)

  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [market, loadedAssets, loadedLogs, loadedGoals] = await Promise.all([
        marketDataService.getAllMarketData().catch(err => {
          console.error('Dashboard market data error:', err)
          return null
        }),
        dataSync.loadPortfolioAssets(),
        dataSync.loadInvestmentLogs(),
        dataSync.loadGoals()
      ])

      const usdToKrw = market?.currency?.usdKrw?.rate || DEFAULT_USD_KRW
      setMarketData(market)

      const assetsRaw = Array.isArray(loadedAssets) ? loadedAssets : safeParseLocalStorage('portfolio_assets', [])
      const logsRaw = Array.isArray(loadedLogs) ? loadedLogs : safeParseLocalStorage('investment_logs', [])
      const goalsRaw = Array.isArray(loadedGoals) ? loadedGoals : safeParseLocalStorage('investment_goals', [])

      const { totals, allocation, assetsMap, performance } = buildPortfolioSummary(assetsRaw, usdToKrw)

      setPortfolioSummary({
        totalValueKRW: totals.totalValueKRW,
        totalValueUSD: totals.totalValueUSD,
        totalProfitKRW: totals.totalProfitKRW,
        profitPercent: totals.profitPercent
      })

      setAllocationData(allocation)

      // Top 수익/손실 종목
      const sorted = [...performance].sort((a, b) => b.profitPercent - a.profitPercent)
      setTopPerformers({
        gainers: sorted.filter(p => p.profitPercent > 0).slice(0, 3),
        losers: sorted.filter(p => p.profitPercent < 0).slice(-3).reverse()
      })

      // 배당금 총계
      const dividendData = await dataSync.loadUserSetting('dividend_transactions')
      const currentYear = new Date().getFullYear()
      const yearlyDividends = (dividendData || []).filter(d =>
        new Date(d.date).getFullYear() === currentYear
      )
      const totalDividend = yearlyDividends.reduce((sum, d) => {
        const amountKRW = d.currency === 'USD' ? d.amount * usdToKrw : d.amount
        return sum + amountKRW
      }, 0)
      setDividendTotal(totalDividend)

      const history = buildPortfolioHistory(logsRaw, usdToKrw, assetsMap, totals.totalValueKRW)
      setPortfolioHistory(history)

      const goals = summarizeGoals(goalsRaw)
      setGoalSummary(goals)

      // 최근 활동 통합 (거래 + 배당 + 목표)
      const activities = buildRecentActivities(logsRaw, dividendData || [], goalsRaw, assetsMap, usdToKrw)
      setRecentActivities(activities)

    } catch (err) {
      console.error('Dashboard load error:', err)
      setError('대시보드를 로드하는 중 문제가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const marketHighlights = useMemo(() => buildMarketHighlights(marketData), [marketData])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-10 h-10 text-primary-600 animate-spin mx-auto" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">대시보드 데이터를 준비하고 있습니다...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <p className="text-rose-600">{error}</p>
          <button onClick={loadDashboardData} className="btn-primary">
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 퀵 액션 바 */}
      <QuickActionBar
        onRefresh={loadDashboardData}
        navigate={navigate}
      />

      {/* 헤더 요약 - 간소화 */}
      <HeaderSummary
        totalValue={portfolioSummary.totalValueKRW}
        profitPercent={portfolioSummary.profitPercent}
        totalProfit={portfolioSummary.totalProfitKRW}
        dividendTotal={dividendTotal}
      />

      {/* 시장 지표 스트립 */}
      {marketHighlights && <MarketStrip data={marketHighlights} />}

      {/* 포트폴리오 차트 + 자산 배분 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ChartCard
          title="포트폴리오 추이"
          subtitle="최근 6개월 평가액"
        >
          {portfolioHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={portfolioHistory}>
                <defs>
                  <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickFormatter={value => formatCompactCurrency(value)}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(value, 'KRW'), '평가액']}
                  labelFormatter={label => label}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fill="url(#portfolioGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="포트폴리오 데이터가 없습니다" />
          )}
        </ChartCard>

        <ChartCard
          title="자산 배분"
          subtitle="유형별 비중"
        >
          {allocationData.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={allocationData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {allocationData.map(entry => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value, 'KRW')} />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full sm:w-auto space-y-2">
                {allocationData.map(item => (
                  <div key={item.name} className="flex items-center justify-between gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {((item.value / portfolioSummary.totalValueKRW) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState message="자산 데이터가 없습니다" />
          )}
        </ChartCard>
      </div>

      {/* Top 수익/손실 + 목표 진행 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ChartCard
          title="Top 수익/손실"
          subtitle="수익률 기준"
        >
          <div className="space-y-4">
            {/* 수익 종목 */}
            <div>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> 수익 TOP
              </p>
              {topPerformers.gainers.length > 0 ? (
                <div className="space-y-2">
                  {topPerformers.gainers.map(item => (
                    <div key={item.symbol} className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2">
                      <div>
                        <span className="font-semibold text-gray-900 dark:text-white">{item.symbol}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                        <ArrowUpRight className="w-4 h-4" />
                        +{item.profitPercent.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">수익 종목이 없습니다</p>
              )}
            </div>

            {/* 손실 종목 */}
            <div>
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" /> 손실 TOP
              </p>
              {topPerformers.losers.length > 0 ? (
                <div className="space-y-2">
                  {topPerformers.losers.map(item => (
                    <div key={item.symbol} className="flex items-center justify-between bg-rose-50 dark:bg-rose-900/20 rounded-lg px-3 py-2">
                      <div>
                        <span className="font-semibold text-gray-900 dark:text-white">{item.symbol}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                        <ArrowDownRight className="w-4 h-4" />
                        {item.profitPercent.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">손실 종목이 없습니다</p>
              )}
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title="목표 진행"
          subtitle={`${goalSummary.totalGoals}개 목표 관리 중`}
        >
          {goalSummary.goals.length > 0 ? (
            <div className="space-y-3">
              {goalSummary.goals.slice(0, 4).map(goal => (
                <div key={goal.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900 dark:text-white truncate">{goal.name}</span>
                    <span className="text-gray-600 dark:text-gray-400 font-semibold">{goal.progress?.toFixed(0) || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        goal.progress >= 100 ? 'bg-emerald-500' :
                        goal.progress >= 70 ? 'bg-blue-500' :
                        goal.progress >= 40 ? 'bg-amber-500' : 'bg-gray-400'
                      }`}
                      style={{ width: `${Math.min(goal.progress || 0, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{formatCurrency(goal.currentAmount || 0, goal.currency)}</span>
                    <span>{formatCurrency(goal.targetAmount || 0, goal.currency)}</span>
                  </div>
                </div>
              ))}
              {goalSummary.goals.length > 4 && (
                <button
                  onClick={() => navigate('/goals')}
                  className="w-full text-center text-sm text-primary-600 dark:text-primary-400 hover:underline mt-2"
                >
                  + {goalSummary.goals.length - 4}개 더 보기
                </button>
              )}
            </div>
          ) : (
            <EmptyState message="등록된 목표가 없습니다" />
          )}
        </ChartCard>
      </div>

      {/* 최근 활동 타임라인 */}
      <ChartCard
        title="최근 활동"
        subtitle="거래, 배당, 목표 달성 등"
      >
        {recentActivities.length > 0 ? (
          <div className="space-y-3">
            {recentActivities.slice(0, 8).map((activity, idx) => (
              <ActivityItem key={idx} activity={activity} />
            ))}
          </div>
        ) : (
          <EmptyState message="최근 활동이 없습니다" />
        )}
      </ChartCard>
    </div>
  )
}

// 퀵 액션 바
const QuickActionBar = ({ onRefresh, navigate }) => {
  const actions = [
    { label: '자산 추가', icon: Plus, color: 'bg-blue-500 hover:bg-blue-600', path: '/portfolio' },
    { label: '거래 기록', icon: FileText, color: 'bg-emerald-500 hover:bg-emerald-600', path: '/investment-log' },
    { label: '목표 설정', icon: Target, color: 'bg-purple-500 hover:bg-purple-600', path: '/goals' },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {actions.map(action => (
        <button
          key={action.label}
          onClick={() => navigate(action.path)}
          className={`${action.color} text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors shadow-sm`}
        >
          <action.icon className="w-4 h-4" />
          <span className="hidden sm:inline">{action.label}</span>
        </button>
      ))}
      <button
        onClick={onRefresh}
        className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        <span className="hidden sm:inline">새로고침</span>
      </button>
    </div>
  )
}

// 헤더 요약 - 간소화
const HeaderSummary = ({ totalValue, profitPercent, totalProfit, dividendTotal }) => {
  const isPositive = profitPercent >= 0

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-4 sm:p-6 text-white">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {/* 총 자산 */}
        <div className="text-center sm:text-left">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">총 자산</p>
          <p className="text-2xl sm:text-3xl font-bold">{formatCurrency(totalValue, 'KRW')}</p>
        </div>

        {/* 수익률 */}
        <div className="text-center border-t sm:border-t-0 sm:border-l border-slate-700 pt-4 sm:pt-0 sm:pl-6">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">총 수익</p>
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <p className={`text-2xl sm:text-3xl font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isPositive ? '+' : ''}{profitPercent.toFixed(2)}%
            </p>
            {isPositive ? (
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-rose-400" />
            )}
          </div>
          <p className={`text-sm mt-1 ${isPositive ? 'text-emerald-300' : 'text-rose-300'}`}>
            {formatCurrency(totalProfit, 'KRW')}
          </p>
        </div>

        {/* 배당금 */}
        <div className="text-center sm:text-right border-t sm:border-t-0 sm:border-l border-slate-700 pt-4 sm:pt-0 sm:pl-6">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">연간 배당</p>
          <p className="text-2xl sm:text-3xl font-bold text-amber-400">
            {formatCurrency(dividendTotal, 'KRW')}
          </p>
          <p className="text-sm text-amber-300 mt-1">
            월 {formatCurrency(dividendTotal / 12, 'KRW')}
          </p>
        </div>
      </div>
    </div>
  )
}

// 시장 지표 스트립
const MarketStrip = ({ data }) => {
  return (
    <div className="bg-blue-50 dark:bg-gray-800 border border-blue-100 dark:border-gray-700 rounded-xl p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300">오늘의 시장</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
        {data.map(item => (
          <div key={item.label} className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{item.label}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm font-bold text-gray-900 dark:text-white">{item.value}</p>
              <span className={`text-xs font-semibold flex items-center gap-0.5 ${
                item.change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {item.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(item.change).toFixed(2)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 활동 아이템
const ActivityItem = ({ activity }) => {
  const iconMap = {
    buy: { icon: Plus, bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400' },
    sell: { icon: DollarSign, bg: 'bg-emerald-100 dark:bg-emerald-900/30', color: 'text-emerald-600 dark:text-emerald-400' },
    dividend: { icon: PiggyBank, bg: 'bg-amber-100 dark:bg-amber-900/30', color: 'text-amber-600 dark:text-amber-400' },
    goal: { icon: CheckCircle2, bg: 'bg-purple-100 dark:bg-purple-900/30', color: 'text-purple-600 dark:text-purple-400' }
  }

  const config = iconMap[activity.type] || iconMap.buy
  const Icon = config.icon

  return (
    <div className="flex items-start gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
      <div className={`p-2 rounded-full ${config.bg}`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{activity.description}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-semibold ${
          activity.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
        }`}>
          {activity.amount >= 0 ? '+' : ''}{formatCurrency(activity.amount, 'KRW')}
        </p>
        <p className="text-xs text-gray-400 flex items-center gap-1 justify-end">
          <Clock className="w-3 h-3" />
          {activity.date}
        </p>
      </div>
    </div>
  )
}

// 빈 상태
const EmptyState = ({ message }) => (
  <div className="flex flex-col items-center justify-center h-32 text-center">
    <Wallet className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
    <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
  </div>
)

// 유틸리티 함수들
const safeParseLocalStorage = (key, fallback) => {
  try {
    const value = localStorage.getItem(key)
    if (!value) return fallback
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

const buildPortfolioSummary = (assets, usdToKrw) => {
  let totalValueKRW = 0
  let totalValueUSD = 0
  let totalProfitKRW = 0
  const allocationMap = {}
  const assetsMap = {}
  const performance = []

  const palette = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899']

  assets.forEach(asset => {
    const quantity = Number(asset.quantity || 0)
    const currentPrice = Number(asset.currentPrice || asset.avgPrice || 0)
    const avgPrice = Number(asset.avgPrice || 0)
    const currency = asset.currency || 'USD'
    const type = asset.type || '기타'

    const totalValue = quantity * currentPrice
    const totalProfit = quantity * (currentPrice - avgPrice)

    const valueKRW = currency === 'USD' ? totalValue * usdToKrw : totalValue
    const profitKRW = currency === 'USD' ? totalProfit * usdToKrw : totalProfit
    const valueUSD = currency === 'KRW' ? totalValue / usdToKrw : totalValue
    const profitPercent = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0

    totalValueKRW += valueKRW
    totalProfitKRW += profitKRW
    totalValueUSD += valueUSD

    if (!allocationMap[type]) allocationMap[type] = 0
    allocationMap[type] += valueKRW

    assetsMap[asset.symbol] = { ...asset, valueKRW, currency, profitKRW, profitPercent }

    performance.push({
      id: asset.id || asset.symbol,
      symbol: asset.symbol,
      name: asset.name || asset.symbol,
      type,
      profitKRW,
      profitPercent: Number(profitPercent.toFixed(2)),
      totalValueKRW: valueKRW
    })
  })

  const profitPercent = totalValueKRW - totalProfitKRW !== 0
    ? (totalProfitKRW / (totalValueKRW - totalProfitKRW)) * 100
    : 0

  const allocation = Object.entries(allocationMap)
    .map(([name, value], index) => ({
      name,
      value,
      color: palette[index % palette.length]
    }))
    .sort((a, b) => b.value - a.value)

  return {
    totals: { totalValueKRW, totalValueUSD, totalProfitKRW, profitPercent },
    allocation,
    assetsMap,
    performance
  }
}

const buildPortfolioHistory = (logs, usdToKrw, assetsMap, currentTotal) => {
  const months = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const date = subMonths(startOfMonth(now), i)
    months.push({
      key: format(date, 'yyyy-MM'),
      label: format(date, 'M월', { locale: ko })
    })
  }

  const logsWithCurrency = logs.map(log => {
    const asset = assetsMap[log.asset]
    const quantity = Number(log.quantity || 0)
    const price = Number(log.price || 0)
    const total = Number(log.total || quantity * price || 0)
    const currency = asset?.currency || log.currency || 'USD'
    const totalKRW = currency === 'USD' ? total * usdToKrw : total
    return { ...log, totalKRW }
  })

  let cumulative = 0
  const trend = months.map(month => {
    const monthlyNet = logsWithCurrency
      .filter(log => log.date && format(new Date(log.date), 'yyyy-MM') === month.key)
      .reduce((sum, log) => {
        if (log.type === 'buy') return sum + log.totalKRW
        if (log.type === 'sell') return sum - log.totalKRW
        return sum
      }, 0)
    cumulative += monthlyNet
    return { month: month.label, net: monthlyNet, cumulative }
  })

  if (!trend.length) return []

  const finalCumulative = trend[trend.length - 1].cumulative
  const scale = finalCumulative !== 0 ? currentTotal / finalCumulative : 1

  return trend.map(item => ({
    month: item.month,
    value: Math.max(item.cumulative * scale, 0),
    net: item.net
  }))
}

const summarizeGoals = (goals) => {
  if (!goals.length) {
    return { averageProgress: 0, totalGoals: 0, goals: [] }
  }

  const processedGoals = goals.map(goal => {
    const target = Number(goal.targetAmount || 0)
    const current = Number(goal.currentAmount || 0)
    const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0
    return {
      name: goal.name,
      category: goal.category,
      currency: goal.currency || 'KRW',
      targetAmount: target,
      currentAmount: current,
      progress,
      targetDate: goal.targetDate
    }
  })

  const avgProgress = processedGoals.reduce((sum, g) => sum + g.progress, 0) / processedGoals.length

  return {
    averageProgress: avgProgress,
    totalGoals: goals.length,
    goals: processedGoals.sort((a, b) => b.progress - a.progress)
  }
}

const buildRecentActivities = (logs, dividends, goals, assetsMap, usdToKrw) => {
  const activities = []

  // 거래 내역
  logs.slice(0, 10).forEach(log => {
    const asset = assetsMap[log.asset]
    const currency = asset?.currency || 'USD'
    const total = Number(log.total || 0)
    const amountKRW = currency === 'USD' ? total * usdToKrw : total

    activities.push({
      type: log.type,
      title: `${log.asset} ${log.type === 'buy' ? '매수' : '매도'}`,
      description: `${log.quantity}주 × ${formatCurrency(log.price, currency)}`,
      amount: log.type === 'buy' ? -amountKRW : amountKRW,
      date: log.date ? format(new Date(log.date), 'M/d') : '-',
      timestamp: new Date(log.date).getTime()
    })
  })

  // 배당금
  dividends.slice(0, 5).forEach(div => {
    const amountKRW = div.currency === 'USD' ? div.amount * usdToKrw : div.amount
    activities.push({
      type: 'dividend',
      title: `${div.symbol} 배당금`,
      description: `배당금 입금`,
      amount: amountKRW,
      date: div.date ? format(new Date(div.date), 'M/d') : '-',
      timestamp: new Date(div.date).getTime()
    })
  })

  // 시간순 정렬
  return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 8)
}

const buildMarketHighlights = (marketData) => {
  if (!marketData) return null

  const highlights = []

  if (marketData.stocks?.sp500) {
    highlights.push({
      label: 'S&P 500',
      value: `$${marketData.stocks.sp500.price?.toLocaleString('en-US', { maximumFractionDigits: 0 }) || '-'}`,
      change: marketData.stocks.sp500.changePercent || 0
    })
  }

  if (marketData.crypto?.bitcoin) {
    highlights.push({
      label: 'Bitcoin',
      value: `$${marketData.crypto.bitcoin.price?.toLocaleString('en-US', { maximumFractionDigits: 0 }) || '-'}`,
      change: marketData.crypto.bitcoin.change24h || 0
    })
  }

  if (marketData.currency?.usdKrw) {
    highlights.push({
      label: 'USD/KRW',
      value: `${marketData.currency.usdKrw.rate?.toLocaleString('ko-KR') || '-'}`,
      change: ((marketData.currency.usdKrw.rate - DEFAULT_USD_KRW) / DEFAULT_USD_KRW) * 100
    })
  }

  return highlights.length > 0 ? highlights : null
}

const formatCurrency = (value, currency = 'KRW') => {
  if (value === null || value === undefined) return '-'
  const rounded = Number(value)
  if (!Number.isFinite(rounded)) return '-'

  if (currency === 'USD') {
    return `$${rounded.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  }
  return `${rounded.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원`
}

const formatCompactCurrency = (value) => {
  if (!Number.isFinite(value)) return '-'
  const abs = Math.abs(value)
  if (abs >= 1e8) return `${(value / 1e8).toFixed(1)}억`
  if (abs >= 1e4) return `${(value / 1e4).toFixed(0)}만`
  return value.toFixed(0)
}

export default Dashboard
