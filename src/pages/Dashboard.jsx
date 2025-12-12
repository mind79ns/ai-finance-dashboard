import { useCallback, useEffect, useMemo, useState } from 'react'
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
  YAxis,
  Legend
} from 'recharts'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Building2,
  Info,
  Bell,
  BellRing,
  Calculator,
  Banknote,
  Calendar,
  PiggyBank,
  AlertTriangle,
  X,
  Plus
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
  const [accountSummary, setAccountSummary] = useState([])
  const [assetStatusTotal, setAssetStatusTotal] = useState(0)
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

  // New features state
  const [dividendSummary, setDividendSummary] = useState({ totalAnnual: 0, monthlyAvg: 0, assets: [] })
  const [priceAlerts, setPriceAlerts] = useState([])
  const [monthlyReturns, setMonthlyReturns] = useState([])
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [newAlert, setNewAlert] = useState({ symbol: '', targetPrice: '', direction: 'above' })

  // Net Worth Tracker state
  const [debts, setDebts] = useState([])
  const [showDebtModal, setShowDebtModal] = useState(false)
  const [debtForm, setDebtForm] = useState({ name: '', amount: '', interestRate: '', type: 'loan' })
  const [editingDebt, setEditingDebt] = useState(null)

  // Stress Test state
  const [stressTestRate, setStressTestRate] = useState(20)


  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [market, loadedAssets, loadedLogs, loadedGoals, assetAccountData] = await Promise.all([
        marketDataService.getAllMarketData().catch(err => {
          console.error('Dashboard market data error:', err)
          return null
        }),
        dataSync.loadPortfolioAssets(),
        dataSync.loadInvestmentLogs(),
        dataSync.loadGoals(),
        dataSync.loadUserSetting('asset_account_data')
      ])

      const usdToKrw = market?.currency?.usdKrw?.rate || DEFAULT_USD_KRW
      setMarketData(market)

      const assetsRaw = Array.isArray(loadedAssets) ? loadedAssets : safeParseLocalStorage('portfolio_assets', [])
      const logsRaw = Array.isArray(loadedLogs) ? loadedLogs : safeParseLocalStorage('investment_logs', [])
      const goalsRaw = Array.isArray(loadedGoals) ? loadedGoals : safeParseLocalStorage('investment_goals', [])

      // Calculate AssetStatus TOTAL value
      const currentYear = new Date().getFullYear()
      const yearAccounts = assetAccountData?.[currentYear] || {}
      let assetTotalValue = 0
      Object.values(yearAccounts).forEach(accountCategories => {
        Object.values(accountCategories).forEach(value => {
          assetTotalValue += Number(value || 0)
        })
      })
      setAssetStatusTotal(assetTotalValue)

      const {
        totals,
        allocation,
        assetsMap,
        performance,
        accountBreakdown
      } = buildPortfolioSummary(assetsRaw, usdToKrw)

      setPortfolioSummary({
        totalValueKRW: totals.totalValueKRW,
        totalValueUSD: totals.totalValueUSD,
        totalProfitKRW: totals.totalProfitKRW,
        profitPercent: totals.profitPercent
      })

      setAccountSummary(accountBreakdown)
      setAllocationData(allocation)
      setAssetPerformance(performance)

      // Load actual dividend transactions (from TransactionHistory input)
      const dividendData = await dataSync.loadUserSetting('dividend_transactions')
      const dividends = calculateDividendFromTransactions(dividendData || [], usdToKrw)
      setDividendSummary(dividends)


      const history = buildPortfolioHistory(logsRaw, usdToKrw, assetsMap, totals.totalValueKRW)
      setPortfolioHistory(history)
      setMonthlyContribution({
        current: history.length ? history[history.length - 1].net : 0,
        previous: history.length > 1 ? history[history.length - 2].net : 0
      })

      // Calculate monthly returns from history
      const returns = calculateMonthlyReturns(history)
      setMonthlyReturns(returns)

      // Load price alerts from localStorage
      const savedAlerts = safeParseLocalStorage('price_alerts', [])
      setPriceAlerts(savedAlerts)

      // Load debts for net worth tracker
      const savedDebts = await dataSync.loadUserSetting('user_debts')
      setDebts(Array.isArray(savedDebts) ? savedDebts : [])

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
        accountSummary={accountSummary}
        assetStatusTotal={assetStatusTotal}
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

      {/* New Features Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Dividend Tracker */}
        <ChartCard
          title="배당금 추적기"
          subtitle="연간 예상 배당 수익"
          icon={<PiggyBank className="w-5 h-5 text-emerald-500" />}
        >
          <DividendTracker dividendSummary={dividendSummary} />
        </ChartCard>

        {/* Tax Calculator */}
        <ChartCard
          title="세금 계산기"
          subtitle="국내/해외 매도 수익 세금 계산"
          icon={<Calculator className="w-5 h-5 text-amber-500" />}
        >
          <TaxCalculator />
        </ChartCard>

        {/* Price Alerts */}
        <ChartCard
          title="가격 알림"
          subtitle="목표가 도달 알림 설정"
          icon={<Bell className="w-5 h-5 text-blue-500" />}
          action={
            <button
              onClick={() => setShowAlertModal(true)}
              className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-lg flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> 추가
            </button>
          }
        >
          <PriceAlertsList
            alerts={priceAlerts}
            onDelete={(id) => {
              const updated = priceAlerts.filter(a => a.id !== id)
              setPriceAlerts(updated)
              localStorage.setItem('price_alerts', JSON.stringify(updated))
            }}
          />
        </ChartCard>

        {/* Net Worth Tracker */}
        <ChartCard
          title="순자산 트래커"
          subtitle="자산 - 부채 = 순자산"
          icon={<Wallet className="w-5 h-5 text-indigo-500" />}
        >
          <NetWorthTracker
            totalAssets={portfolioSummary.totalValueKRW}
            debts={debts}
            onAddDebt={() => {
              setEditingDebt(null)
              setDebtForm({ name: '', amount: '', interestRate: '', type: 'loan' })
              setShowDebtModal(true)
            }}
            onDeleteDebt={(id) => {
              const updated = debts.filter(d => d.id !== id)
              setDebts(updated)
              dataSync.saveUserSetting('user_debts', updated)
            }}
          />
        </ChartCard>

        {/* Stress Test */}
        <ChartCard
          title="하락 시뮬레이션"
          subtitle="시장 폭락 시 자산 변화"
          icon={<TrendingDown className="w-5 h-5 text-rose-500" />}
        >
          <StressTest
            totalAssets={portfolioSummary.totalValueKRW}
            rate={stressTestRate}
            onRateChange={setStressTestRate}
          />
        </ChartCard>
      </div>

      {/* Monthly Returns Chart */}
      <ChartCard
        title="월별 수익률 히스토리"
        subtitle="최근 6개월 수익률 추이"
        icon={<Calendar className="w-5 h-5 text-purple-500" />}
      >
        <MonthlyReturnsChart data={monthlyReturns} />
      </ChartCard>

      {/* Price Alert Modal */}
      {showAlertModal && (
        <PriceAlertModal
          newAlert={newAlert}
          setNewAlert={setNewAlert}
          onClose={() => setShowAlertModal(false)}
          onSave={() => {
            if (newAlert.symbol && newAlert.targetPrice) {
              const alert = {
                id: Date.now(),
                symbol: newAlert.symbol.toUpperCase(),
                targetPrice: parseFloat(newAlert.targetPrice),
                direction: newAlert.direction,
                createdAt: new Date().toISOString()
              }
              const updated = [...priceAlerts, alert]
              setPriceAlerts(updated)
              localStorage.setItem('price_alerts', JSON.stringify(updated))
              setNewAlert({ symbol: '', targetPrice: '', direction: 'above' })
              setShowAlertModal(false)
            }
          }}
        />
      )}

      {/* Debt Modal */}
      {showDebtModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">부채 추가</h3>
              <button onClick={() => setShowDebtModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">부채명</label>
                <input
                  type="text"
                  value={debtForm.name}
                  onChange={(e) => setDebtForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="예: 주택담보대출"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">금액 (원)</label>
                <input
                  type="number"
                  value={debtForm.amount}
                  onChange={(e) => setDebtForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="예: 100000000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이자율 % (선택)</label>
                <input
                  type="number"
                  step="0.1"
                  value={debtForm.interestRate}
                  onChange={(e) => setDebtForm(prev => ({ ...prev, interestRate: e.target.value }))}
                  placeholder="예: 3.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
                <select
                  value={debtForm.type}
                  onChange={(e) => setDebtForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="loan">대출</option>
                  <option value="mortgage">주택담보</option>
                  <option value="credit">신용카드</option>
                  <option value="other">기타</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDebtModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => {
                  if (debtForm.name && debtForm.amount) {
                    const newDebt = {
                      id: Date.now(),
                      ...debtForm,
                      createdAt: new Date().toISOString()
                    }
                    const updated = [...debts, newDebt]
                    setDebts(updated)
                    dataSync.saveUserSetting('user_debts', updated)
                    setShowDebtModal(false)
                    setDebtForm({ name: '', amount: '', interestRate: '', type: 'loan' })
                  }
                }}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const HeaderSummary = ({ totals, assetsCount, accountSummary, assetStatusTotal }) => {
  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4">
      <div className="card bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="space-y-4">
          {/* 상단: 포트폴리오 스냅샷, TOTAL, 총 수익금 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 포트폴리오 스냅샷 (현재 총 평가액) */}
            <div className="flex flex-col">
              <p className="text-xs uppercase tracking-wide text-slate-300 mb-1">포트폴리오 스냅샷</p>
              <h1 className="text-2xl font-bold truncate">
                {formatCurrency(totals.totalValueKRW, 'KRW')}
              </h1>
              <p className="text-xs text-slate-300 mt-1">
                현재 총 평가액 <span className="hidden lg:inline">(USD 환산 {formatCurrency(totals.totalValueUSD, 'USD')})</span>
              </p>
            </div>

            {/* TOTAL */}
            <div className="flex flex-col">
              <p className="text-xs uppercase tracking-wide text-slate-300 mb-1">TOTAL</p>
              <h1 className="text-2xl font-bold truncate">
                {formatCurrency(assetStatusTotal, 'KRW')}
              </h1>
              <p className="text-xs text-emerald-300 mt-1">
                자산현황 TOTAL
              </p>
            </div>

            {/* 총 수익금 */}
            <div className="flex flex-col">
              <p className="text-xs uppercase tracking-wide text-slate-300 mb-1">총 수익금</p>
              <h1 className={`text-2xl font-bold truncate ${totals.totalProfitKRW >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {formatCurrency(totals.totalProfitKRW, 'KRW')}
              </h1>
              <p className={`text-xs mt-1 ${totals.totalProfitKRW >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {totals.profitPercent >= 0 ? '+' : ''}{totals.profitPercent.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* 하단: 6개 계좌 카드 3*2 그리드 */}
          {accountSummary && accountSummary.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {accountSummary.map((account) => (
                <AccountCard
                  key={account.account}
                  label={account.account}
                  value={formatCurrency(account.totalValueKRW, 'KRW')}
                  positive={account.profitKRW >= 0}
                  sub={`${account.profitPercent >= 0 ? '+' : ''}${account.profitPercent.toFixed(2)}%`}
                />
              ))}
            </div>
          )}
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

const AccountCard = ({ label, value, sub, positive, isTotal }) => (
  <div className={`bg-white/10 border ${isTotal ? 'border-emerald-400/50 bg-emerald-500/20' : 'border-white/20'} rounded-lg px-3 py-3 hover:bg-white/15 transition-colors`}>
    <div className="flex items-center gap-2 mb-2">
      <Wallet className="w-4 h-4 text-slate-300 flex-shrink-0" />
      <p className="text-xs font-medium text-slate-200 truncate">{label}</p>
    </div>
    <p className="text-sm font-bold text-white truncate mb-1">{value}</p>
    <p className={`text-xs font-semibold ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>
      {sub}
    </p>
  </div>
)

const AssetPerformanceTable = ({ data }) => {
  return (
    <>
      {/* Mobile Card View - 스크롤 가능 */}
      <div className="block sm:hidden max-h-[500px] overflow-y-auto space-y-3 pr-2">
        {data.map(row => {
          const positive = row.profitKRW >= 0
          const Icon = positive ? ArrowUp : ArrowDown
          return (
            <div key={row.id} className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{row.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{row.symbol} · {row.type}</p>
                </div>
                <div className={`flex items-center gap-1 text-lg font-bold ${positive ? 'text-emerald-600' : 'text-rose-600'
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
      </div>

      {/* Desktop Table View - 스크롤 가능 */}
      <div className="hidden sm:block border border-gray-200 rounded-lg overflow-hidden">
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">종목</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-gray-600">평가손익</th>
              </tr>
            </thead>
            <tbody>
              {data.map(row => {
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
                      <div className={`inline-flex items-center gap-1 text-sm font-semibold ${positive ? 'text-emerald-600' : 'text-rose-600'
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
        </div>
      </div>
    </>
  )
}

// Dividend Tracker Component
const DividendTracker = ({ dividendSummary }) => {
  const { totalAnnual, monthlyAvg, assets } = dividendSummary

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <p className="text-xs text-emerald-600 font-medium">연간 예상 배당</p>
          <p className="text-lg font-bold text-emerald-700">
            {formatCurrency(totalAnnual, 'KRW')}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-600 font-medium">월 평균 배당</p>
          <p className="text-lg font-bold text-blue-700">
            {formatCurrency(monthlyAvg, 'KRW')}
          </p>
        </div>
      </div>
      {assets.length > 0 ? (
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {assets.slice(0, 5).map(asset => (
            <div key={asset.symbol} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
              <div>
                <span className="font-medium text-gray-900">{asset.symbol}</span>
                <span className="text-xs text-gray-500 ml-2">{asset.dividendYield.toFixed(2)}%</span>
              </div>
              <span className="text-emerald-600 font-medium">
                {formatCurrency(asset.annualDividend, 'KRW')}/년
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-gray-500 py-4">배당 정보가 없습니다</p>
      )}
    </div>
  )
}

// Tax Calculator Component - Interactive version
const TaxCalculator = () => {
  const [accountType, setAccountType] = useState('overseas') // overseas / domestic
  const [profitAmount, setProfitAmount] = useState('')

  // 세금 계산 로직
  // 해외주식: 양도소득세 22% (지방세 포함), 기본공제 250만원
  // 국내주식: 대주주만 과세 (일반 투자자 비과세), 금융소득종합과세 대상자 별도
  const OVERSEAS_BASIC_DEDUCTION = 2500000
  const OVERSEAS_TAX_RATE = 0.22
  const DOMESTIC_TAX_RATE = 0 // 일반 투자자 비과세 (대주주 아닌 경우)
  const DOMESTIC_LARGE_TAX_RATE = 0.22 // 대주주인 경우

  const profit = parseFloat(profitAmount) || 0

  let taxableProfit = 0
  let estimatedTax = 0
  let deduction = 0
  let taxRate = 0
  let taxRateLabel = ''

  if (accountType === 'overseas') {
    deduction = OVERSEAS_BASIC_DEDUCTION
    taxableProfit = Math.max(profit - deduction, 0)
    taxRate = OVERSEAS_TAX_RATE
    taxRateLabel = '22%'
    estimatedTax = taxableProfit * taxRate
  } else {
    // 국내주식 - 일반투자자는 비과세
    deduction = 0
    taxableProfit = profit
    taxRate = DOMESTIC_TAX_RATE
    taxRateLabel = '0% (일반투자자)'
    estimatedTax = 0
  }

  const netProfit = profit - estimatedTax

  return (
    <div className="space-y-4">
      {/* 계좌 유형 선택 */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">계좌 유형</label>
        <div className="flex gap-2">
          <button
            onClick={() => setAccountType('overseas')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${accountType === 'overseas'
              ? 'bg-amber-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            🌍 해외주식
          </button>
          <button
            onClick={() => setAccountType('domestic')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${accountType === 'domestic'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            🇰🇷 국내주식
          </button>
        </div>
      </div>

      {/* 매도 수익금 입력 */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">매도 수익금 (원)</label>
        <input
          type="number"
          value={profitAmount}
          onChange={(e) => setProfitAmount(e.target.value)}
          placeholder="예: 5000000"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
        />
      </div>

      {/* 계산 결과 */}
      {profit > 0 && (
        <div className="space-y-2 pt-2 border-t border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">매도 수익금</span>
            <span className="text-gray-900 font-medium">₩{profit.toLocaleString()}</span>
          </div>
          {accountType === 'overseas' && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">기본공제</span>
              <span className="text-gray-900">-₩{deduction.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">과세대상</span>
            <span className="text-gray-900">₩{taxableProfit.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
            <span className="text-gray-700 font-medium">세율 ({taxRateLabel})</span>
            <span className="text-amber-600 font-bold">₩{estimatedTax.toLocaleString()}</span>
          </div>
          <div className="flex justify-between bg-emerald-50 rounded-lg p-2">
            <span className="text-emerald-700 font-medium">세후 순수익</span>
            <span className="text-emerald-700 font-bold">₩{netProfit.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* 안내 문구 */}
      <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
        {accountType === 'overseas' ? (
          <p>💡 해외주식: 연 250만원 기본공제 후 22% 과세 (지방세 포함)</p>
        ) : (
          <p>💡 국내주식: 일반 투자자는 비과세 (대주주·금융소득종합과세 대상자 별도)</p>
        )}\r
      </div>
    </div>
  )
}

// Net Worth Tracker Component
const NetWorthTracker = ({ totalAssets, debts, onAddDebt, onDeleteDebt }) => {
  const totalDebt = debts.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)
  const netWorth = totalAssets - totalDebt
  const debtRatio = totalAssets > 0 ? (totalDebt / totalAssets * 100) : 0

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-xs text-blue-600 mb-1">총 자산</p>
          <p className="text-sm font-bold text-blue-900">₩{(totalAssets / 10000).toFixed(0)}만</p>
        </div>
        <div className="bg-rose-50 rounded-lg p-3 text-center">
          <p className="text-xs text-rose-600 mb-1">총 부채</p>
          <p className="text-sm font-bold text-rose-900">₩{(totalDebt / 10000).toFixed(0)}만</p>
        </div>
        <div className={`rounded-lg p-3 text-center ${netWorth >= 0 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
          <p className={`text-xs mb-1 ${netWorth >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>순자산</p>
          <p className={`text-sm font-bold ${netWorth >= 0 ? 'text-emerald-900' : 'text-amber-900'}`}>
            ₩{(netWorth / 10000).toFixed(0)}만
          </p>
        </div>
      </div>

      {/* Debt Ratio Bar */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-600">부채비율</span>
          <span className={`font-medium ${debtRatio > 50 ? 'text-rose-600' : 'text-gray-900'}`}>
            {debtRatio.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${debtRatio > 50 ? 'bg-rose-500' : debtRatio > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(debtRatio, 100)}%` }}
          />
        </div>
      </div>

      {/* Debt List */}
      {debts.length > 0 && (
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {debts.map(debt => (
            <div key={debt.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
              <div>
                <span className="font-medium text-gray-900">{debt.name}</span>
                <span className="text-gray-500 text-xs ml-2">
                  {debt.interestRate ? `${debt.interestRate}%` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-rose-600 font-medium">₩{parseInt(debt.amount).toLocaleString()}</span>
                <button onClick={() => onDeleteDebt(debt.id)} className="text-gray-400 hover:text-rose-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Debt Button */}
      <button
        onClick={onAddDebt}
        className="w-full py-2 px-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 text-sm hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        부채 추가
      </button>
    </div>
  )
}

// Stress Test Component
const StressTest = ({ totalAssets, rate, onRateChange }) => {
  const dropAmount = totalAssets * (rate / 100)
  const afterDrop = totalAssets - dropAmount

  const presetRates = [10, 20, 30, 50]

  return (
    <div className="space-y-4">
      {/* Rate Selector */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">하락률 선택</label>
        <div className="flex gap-2">
          {presetRates.map(r => (
            <button
              key={r}
              onClick={() => onRateChange(r)}
              className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-all ${rate === r
                ? 'bg-rose-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              -{r}%
            </button>
          ))}
        </div>
      </div>

      {/* Custom Input */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">직접 입력 (%)</label>
        <input
          type="number"
          value={rate}
          onChange={(e) => onRateChange(parseInt(e.target.value) || 0)}
          min="0"
          max="100"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
        />
      </div>

      {/* Result */}
      <div className="bg-rose-50 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">현재 자산</span>
          <span className="text-gray-900 font-medium">₩{totalAssets.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-rose-600">하락 금액 (-{rate}%)</span>
          <span className="text-rose-600 font-medium">-₩{dropAmount.toLocaleString()}</span>
        </div>
        <div className="border-t border-rose-200 pt-2 flex justify-between">
          <span className="text-gray-700 font-medium">예상 자산</span>
          <span className="text-rose-700 font-bold">₩{afterDrop.toLocaleString()}</span>
        </div>
      </div>

      <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
        <p>💡 시장 폭락 시 포트폴리오 영향을 미리 확인해보세요</p>
      </div>
    </div>
  )
}

// Price Alerts List Component
const PriceAlertsList = ({ alerts, onDelete }) => {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="text-center py-6">
        <BellRing className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">설정된 알림이 없습니다</p>
        <p className="text-xs text-gray-400 mt-1">+ 추가 버튼으로 가격 알림을 설정하세요</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-40 overflow-y-auto">
      {alerts.map(alert => (
        <div key={alert.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            {alert.direction === 'above' ? (
              <ArrowUp className="w-4 h-4 text-emerald-500" />
            ) : (
              <ArrowDown className="w-4 h-4 text-rose-500" />
            )}
            <div>
              <span className="font-medium text-gray-900 text-sm">{alert.symbol}</span>
              <p className="text-xs text-gray-500">
                {alert.direction === 'above' ? '이상' : '이하'} ${alert.targetPrice.toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={() => onDelete(alert.id)}
            className="text-gray-400 hover:text-rose-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

// Price Alert Modal
const PriceAlertModal = ({ newAlert, setNewAlert, onClose, onSave }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">가격 알림 추가</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">종목 심볼</label>
            <input
              type="text"
              value={newAlert.symbol}
              onChange={(e) => setNewAlert({ ...newAlert, symbol: e.target.value })}
              placeholder="예: AAPL, TSLA"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">목표가 (USD)</label>
            <input
              type="number"
              value={newAlert.targetPrice}
              onChange={(e) => setNewAlert({ ...newAlert, targetPrice: e.target.value })}
              placeholder="예: 200.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">조건</label>
            <select
              value={newAlert.direction}
              onChange={(e) => setNewAlert({ ...newAlert, direction: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="above">이상 도달 시</option>
              <option value="below">이하 하락 시</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={onSave}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}

// Monthly Returns Chart Component
const MonthlyReturnsChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-sm text-gray-500">수익률 데이터가 없습니다</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="month" stroke="#94a3b8" />
        <YAxis
          stroke="#94a3b8"
          tickFormatter={(value) => `${value.toFixed(0)}%`}
        />
        <Tooltip
          formatter={(value) => [`${value.toFixed(2)}%`, '수익률']}
          labelFormatter={(label) => `${label}`}
        />
        <Bar
          dataKey="returnPercent"
          fill="#10b981"
          radius={[4, 4, 0, 0]}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.returnPercent >= 0 ? '#10b981' : '#ef4444'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// Calculate Dividend Summary from actual user-entered transactions
const calculateDividendFromTransactions = (dividendTransactions, usdToKrw) => {
  if (!dividendTransactions || dividendTransactions.length === 0) {
    return { totalAnnual: 0, monthlyAvg: 0, assets: [] }
  }

  const currentYear = new Date().getFullYear()

  // Filter by current year
  const yearlyDividends = dividendTransactions.filter(d =>
    new Date(d.date).getFullYear() === currentYear
  )

  // Calculate total annual dividend in KRW
  let totalAnnual = 0
  const bySymbol = {}

  yearlyDividends.forEach(d => {
    const amountKRW = d.currency === 'USD' ? d.amount * usdToKrw : d.amount
    totalAnnual += amountKRW

    if (!bySymbol[d.symbol]) {
      bySymbol[d.symbol] = { symbol: d.symbol, annualDividend: 0, count: 0 }
    }
    bySymbol[d.symbol].annualDividend += amountKRW
    bySymbol[d.symbol].count += 1
  })

  // Calculate average yield (estimate based on data)
  const assets = Object.values(bySymbol)
    .map(item => ({
      symbol: item.symbol,
      dividendYield: 0, // Will be calculated if portfolio data available
      annualDividend: item.annualDividend,
      count: item.count
    }))
    .sort((a, b) => b.annualDividend - a.annualDividend)

  return {
    totalAnnual,
    monthlyAvg: totalAnnual / 12,
    assets
  }
}


// Calculate Monthly Returns
const calculateMonthlyReturns = (portfolioHistory) => {
  if (!portfolioHistory || portfolioHistory.length < 2) {
    return []
  }

  return portfolioHistory.map((month, index) => {
    if (index === 0) {
      return {
        month: month.month,
        returnPercent: 0
      }
    }
    const prevValue = portfolioHistory[index - 1].value || 1
    const currentValue = month.value || 0
    const returnPercent = prevValue > 0 ? ((currentValue - prevValue) / prevValue) * 100 : 0

    return {
      month: month.month,
      returnPercent: Number(returnPercent.toFixed(2))
    }
  })
}


const TypeBadge = ({ type }) => {
  const isBuy = type === 'buy' || type === '매수'
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${isBuy ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-500 border border-rose-200'
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
  const accountMap = {}

  const performance = []

  assets.forEach(asset => {
    const quantity = Number(asset.quantity || 0)
    const currentPrice = Number(asset.currentPrice || asset.avgPrice || 0)
    const avgPrice = Number(asset.avgPrice || 0)
    const currency = asset.currency || 'USD'
    const type = asset.type || '기타'
    const account = asset.account || '기본계좌'

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

    // 계좌별 집계
    if (!accountMap[account]) {
      accountMap[account] = {
        account,
        totalValueKRW: 0,
        profitKRW: 0,
        profitPercent: 0,
        assetCount: 0
      }
    }
    accountMap[account].totalValueKRW += valueKRW
    accountMap[account].profitKRW += profitKRW
    accountMap[account].assetCount += 1

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

  // 계좌별 수익률 계산
  Object.values(accountMap).forEach(account => {
    const investedAmount = account.totalValueKRW - account.profitKRW
    account.profitPercent = investedAmount > 0
      ? (account.profitKRW / investedAmount) * 100
      : 0
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

  const accountBreakdown = Object.values(accountMap).sort((a, b) => b.totalValueKRW - a.totalValueKRW)

  return {
    totals: {
      totalValueKRW,
      totalValueUSD,
      totalProfitKRW,
      profitPercent
    },
    allocation,
    assetsMap,
    performance: performance.sort((a, b) => b.profitKRW - a.profitKRW),
    accountBreakdown
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
