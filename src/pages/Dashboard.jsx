import { useCallback, useEffect, useMemo, useState } from 'react'
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
  DollarSign,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Building2,
  Info
} from 'lucide-react'
import { format, startOfMonth, subMonths } from 'date-fns'
import { ko } from 'date-fns/locale'
import ChartCard from '../components/ChartCard'
import StatCard from '../components/StatCard'
import marketDataService from '../services/marketDataService'
import dataSync from '../utils/dataSync'

const DEFAULT_USD_KRW = 1340

const Dashboard = () => {
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
  const [monthlyContribution, setMonthlyContribution] = useState({
    current: 0,
    previous: 0
  })
  const [goalSummary, setGoalSummary] = useState({
    averageProgress: 0,
    totalGoals: 0,
    linkedGoals: 0
  })
  const [recentTransactions, setRecentTransactions] = useState([])
  const [assetPerformance, setAssetPerformance] = useState([])

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

      const {
        totals,
        allocation,
        assetsMap,
        performance
      } = buildPortfolioSummary(assetsRaw, usdToKrw)

      setPortfolioSummary({
        totalValueKRW: totals.totalValueKRW,
        totalValueUSD: totals.totalValueUSD,
        totalProfitKRW: totals.totalProfitKRW,
        profitPercent: totals.profitPercent
      })

      setAllocationData(allocation)
      setAssetPerformance(performance)

      const history = buildPortfolioHistory(logsRaw, usdToKrw, assetsMap, totals.totalValueKRW)
      setPortfolioHistory(history)
      setMonthlyContribution({
        current: history.length ? history[history.length - 1].net : 0,
        previous: history.length > 1 ? history[history.length - 2].net : 0
      })

      const goals = summarizeGoals(goalsRaw)
      setGoalSummary(goals)

      const recent = buildRecentTransactions(logsRaw, assetsMap, usdToKrw)
      setRecentTransactions(recent)
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

  const allocationChartData = useMemo(() => allocationData.map(item => ({
    ...item,
    color: item.color
  })), [allocationData])

  const marketHighlights = useMemo(() => buildMarketHighlights(marketData), [marketData])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center space-y-3">
          <RefreshCw className="w-10 h-10 text-primary-600 animate-spin mx-auto" />
          <p className="text-gray-600 text-sm">대시보드 데이터를 준비하고 있습니다...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center space-y-3">
          <AlertBanner type="error" message={error} />
          <button onClick={loadDashboardData} className="btn-primary">
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <HeaderSummary
        totals={portfolioSummary}
        assetsCount={allocationData.length}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <StatCard
          title="총 평가액"
          value={formatCurrency(portfolioSummary.totalValueKRW, 'KRW')}
          change={Number(portfolioSummary.profitPercent.toFixed(2))}
          changeType={portfolioSummary.profitPercent >= 0 ? 'positive' : 'negative'}
          icon={Wallet}
        />
        <StatCard
          title="월간 순투입"
          value={formatCurrency(monthlyContribution.current, 'KRW')}
          change={calculateChangePercent(monthlyContribution.previous, monthlyContribution.current)}
          changeType={monthlyContribution.current >= 0 ? 'positive' : 'negative'}
          icon={TrendingUp}
        />
        <StatCard
          title="총 수익금"
          value={formatCurrency(portfolioSummary.totalProfitKRW, 'KRW')}
          change={portfolioSummary.profitPercent ? Number(portfolioSummary.profitPercent.toFixed(2)) : 0}
          changeType={portfolioSummary.totalProfitKRW >= 0 ? 'positive' : 'negative'}
          icon={DollarSign}
        />
        <StatCard
          title="평균 목표 달성률"
          value={goalSummary.averageProgress.toFixed(1)}
          suffix="%"
          icon={Target}
        />
      </div>

      {marketHighlights && (
        <MarketStrip data={marketHighlights} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ChartCard
          title="포트폴리오 밸류曲선"
          subtitle="최근 6개월 누적 평가액 (₩ 기준)"
          action={
            <span className="text-xs text-gray-500 hidden sm:inline">
              기준 환율: USD/KRW {(marketData?.currency?.usdKrw?.rate || DEFAULT_USD_KRW).toLocaleString()}
            </span>
          }
        >
          {portfolioHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={portfolioHistory}>
                <defs>
                  <linearGradient id="portfolioValueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis
                  stroke="#94a3b8"
                  tickFormatter={value => formatCompactCurrency(value, 'KRW')}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value, 'KRW')}
                  labelFormatter={label => `${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  fill="url(#portfolioValueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="투자 내역이 없어 그래프를 표시할 수 없습니다. 포트폴리오에 자산을 추가해보세요." />
          )}
        </ChartCard>

        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
          <ChartCard
            title="자산 배분 현황"
            subtitle="평가액 기준"
          >
            {allocationChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={allocationChartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                    >
                      {allocationChartData.map(entry => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value, 'KRW')} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {allocationChartData.map(item => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-gray-700">{item.name}</span>
                      </div>
                      <span className="font-medium text-gray-900">
                        {((item.value / portfolioSummary.totalValueKRW) * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState message="아직 자산 배분 정보가 없습니다. 포트폴리오에 자산을 등록하면 자동으로 집계됩니다." />
            )}
          </ChartCard>

          <ChartCard
            title="목표 현황"
            subtitle={`등록된 목표 ${goalSummary.totalGoals}개`}
          >
            {goalSummary.totalGoals > 0 ? (
              <GoalSummary goalSummary={goalSummary} />
            ) : (
              <EmptyState message="등록된 재무 목표가 없습니다. 목표 관리 페이지에서 새로운 목표를 추가해보세요." />
            )}
          </ChartCard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ChartCard title="최근 거래내역" subtitle="최신 5건의 투자 기록">
          {recentTransactions.length > 0 ? (
            <>
              {/* Mobile Card View */}
              <div className="block sm:hidden space-y-3">
                {recentTransactions.map(tx => (
                  <div key={tx.id} className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{tx.asset}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{tx.date}</p>
                      </div>
                      <TypeBadge type={tx.type} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">수량: <span className="font-medium text-gray-900">{tx.quantity}</span></span>
                      <span className="font-semibold text-gray-900">{tx.amount}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">날짜</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">유형</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">자산</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">수량</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">거래금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map(tx => (
                      <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-sm text-gray-700">{tx.date}</td>
                        <td className="py-3 px-4 text-sm font-medium">
                          <TypeBadge type={tx.type} />
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">{tx.asset}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{tx.quantity}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{tx.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <EmptyState message="최근 거래 내역이 없습니다. 투자일지에서 거래를 기록하면 이곳에 표시됩니다." />
          )}
        </ChartCard>

        <ChartCard
          title="종목별 손익 요약"
          subtitle="평가손익 (원화 기준)"
        >
          {assetPerformance.length > 0 ? (
            <AssetPerformanceTable data={assetPerformance} />
          ) : (
            <EmptyState message="포트폴리오 자산이 없어 손익 요약을 표시할 수 없습니다." />
          )}
        </ChartCard>
      </div>
    </div>
  )
}

const HeaderSummary = ({ totals, assetsCount }) => {
  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4">
      <div className="card bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wide text-slate-300">포트폴리오 스냅샷</p>
            <h1 className="text-xl sm:text-2xl font-bold mt-1 truncate">
              {formatCurrency(totals.totalValueKRW, 'KRW')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2">
              현재 총 평가액 <span className="hidden sm:inline">(USD 환산 {formatCurrency(totals.totalValueUSD, 'USD')})</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3 sm:gap-6">
            <SummaryKPI
              label="총 수익금"
              value={formatCurrency(totals.totalProfitKRW, 'KRW')}
              positive={totals.totalProfitKRW >= 0}
              sub={`${totals.profitPercent >= 0 ? '+' : ''}${totals.profitPercent.toFixed(2)}%`}
              icon={totals.totalProfitKRW >= 0 ? ArrowUpRight : ArrowDownRight}
            />
            <SummaryKPI
              label="등록된 자산"
              value={`${assetsCount}종`}
              positive
              sub="계좌/카테고리 포함"
              icon={Building2}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

const MarketStrip = ({ data }) => {
  return (
    <div className="card border-primary-100 bg-primary-50/60">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary-600 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-primary-700">오늘의 시장 하이라이트</span>
        </div>
        <span className="text-xs text-primary-500 hidden md:inline">데이터 출처: Finnhub · CoinGecko · ExchangeRate API</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {data.map(item => (
          <div key={item.label} className="bg-white/80 border border-white rounded-lg p-3 sm:p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500">{item.label}</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{item.value}</p>
            <div className="flex items-center gap-1 text-xs mt-1">
              <span className={item.change >= 0 ? 'text-success' : 'text-danger'}>
                {item.change >= 0 ? '▲' : '▼'} {Math.abs(item.change).toFixed(2)}%
              </span>
              {item.note && <span className="text-gray-400 hidden sm:inline">· {item.note}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const GoalSummary = ({ goalSummary }) => {
  if (!goalSummary.goals || goalSummary.goals.length === 0) {
    return (
      <div className="text-sm text-gray-600">
        등록된 목표 요약이 없습니다.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>포트폴리오와 연동된 목표</span>
        <span className="font-semibold text-gray-900">{goalSummary.linkedGoals}개</span>
      </div>
      <div className="space-y-2">
        {goalSummary.goals.slice(0, 3).map(goal => (
          <div key={goal.name} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">{goal.name}</p>
              <span className="text-xs text-gray-500">{goal.category}</span>
            </div>
            {goal.progress !== null && (
              <div className="mt-2">
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                  <span>{formatCurrency(goal.currentAmount || 0, goal.currency)}</span>
                  <span>{goal.progress.toFixed(1)}%</span>
                </div>
              </div>
            )}
            {goal.targetDate && (
              <p className="text-xs text-gray-500 mt-2">목표일: {goal.targetDate}</p>
            )}
          </div>
        ))}
      </div>
      {goalSummary.goals.length > 3 && (
        <p className="text-xs text-gray-500 text-right">
          외 {goalSummary.goals.length - 3}개 목표
        </p>
      )}
    </div>
  )
}

const SummaryKPI = ({ label, value, sub, positive, icon: Icon }) => (
  <div className="flex items-center gap-2 sm:gap-3 bg-white/10 border border-white/20 rounded-lg px-3 py-2 sm:px-4 sm:py-3 min-w-0">
    <div className="p-1.5 sm:p-2 rounded-full bg-white/20 flex-shrink-0">
      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-slate-200">{label}</p>
      <p className="text-sm sm:text-base font-semibold text-white truncate">{value}</p>
      <p className={`text-xs mt-1 ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>
        {sub}
      </p>
    </div>
  </div>
)

const AssetPerformanceTable = ({ data }) => {
  const displayData = data.slice(0, 12)

  return (
    <>
      {/* Mobile Card View */}
      <div className="block sm:hidden space-y-3">
        {displayData.map(row => {
          const positive = row.profitKRW >= 0
          const Icon = positive ? ArrowUp : ArrowDown
          return (
            <div key={row.id} className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{row.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{row.symbol} · {row.type}</p>
                </div>
                <div className={`flex items-center gap-1 text-lg font-bold ${
                  positive ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  <Icon className="w-4 h-4" />
                  <span>{row.profitPercent >= 0 ? '+' : ''}{row.profitPercent.toFixed(1)}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-600">평가손익</span>
                <span className={`text-sm font-semibold ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(row.profitKRW, 'KRW')}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-600">평가액</span>
                <span className="text-sm font-medium text-gray-900">{formatCurrency(row.totalValueKRW, 'KRW')}</span>
              </div>
            </div>
          )
        })}
        {data.length > displayData.length && (
          <p className="text-xs text-gray-500 text-center py-2">
            외 {data.length - displayData.length}개 종목
          </p>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">종목</th>
              <th className="text-right px-4 py-2 text-xs font-semibold text-gray-600">평가손익</th>
            </tr>
          </thead>
          <tbody>
            {displayData.map(row => {
              const positive = row.profitKRW >= 0
              const Icon = positive ? ArrowUp : ArrowDown
              return (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 text-sm">{row.name}</span>
                      <span className="text-xs text-gray-500">{row.symbol} · {row.type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className={`inline-flex items-center gap-1 text-sm font-semibold ${
                      positive ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                      <span>{formatCurrency(row.profitKRW, 'KRW')}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {row.profitPercent >= 0 ? '+' : ''}{row.profitPercent.toFixed(2)}% · 평가액 {formatCurrency(row.totalValueKRW, 'KRW')}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {data.length > displayData.length && (
          <p className="text-xs text-gray-500 px-4 py-2 bg-gray-50 text-right">
            외 {data.length - displayData.length}개 종목
          </p>
        )}
      </div>
    </>
  )
}

const TypeBadge = ({ type }) => {
  const isBuy = type === 'buy' || type === '매수'
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${
      isBuy ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-500 border border-rose-200'
    }`}>
      {isBuy ? '매수' : '매도'}
    </span>
  )
}

const AlertBanner = ({ type = 'info', message }) => {
  const styles = type === 'error'
    ? 'bg-rose-50 border border-rose-200 text-rose-600'
    : 'bg-blue-50 border border-blue-200 text-blue-600'
  return (
    <div className={`px-4 py-3 rounded-lg text-sm ${styles}`}>
      {message}
    </div>
  )
}

const EmptyState = ({ message }) => (
  <div className="flex flex-col items-center justify-center h-40 text-center">
    <p className="text-sm text-gray-500">{message}</p>
  </div>
)

const safeParseLocalStorage = (key, fallback) => {
  try {
    const value = localStorage.getItem(key)
    if (!value) return fallback
    return JSON.parse(value)
  } catch (error) {
    console.error(`Failed to parse localStorage for key ${key}:`, error)
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
    const valueUSD = currency === 'KRW' ? (usdToKrw ? totalValue / usdToKrw : totalValue) : totalValue
    const profitPercent = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0

    totalValueKRW += valueKRW
    totalProfitKRW += profitKRW
    totalValueUSD += valueUSD

    if (!allocationMap[type]) {
      allocationMap[type] = 0
    }
    allocationMap[type] += valueKRW

    assetsMap[asset.symbol] = {
      ...asset,
      valueKRW,
      currency,
      profitKRW,
      profitPercent
    }

    performance.push({
      id: asset.id || asset.symbol,
      symbol: asset.symbol,
      name: asset.name || asset.symbol,
      type,
      currency,
      profitKRW,
      profitPercent: Number(profitPercent.toFixed(2)),
      totalValueKRW: valueKRW
    })
  })

  const profitPercent = totalValueKRW - totalProfitKRW !== 0
    ? (totalProfitKRW / (totalValueKRW - totalProfitKRW)) * 100
    : 0

  const palette = ['#0ea5e9', '#10b981', '#f97316', '#6366f1', '#ef4444', '#14b8a6', '#8b5cf6']

  const allocation = Object.entries(allocationMap).map(([name, value], index) => ({
    name,
    value,
    color: palette[index % palette.length]
  })).sort((a, b) => b.value - a.value)

  return {
    totals: {
      totalValueKRW,
      totalValueUSD,
      totalProfitKRW,
      profitPercent
    },
    allocation,
    assetsMap,
    performance: performance
      .sort((a, b) => b.profitKRW - a.profitKRW)
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
    const currency = asset?.currency || (log.currency || 'USD')
    const totalKRW = currency === 'USD' ? total * usdToKrw : total
    return {
      ...log,
      totalKRW
    }
  })

  let cumulative = 0
  const trend = months.map(month => {
    const monthlyNet = logsWithCurrency
      .filter(log => log.date && format(new Date(log.date), 'yyyy-MM') === month.key)
      .reduce((sum, log) => {
        if (log.type === 'buy') {
          return sum + log.totalKRW
        }
        if (log.type === 'sell') {
          return sum - log.totalKRW
        }
        return sum
      }, 0)
    cumulative += monthlyNet
    return {
      month: month.label,
      net: monthlyNet,
      cumulative
    }
  })

  if (!trend.length) {
    return []
  }

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
    return {
      averageProgress: 0,
      totalGoals: 0,
      linkedGoals: 0,
      goals: []
    }
  }

  let totalProgress = 0
  const processedGoals = goals.map(goal => {
    const target = Number(goal.targetAmount || 0)
    const current = Number(goal.currentAmount || 0)
    const progress = target > 0 ? Math.min((current / target) * 100, 999) : null
    if (progress !== null) {
      totalProgress += progress
    }
    return {
      name: goal.name,
      category: goal.category,
      currency: goal.currency || 'USD',
      targetAmount: target,
      currentAmount: current,
      progress: progress !== null ? Number(progress.toFixed(2)) : null,
      targetDate: goal.targetDate || null
    }
  })

  const goalsWithProgress = processedGoals.filter(goal => goal.progress !== null)
  const averageProgress = goalsWithProgress.length
    ? totalProgress / goalsWithProgress.length
    : 0

  return {
    averageProgress: Number(averageProgress.toFixed(2)),
    totalGoals: goals.length,
    linkedGoals: goals.filter(goal => goal.linkedToPortfolio).length,
    goals: processedGoals
  }
}

const buildRecentTransactions = (logs, assetsMap, usdToKrw) => {
  if (!logs.length) return []

  return logs
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)
    .map(log => {
      const asset = assetsMap[log.asset]
      const currency = asset?.currency || log.currency || 'USD'
      const total = Number(log.total || 0)
      const amountKRW = currency === 'USD' ? total * usdToKrw : total
      return {
        id: log.id || `${log.asset}-${log.date}`,
        date: log.date ? format(new Date(log.date), 'yyyy-MM-dd') : '-',
        type: log.type,
        asset: log.asset,
        quantity: Number(log.quantity || 0).toLocaleString('en-US', { maximumFractionDigits: 4 }),
        amount: formatCurrency(amountKRW, 'KRW')
      }
    })
}

const buildMarketHighlights = (marketData) => {
  if (!marketData) return null

  const highlights = []

  if (marketData.stocks?.sp500) {
    highlights.push({
      label: 'S&P 500 (SPY)',
      value: `$${marketData.stocks.sp500.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
      change: marketData.stocks.sp500.changePercent || 0,
      note: marketData.stocks.sp500.change >= 0 ? '상승' : '하락'
    })
  }

  if (marketData.crypto?.bitcoin) {
    highlights.push({
      label: 'Bitcoin',
      value: `$${marketData.crypto.bitcoin.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      change: marketData.crypto.bitcoin.change24h || 0,
      note: '24시간 변동'
    })
  }

  if (marketData.currency?.usdKrw) {
    highlights.push({
      label: 'USD/KRW',
      value: marketData.currency.usdKrw.rate.toLocaleString('en-US', { maximumFractionDigits: 2 }),
      change: marketData.currency.usdKrw.rate >= DEFAULT_USD_KRW ? ((marketData.currency.usdKrw.rate - DEFAULT_USD_KRW) / DEFAULT_USD_KRW) * 100 : ((marketData.currency.usdKrw.rate - DEFAULT_USD_KRW) / DEFAULT_USD_KRW) * 100,
      note: '원/달러 환율'
    })
  }

  return highlights
}

const formatCurrency = (value, currency = 'KRW') => {
  if (value === null || value === undefined) return '-'
  const rounded = Number(value)
  if (!Number.isFinite(rounded)) return '-'

  if (currency === 'USD') {
    return `$${rounded.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  }
  return `₩${rounded.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`
}

const formatCompactCurrency = (value, currency = 'KRW') => {
  if (!Number.isFinite(value)) return '-'
  const abs = Math.abs(value)
  if (abs >= 1e12) {
    return `${(value / 1e12).toFixed(1)}조`
  }
  if (abs >= 1e8 && currency === 'KRW') {
    return `${(value / 1e8).toFixed(1)}억`
  }
  if (abs >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M`
  }
  if (abs >= 1e3) {
    return `${(value / 1e3).toFixed(1)}K`
  }
  return value.toFixed(0)
}

const calculateChangePercent = (previous, current) => {
  if (!previous) return 0
  const diff = current - previous
  return Number(((diff / Math.abs(previous)) * 100).toFixed(2))
}

export default Dashboard
