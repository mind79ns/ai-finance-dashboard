import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  Plus,
  Edit,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Building,
  CreditCard,
  PiggyBank,
  Check,
  X,
  Trash2
} from 'lucide-react'
import {
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts'
import dataSync from '../utils/dataSync'
import marketDataService from '../services/marketDataService'

const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

const DEFAULT_EXCHANGE_RATE = 1340
const normalizeAccountKey = (value) =>
  (value || '')
    .toString()
    .replace(/\s+/g, '')
    .toLowerCase()

const DEFAULT_INCOME_CATEGORIES = [
  { id: 'accumulated', name: '누적금액', color: '#6366f1', isAccumulated: true },
  { id: 'salary', name: '아르바이트', color: '#10b981' },
  { id: 'freelance', name: '월 급여', color: '#3b82f6' },
  { id: 'sideIncome', name: '주제외 급여', color: '#8b5cf6' },
  { id: 'dividend', name: '배당/상여금', color: '#ec4899' },
  { id: 'other', name: '재테크 수입', color: '#f59e0b' }
]

const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 'savings', name: '주택 담보대출', color: '#ef4444' },
  { id: 'insurance', name: '보험료 지출', color: '#f97316' },
  { id: 'living', name: '생활비용 대금', color: '#eab308' },
  { id: 'investment', name: '우리경영여금', color: '#06b6d4' },
  { id: 'loan', name: '월화 지출', color: '#8b5cf6' },
  { id: 'card', name: '카드 지출', color: '#ec4899' },
  { id: 'vnd', name: 'VND 지출', color: '#6366f1' }
]

const DEFAULT_ACCOUNT_TYPES = [
  { id: 'hana', name: '하나은행', icon: 'Building' },
  { id: 'shinhan', name: '신한은행', icon: 'Building' },
  { id: 'woori', name: '우리은행', icon: 'Building' },
  { id: 'kakao', name: '카카오뱅크', icon: 'Wallet' },
  { id: 'shinhanDebit', name: '신한 토스', icon: 'CreditCard' },
  { id: 'toss', name: '토스 투자', icon: 'TrendingUp' },
  { id: 'samsung', name: '삼성증권', icon: 'TrendingUp' },
  { id: 'korea', name: '한국투자증권', icon: 'TrendingUp' },
  { id: 'mirae', name: '미래에셋', icon: 'TrendingUp' },
  { id: 'samsung2', name: '삼성생명보험', icon: 'PiggyBank' },
  { id: 'union', name: '오리경영보험', icon: 'PiggyBank' },
  { id: 'gold', name: '골드', icon: 'DollarSign' }
]

const PORTFOLIO_ACCOUNT_GROUPS = {
  '미래에셋': [
    '미래에셋_종합_해외',
    '미래에셋_ISA(중개형)',
    '미래에셋_종합국내',
    '미래에셋_연금저축계좌(신)'
  ]
}

const mapPortfolioAccountName = (name) => {
  if (!name) return '기본계좌'
  const normalized = normalizeAccountKey(name)
  for (const [canonical, aliases] of Object.entries(PORTFOLIO_ACCOUNT_GROUPS)) {
    if (aliases.some(alias => normalizeAccountKey(alias) === normalized)) {
      return canonical
    }
  }
  return name
}

const ASSET_CATEGORIES = [
  { id: 'bank', name: '은행계좌' },
  { id: 'usd', name: 'USD계좌' },
  { id: 'pension', name: '연금저축' },
  { id: 'investment', name: '투자전환' },
  { id: 'installment', name: '적금' },
  { id: 'deposit', name: '예금' }
]

const getIconComponent = (iconName) => {
  const iconMap = {
    Building,
    Wallet,
    CreditCard,
    TrendingUp,
    PiggyBank,
    DollarSign
  }
  return iconMap[iconName] || Building
}

const AssetStatus = () => {
  // State
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [statusData, setStatusData] = useState({}) // { year: { month: { category: value } } }
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingMonth, setEditingMonth] = useState(null)
  const [editingYear, setEditingYear] = useState(null)
  const [showAddYearModal, setShowAddYearModal] = useState(false)
  const [accountData, setAccountData] = useState({}) // { year: { accountType: value } }
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [selectedMonthView, setSelectedMonthView] = useState(new Date().getMonth()) // 0-11 for Jan-Dec

  // Default categories
  const [incomeCategories, setIncomeCategories] = useState(() => DEFAULT_INCOME_CATEGORIES.map(cat => ({ ...cat })))
  const [expenseCategories, setExpenseCategories] = useState(() => DEFAULT_EXPENSE_CATEGORIES.map(cat => ({ ...cat })))

  // Default account types for breakdown
  // Account types from localStorage or defaults
  const [accountTypes, setAccountTypes] = useState(() => DEFAULT_ACCOUNT_TYPES.map(acc => ({ ...acc })))
  const [portfolioMetrics, setPortfolioMetrics] = useState({})
  const [portfolioLinks, setPortfolioLinks] = useState({})

  // 입출금 이력 데이터 (연동용)
  const [transactionHistory, setTransactionHistory] = useState({ vnd: [], usd: [], krw: [] })

  // 환율 정보 (VND to KRW)
  const [vndToKrwRate, setVndToKrwRate] = useState(0.055) // Default rate

  const cloneDefaults = (defaults) => defaults.map(item => ({ ...item }))
  const ensureArrayWithFallback = (value, defaults) => {
    if (!Array.isArray(value) || value.length === 0) {
      return cloneDefaults(defaults)
    }
    return value.map(item => ({ ...item }))
  }
  const ensureIncomeCategoryStructure = (value) => {
    const categories = ensureArrayWithFallback(value, DEFAULT_INCOME_CATEGORIES)
    const hasAccumulated = categories.some(cat => cat.id === 'accumulated')
    if (!hasAccumulated) {
      const accumulated = DEFAULT_INCOME_CATEGORIES.find(cat => cat.id === 'accumulated')
      if (accumulated) {
        categories.unshift({ ...accumulated })
      }
    }
    return categories
  }

  const statusReadyRef = useRef(false)
  const accountReadyRef = useRef(false)
  const incomeReadyRef = useRef(false)
  const expenseReadyRef = useRef(false)
  const accountTypesReadyRef = useRef(false)
  const portfolioLinksReadyRef = useRef(false)
  const latestAssetsRef = useRef([])
  const latestPrincipalsRef = useRef({})
  const latestExchangeRateRef = useRef(DEFAULT_EXCHANGE_RATE)

  // Load data from storage/Supabase
  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      try {
        const [
          loadedStatus,
          loadedAccount,
          loadedIncome,
          loadedExpense,
          loadedAccountTypes,
          loadedPortfolioLinks,
          loadedTransactionHistory
        ] = await Promise.all([
          dataSync.loadUserSetting('asset_status_data', {}),
          dataSync.loadUserSetting('asset_account_data', {}),
          dataSync.loadUserSetting('asset_income_categories', DEFAULT_INCOME_CATEGORIES),
          dataSync.loadUserSetting('asset_expense_categories', DEFAULT_EXPENSE_CATEGORIES),
          dataSync.loadUserSetting('asset_account_types', DEFAULT_ACCOUNT_TYPES),
          dataSync.loadUserSetting('asset_portfolio_links', {}),
          dataSync.loadUserSetting('transaction_history_v2', { vnd: [], usd: [], krw: [] })
        ])

        if (cancelled) return

        setStatusData(loadedStatus && typeof loadedStatus === 'object' ? loadedStatus : {})
        setAccountData(loadedAccount && typeof loadedAccount === 'object' ? loadedAccount : {})
        setIncomeCategories(ensureIncomeCategoryStructure(loadedIncome))
        setExpenseCategories(ensureArrayWithFallback(loadedExpense, DEFAULT_EXPENSE_CATEGORIES))
        setAccountTypes(ensureArrayWithFallback(loadedAccountTypes, DEFAULT_ACCOUNT_TYPES))
        setPortfolioLinks(loadedPortfolioLinks && typeof loadedPortfolioLinks === 'object' ? loadedPortfolioLinks : {})
        setTransactionHistory(loadedTransactionHistory || { vnd: [], usd: [], krw: [] })

        statusReadyRef.current = true
        accountReadyRef.current = true
        incomeReadyRef.current = true
        expenseReadyRef.current = true
        accountTypesReadyRef.current = true
        portfolioLinksReadyRef.current = true
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load asset status data:', error)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [])

  // Load exchange rate for VND to KRW
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        // VND to KRW rate is approximately 0.055 (1 VND ≈ 0.055 KRW)
        // You can update this to fetch from an API if needed
        setVndToKrwRate(0.055)
      } catch (error) {
        console.error('Failed to fetch VND exchange rate:', error)
      }
    }

    fetchExchangeRate()
  }, [])

  useEffect(() => {
    let cancelled = false

    const computeMetrics = (assetsInput, principalsInput, exchangeRateInput) => {
      const metricsMap = {}
      const effectiveExchangeRate = Number(exchangeRateInput) || DEFAULT_EXCHANGE_RATE
      const ensureEntry = (accountName) => {
        const canonicalName = mapPortfolioAccountName(accountName)
        const key = canonicalName || '기본계좌'
        if (!metricsMap[key]) {
          metricsMap[key] = {
            accountName: key,
            normalizedName: normalizeAccountKey(key),
            principal: 0,
            remaining: 0,
            investmentAmount: 0,
            evaluationAmount: 0
          }
        }
        return metricsMap[key]
      }

      if (principalsInput && typeof principalsInput === 'object') {
        Object.entries(principalsInput).forEach(([accountName, principalData]) => {
          const entry = ensureEntry(accountName)
          const principalValue = Number(principalData?.principal)
          const remainingValue = Number(principalData?.remaining)

          if (Number.isFinite(principalValue)) {
            entry.principal += principalValue
          }

          if (Number.isFinite(remainingValue)) {
            entry.remaining += remainingValue
          }
        })
      }

      if (Array.isArray(assetsInput)) {
        assetsInput.forEach(asset => {
          const entry = ensureEntry(asset.account || '기본계좌')
          const quantity = Number(asset.quantity) || 0
          const avgPrice = Number(asset.avgPrice) || 0
          const currentPrice = Number(asset.currentPrice ?? asset.avgPrice) || 0
          const multiplier = asset.currency === 'USD' ? effectiveExchangeRate : 1
          entry.investmentAmount += quantity * avgPrice * multiplier
          entry.evaluationAmount += quantity * currentPrice * multiplier
        })
      }

      return metricsMap
    }

    const updateMetricsState = (assetsInput, principalsInput, exchangeRateInput) => {
      if (cancelled) return

      const assets = Array.isArray(assetsInput)
        ? assetsInput.map(asset => ({ ...asset }))
        : []

      const principals = principalsInput && typeof principalsInput === 'object'
        ? Object.fromEntries(Object.entries(principalsInput).map(([accountName, data]) => {
          return [accountName, { ...data }]
        }))
        : {}

      const numericExchangeRate = Number(exchangeRateInput)
      const fallbackRate = Number(latestExchangeRateRef.current)
      const exchangeRate = Number.isFinite(numericExchangeRate) && numericExchangeRate > 0
        ? numericExchangeRate
        : (Number.isFinite(fallbackRate) && fallbackRate > 0 ? fallbackRate : DEFAULT_EXCHANGE_RATE)

      latestAssetsRef.current = assets
      latestPrincipalsRef.current = principals
      latestExchangeRateRef.current = exchangeRate

      setPortfolioMetrics(computeMetrics(assets, principals, exchangeRate))
    }

    const fetchPortfolioMetrics = async () => {
      try {
        const [assets, principals, marketData] = await Promise.all([
          dataSync.loadPortfolioAssets(),
          dataSync.loadAccountPrincipals(),
          marketDataService.getAllMarketData().catch(() => null)
        ])

        if (cancelled) return

        const exchangeRate = Number(marketData?.currency?.usdKrw?.rate) || DEFAULT_EXCHANGE_RATE
        updateMetricsState(assets, principals, exchangeRate)
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load portfolio metrics:', error)
          latestAssetsRef.current = []
          latestPrincipalsRef.current = {}
          latestExchangeRateRef.current = DEFAULT_EXCHANGE_RATE
          setPortfolioMetrics({})
        }
      }
    }

    const handleStorageChange = (event) => {
      if (!event?.key) return
      if (['portfolio_assets', 'account_principals'].includes(event.key)) {
        fetchPortfolioMetrics()
      }
    }

    const handlePortfolioAssetsUpdated = (event) => {
      if (cancelled) return
      const updatedAssets = Array.isArray(event?.detail?.assets) ? event.detail.assets : null
      const detailExchangeRate = Number(event?.detail?.exchangeRate)

      if (updatedAssets) {
        const exchangeRate = Number.isFinite(detailExchangeRate) && detailExchangeRate > 0
          ? detailExchangeRate
          : latestExchangeRateRef.current
        updateMetricsState(updatedAssets, latestPrincipalsRef.current, exchangeRate)
      } else {
        fetchPortfolioMetrics()
      }
    }

    const handleAccountPrincipalsUpdated = (event) => {
      if (cancelled) return
      const { accountName, principalData, principals, allPrincipals } = event?.detail || {}
      const principalsPayload = principals || allPrincipals

      if (principalsPayload && typeof principalsPayload === 'object') {
        updateMetricsState(latestAssetsRef.current, principalsPayload, latestExchangeRateRef.current)
        return
      }

      if (accountName && principalData) {
        const updatedPrincipals = {
          ...latestPrincipalsRef.current,
          [accountName]: { ...principalData }
        }
        updateMetricsState(latestAssetsRef.current, updatedPrincipals, latestExchangeRateRef.current)
      } else {
        fetchPortfolioMetrics()
      }
    }

    fetchPortfolioMetrics()

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('portfolio_assets_updated', handlePortfolioAssetsUpdated)
    window.addEventListener('account_principals_updated', handleAccountPrincipalsUpdated)

    return () => {
      cancelled = true
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('portfolio_assets_updated', handlePortfolioAssetsUpdated)
      window.removeEventListener('account_principals_updated', handleAccountPrincipalsUpdated)
    }
  }, [])

  const getPortfolioMetricValue = useCallback((accountName, metricKey) => {
    if (!portfolioMetrics || !accountName || !metricKey) return null
    const directEntry = portfolioMetrics[accountName]
    if (directEntry) {
      return directEntry[metricKey]
    }
    const normalizedTarget = normalizeAccountKey(accountName)
    const fallbackEntry = Object.values(portfolioMetrics).find(
      entry => normalizeAccountKey(entry?.accountName) === normalizedTarget
    )
    return fallbackEntry ? fallbackEntry[metricKey] : null
  }, [portfolioMetrics])

  useEffect(() => {
    if (!portfolioLinks || Object.keys(portfolioLinks).length === 0) return
    if (!portfolioMetrics || Object.keys(portfolioMetrics).length === 0) return

    setAccountData(prev => {
      let hasChanges = false
      const updated = { ...prev }

      Object.entries(portfolioLinks).forEach(([yearKey, accountMap]) => {
        if (!accountMap || typeof accountMap !== 'object') return

        const prevYearData = updated[yearKey] ? { ...updated[yearKey] } : {}
        let yearChanged = false

        Object.entries(accountMap).forEach(([accountId, categoryMap]) => {
          if (!categoryMap || typeof categoryMap !== 'object') return

          const prevAccountData = prevYearData[accountId] ? { ...prevYearData[accountId] } : {}
          let accountChanged = false

          Object.entries(categoryMap).forEach(([categoryId, linkInfo]) => {
            if (!linkInfo) return
            const metricValue = getPortfolioMetricValue(linkInfo.portfolioAccount, linkInfo.metricKey)
            const numericValue = Number(metricValue)
            if (!Number.isFinite(numericValue)) return

            const roundedValue = Math.round(numericValue)
            if (prevAccountData[categoryId] !== roundedValue) {
              prevAccountData[categoryId] = roundedValue
              accountChanged = true
            }
          })

          if (accountChanged) {
            prevYearData[accountId] = prevAccountData
            yearChanged = true
          }
        })

        if (yearChanged) {
          updated[yearKey] = prevYearData
          hasChanges = true
        }
      })

      return hasChanges ? updated : prev
    })
  }, [portfolioLinks, portfolioMetrics, getPortfolioMetricValue])

  // Persist changes to Supabase/localStorage
  useEffect(() => {
    if (!statusReadyRef.current) return
    dataSync.saveUserSetting('asset_status_data', statusData)
  }, [statusData])

  useEffect(() => {
    if (!accountReadyRef.current) return
    dataSync.saveUserSetting('asset_account_data', accountData)
  }, [accountData])

  useEffect(() => {
    if (!incomeReadyRef.current) return
    dataSync.saveUserSetting('asset_income_categories', incomeCategories)
  }, [incomeCategories])

  useEffect(() => {
    if (!expenseReadyRef.current) return
    dataSync.saveUserSetting('asset_expense_categories', expenseCategories)
  }, [expenseCategories])

  useEffect(() => {
    if (!accountTypesReadyRef.current) return
    dataSync.saveUserSetting('asset_account_types', accountTypes)
  }, [accountTypes])

  useEffect(() => {
    if (!portfolioLinksReadyRef.current) return
    dataSync.saveUserSetting('asset_portfolio_links', portfolioLinks)
  }, [portfolioLinks])

  // Get available years
  const availableYears = useMemo(() => {
    const years = Object.keys(statusData).map(Number).sort((a, b) => b - a)
    if (years.length === 0) {
      return [new Date().getFullYear()]
    }
    return years
  }, [statusData])

  // 입출금 이력에서 월별 합계 계산 (VND는 KRW로 환산)
  const getTransactionMonthlyTotal = useCallback((year, month, currency) => {
    const transactions = transactionHistory[currency.toLowerCase()] || []
    const total = transactions
      .filter(tx => {
        const txDate = new Date(tx.date)
        return txDate.getFullYear() === year && (txDate.getMonth() + 1) === month
      })
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)

    // VND는 KRW로 환산하여 반환
    if (currency.toLowerCase() === 'vnd') {
      return total * vndToKrwRate
    }

    return total
  }, [transactionHistory, vndToKrwRate])

  // Calculate monthly totals
  const calculateMonthlyData = useMemo(() => {
    const yearData = statusData[selectedYear] || {}
    const monthlyData = []
    let accumulatedAmount = 0 // Running accumulated amount

    for (let i = 0; i < 12; i++) {
      const monthKey = i + 1
      let monthData = { ...yearData[monthKey] } || {}

      // 입출금 이력 연동: KRW 지출 자동 반영
      const krwTotal = getTransactionMonthlyTotal(selectedYear, monthKey, 'krw')
      if (krwTotal > 0) {
        monthData['loan'] = krwTotal // 'loan' = 월화 지출
      }

      // 입출금 이력 연동: VND 지출 자동 반영
      const vndTotal = getTransactionMonthlyTotal(selectedYear, monthKey, 'vnd')
      if (vndTotal > 0) {
        monthData['vnd'] = vndTotal // 'vnd' = VND 지출
      }

      // Calculate income total (exclude accumulated amount)
      const incomeTotal = incomeCategories.reduce((sum, cat) => {
        if (cat.isAccumulated) return sum // Exclude accumulated from income total
        return sum + (monthData[cat.id] || 0)
      }, 0)

      // Calculate expense total
      const expenseTotal = expenseCategories.reduce((sum, cat) => {
        return sum + (monthData[cat.id] || 0)
      }, 0)

      // Calculate net change for previous month
      const netChange = incomeTotal - expenseTotal

      // Update accumulated amount
      if (i === 0) {
        // January: Use manual input as starting balance (기초자산)
        accumulatedAmount = monthData['accumulated'] || 0
      } else {
        // Other months: previous accumulated + previous netChange
        const prevNetChange = monthlyData[i - 1].netChange
        const prevAccumulated = monthlyData[i - 1].accumulated
        accumulatedAmount = prevAccumulated + prevNetChange
      }

      monthlyData.push({
        month: MONTH_LABELS[i],
        monthIndex: i,
        income: incomeTotal, // This excludes accumulated amount
        expense: expenseTotal,
        netChange: netChange,
        accumulated: accumulatedAmount, // Auto-calculated (except January)
        ...monthData
      })
    }

    return monthlyData
  }, [statusData, selectedYear, incomeCategories, expenseCategories, getTransactionMonthlyTotal, transactionHistory])

  // Calculate cumulative data for chart
  const chartData = useMemo(() => {
    return calculateMonthlyData.map((data) => {
      return {
        month: data.month,
        income: data.income,
        expense: data.expense,
        netChange: data.netChange,
        accumulated: data.accumulated // Use the accumulated amount from calculateMonthlyData
      }
    })
  }, [calculateMonthlyData])

  // Calculate yearly totals
  const yearlyTotals = useMemo(() => {
    const totals = {
      income: {},
      expense: {},
      incomeTotal: 0,
      expenseTotal: 0,
      accumulatedTotal: 0
    }

    // Income totals (exclude accumulated from incomeTotal)
    incomeCategories.forEach(cat => {
      if (cat.id === 'accumulated') {
        // Get accumulated total from last month's accumulated value
        const lastMonth = calculateMonthlyData[11]
        totals.accumulatedTotal = lastMonth?.accumulated || 0
        totals.income[cat.id] = totals.accumulatedTotal
      } else {
        const total = calculateMonthlyData.reduce((sum, month) => sum + (month[cat.id] || 0), 0)
        totals.income[cat.id] = total
        totals.incomeTotal += total // Only add non-accumulated income
      }
    })

    // Expense totals
    expenseCategories.forEach(cat => {
      const total = calculateMonthlyData.reduce((sum, month) => sum + (month[cat.id] || 0), 0)
      totals.expense[cat.id] = total
      totals.expenseTotal += total
    })

    totals.netTotal = totals.incomeTotal - totals.expenseTotal

    return totals
  }, [calculateMonthlyData, incomeCategories, expenseCategories])

  // Calculate account percentages with category breakdown
  const accountBreakdown = useMemo(() => {
    const yearAccounts = accountData[selectedYear] || {}

    return accountTypes.map(acc => {
      const accountCategories = yearAccounts[acc.id] || {}

      // Calculate total for this account across all categories
      const total = ASSET_CATEGORIES.reduce((sum, cat) => {
        return sum + (accountCategories[cat.id] || 0)
      }, 0)

      return {
        ...acc,
        categories: accountCategories,
        total: total
      }
    })
  }, [accountData, selectedYear, accountTypes])

  // Calculate category totals and grand total
  const categoryTotals = useMemo(() => {
    const totals = {}
    let grandTotal = 0

    ASSET_CATEGORIES.forEach(cat => {
      const categoryTotal = accountBreakdown.reduce((sum, acc) => {
        return sum + (acc.categories[cat.id] || 0)
      }, 0)
      totals[cat.id] = categoryTotal
      grandTotal += categoryTotal
    })

    return { ...totals, grandTotal }
  }, [accountBreakdown])

  const totalAccountValue = useMemo(() => {
    return categoryTotals.grandTotal
  }, [categoryTotals])

  // Handlers
  const handleOpenEditModal = (monthIndex) => {
    setEditingMonth(monthIndex)
    setEditingYear(selectedYear)
    setShowEditModal(true)
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setEditingMonth(null)
    setEditingYear(null)
  }

  const handleSaveMonthData = (monthIndex, categoryId, value) => {
    setStatusData(prev => {
      const updated = { ...prev }
      if (!updated[selectedYear]) {
        updated[selectedYear] = {}
      }
      if (!updated[selectedYear][monthIndex + 1]) {
        updated[selectedYear][monthIndex + 1] = {}
      }
      updated[selectedYear][monthIndex + 1][categoryId] = parseFloat(value) || 0
      return updated
    })
  }

  const handleSaveAccountData = (accountId, categoryId, value) => {
    setAccountData(prev => {
      const updated = { ...prev }
      if (!updated[selectedYear]) {
        updated[selectedYear] = {}
      }
      if (!updated[selectedYear][accountId]) {
        updated[selectedYear][accountId] = {}
      }
      updated[selectedYear][accountId][categoryId] = parseFloat(value) || 0
      return updated
    })
  }

  // 신규 연도 추가 핸들러
  const handleAddYear = (year) => {
    if (!availableYears.includes(year)) {
      setStatusData(prev => ({ ...prev, [year]: {} }))
      setAccountData(prev => ({ ...prev, [year]: {} }))
    }
    setSelectedYear(year)
    setShowAddYearModal(false)
  }

  const handleLinkPortfolioValue = useCallback((year, accountId, categoryId, linkInfo) => {
    if (!year || !accountId || !categoryId || !linkInfo) return

    setPortfolioLinks(prev => {
      const yearKey = String(year)
      const nextLink = {
        portfolioAccount: linkInfo.portfolioAccount,
        metricKey: linkInfo.metricKey,
        metricLabel: linkInfo.metricLabel
      }

      if (!nextLink.portfolioAccount || !nextLink.metricKey) {
        return prev
      }

      const existingYearLinks = prev[yearKey]
      const updatedYearLinks = existingYearLinks ? { ...existingYearLinks } : {}
      const existingAccountLinks = updatedYearLinks[accountId]
      const updatedAccountLinks = existingAccountLinks ? { ...existingAccountLinks } : {}

      const currentLink = existingAccountLinks?.[categoryId]
      if (
        currentLink &&
        currentLink.portfolioAccount === nextLink.portfolioAccount &&
        currentLink.metricKey === nextLink.metricKey &&
        currentLink.metricLabel === nextLink.metricLabel
      ) {
        return prev
      }

      updatedAccountLinks[categoryId] = nextLink
      updatedYearLinks[accountId] = updatedAccountLinks

      return {
        ...prev,
        [yearKey]: updatedYearLinks
      }
    })
  }, [])

  const handleUnlinkPortfolioValue = useCallback((year, accountId, categoryId) => {
    if (!year || !accountId || !categoryId) return

    setPortfolioLinks(prev => {
      const yearKey = String(year)
      const existingYearLinks = prev[yearKey]
      if (!existingYearLinks) return prev

      const existingAccountLinks = existingYearLinks[accountId]
      if (!existingAccountLinks || !existingAccountLinks[categoryId]) {
        return prev
      }

      const updatedAccountLinks = { ...existingAccountLinks }
      delete updatedAccountLinks[categoryId]

      const updatedYearLinks = { ...existingYearLinks }
      if (Object.keys(updatedAccountLinks).length > 0) {
        updatedYearLinks[accountId] = updatedAccountLinks
      } else {
        delete updatedYearLinks[accountId]
      }

      const nextLinks = { ...prev }
      if (Object.keys(updatedYearLinks).length > 0) {
        nextLinks[yearKey] = updatedYearLinks
      } else {
        delete nextLinks[yearKey]
      }

      return nextLinks
    })
  }, [])

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '-'
    return new Intl.NumberFormat('ko-KR').format(Math.round(value))
  }

  // Category name editing handlers
  const handleStartEditCategory = (categoryId, currentName) => {
    setEditingCategoryId(categoryId)
    setEditingCategoryName(currentName)
  }

  const handleSaveCategoryName = (isIncome) => {
    if (!editingCategoryName.trim()) {
      setEditingCategoryId(null)
      return
    }

    if (isIncome) {
      setIncomeCategories(prev =>
        prev.map(cat =>
          cat.id === editingCategoryId
            ? { ...cat, name: editingCategoryName.trim() }
            : cat
        )
      )
    } else {
      setExpenseCategories(prev =>
        prev.map(cat =>
          cat.id === editingCategoryId
            ? { ...cat, name: editingCategoryName.trim() }
            : cat
        )
      )
    }

    setEditingCategoryId(null)
    setEditingCategoryName('')
  }

  const handleCancelEditCategory = () => {
    setEditingCategoryId(null)
    setEditingCategoryName('')
  }

  // Add/Delete category handlers
  const handleAddIncomeCategory = () => {
    const newId = `income_${Date.now()}`
    setIncomeCategories(prev => [
      ...prev,
      { id: newId, name: '새 수입 항목', color: '#10b981' }
    ])
  }

  const handleAddExpenseCategory = () => {
    const newId = `expense_${Date.now()}`
    setExpenseCategories(prev => [
      ...prev,
      { id: newId, name: '새 지출 항목', color: '#ef4444' }
    ])
  }

  const handleDeleteCategory = (categoryId, isIncome) => {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return

    if (isIncome) {
      setIncomeCategories(prev => prev.filter(cat => cat.id !== categoryId))
    } else {
      setExpenseCategories(prev => prev.filter(cat => cat.id !== categoryId))
    }
  }

  // Add/Delete account handlers
  const handleAddAccount = () => {
    const newId = `account_${Date.now()}`
    setAccountTypes(prev => [
      ...prev,
      { id: newId, name: '새 계좌', icon: 'Building' }
    ])
  }

  const handleDeleteAccount = (accountId) => {
    if (!confirm('이 계좌를 삭제하시겠습니까?')) return
    setAccountTypes(prev => prev.filter(acc => acc.id !== accountId))
  }

  const handleSaveAccountName = () => {
    if (!editingCategoryName.trim()) {
      setEditingCategoryId(null)
      return
    }

    setAccountTypes(prev =>
      prev.map(acc =>
        acc.id === editingCategoryId
          ? { ...acc, name: editingCategoryName.trim() }
          : acc
      )
    )

    setEditingCategoryId(null)
    setEditingCategoryName('')
  }

  return (
    <div className="cyber-dashboard min-h-screen p-4 sm:p-6 relative">
      {/* Header with year filter - Cyberpunk Style */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold neon-text-cyan">자산 현황</h1>
          <p className="text-cyan-300/60 mt-1">월별 수입/지출 및 계좌별 자산 현황</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 bg-slate-800/50 border border-cyan-400/30 text-cyan-300 rounded-lg focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowAddYearModal(true)}
            className="cyber-btn flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            신규 연도 추가
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">연간 총 수입</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(yearlyTotals.incomeTotal)}</p>
              <p className="text-green-100 text-xs mt-1">KRW</p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-200 opacity-80" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">연간 총 지출</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(yearlyTotals.expenseTotal)}</p>
              <p className="text-red-100 text-xs mt-1">KRW</p>
            </div>
            <TrendingDown className="w-12 h-12 text-red-200 opacity-80" />
          </div>
        </div>

        <div className={`card bg-gradient-to-br ${yearlyTotals.netTotal >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600'} text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`${yearlyTotals.netTotal >= 0 ? 'text-blue-100' : 'text-orange-100'} text-sm font-medium`}>연간 순변동</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(yearlyTotals.netTotal)}</p>
              <p className={`${yearlyTotals.netTotal >= 0 ? 'text-blue-100' : 'text-orange-100'} text-xs mt-1`}>KRW</p>
            </div>
            <DollarSign className={`w-12 h-12 ${yearlyTotals.netTotal >= 0 ? 'text-blue-200' : 'text-orange-200'} opacity-80`} />
          </div>
        </div>
      </div>

      {/* Monthly Detail View */}
      <div className="space-y-4">
        {/* Month Selector */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-cyan-400">월별 상세 현황</h2>
          <select
            value={selectedMonthView}
            onChange={(e) => setSelectedMonthView(Number(e.target.value))}
            className="px-4 py-2 bg-slate-800/50 border border-cyan-400/30 rounded-lg focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent text-cyan-300 font-medium"
          >
            {MONTH_LABELS.map((month, idx) => (
              <option key={idx} value={idx}>{month}</option>
            ))}
          </select>
        </div>

        {/* Monthly Visual Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Income Breakdown Card */}
          <div className="card bg-gradient-to-br from-slate-800 to-slate-900 text-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                수입 현황
              </h3>
              <span className="text-lg font-bold">
                {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(calculateMonthlyData[selectedMonthView]?.income || 0))}
              </span>
            </div>
            <div className="space-y-2">
              {incomeCategories
                .filter(cat => !cat.isAccumulated)
                .slice(0, 5)
                .map(category => {
                  const value = calculateMonthlyData[selectedMonthView]?.[category.id] || 0
                  const maxIncome = Math.max(...incomeCategories.filter(c => !c.isAccumulated).map(c => calculateMonthlyData[selectedMonthView]?.[c.id] || 0))
                  const percentage = maxIncome > 0 ? (value / maxIncome) * 100 : 0

                  return (
                    <div key={category.id} className="space-y-0.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-300 truncate">{category.name}</span>
                        <span className="font-semibold ml-1">{new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(value || 0))}</span>
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Expense Breakdown Card */}
          <div className="card bg-gradient-to-br from-slate-800 to-slate-900 text-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold flex items-center gap-1">
                <TrendingDown className="w-4 h-4" />
                지출 현황
              </h3>
              <span className="text-lg font-bold">
                {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(calculateMonthlyData[selectedMonthView]?.expense || 0))}
              </span>
            </div>
            <div className="space-y-2">
              {expenseCategories.map(category => {
                const value = calculateMonthlyData[selectedMonthView]?.[category.id] || 0
                const maxExpense = Math.max(...expenseCategories.map(c => calculateMonthlyData[selectedMonthView]?.[c.id] || 0))
                const percentage = maxExpense > 0 ? (value / maxExpense) * 100 : 0

                return (
                  <div key={category.id} className="space-y-0.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-300 truncate">{category.name}</span>
                      <span className="font-semibold ml-1">{new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(value || 0))}</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Combined Summary Card */}
          <div className="card bg-gradient-to-br from-slate-800 to-slate-900 text-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">종합 현황</h3>
              <span className="text-lg font-bold">
                {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(calculateMonthlyData[selectedMonthView]?.netChange || 0))}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {/* Income Bar */}
              <div className="space-y-1">
                <div className="text-center">
                  <span className="text-xs text-blue-300">수입</span>
                </div>
                <div className="relative h-32 bg-slate-700 rounded-lg overflow-hidden">
                  <div
                    className="absolute bottom-0 w-full bg-gradient-to-t from-blue-500 to-blue-400 transition-all duration-500 flex items-end justify-center pb-1"
                    style={{
                      height: `${Math.min((calculateMonthlyData[selectedMonthView]?.income || 0) / Math.max(calculateMonthlyData[selectedMonthView]?.income || 1, calculateMonthlyData[selectedMonthView]?.expense || 1, Math.abs(calculateMonthlyData[selectedMonthView]?.netChange || 1)) * 100, 100)}%`
                    }}
                  >
                    <span className="text-[10px] font-bold text-white">
                      {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(calculateMonthlyData[selectedMonthView]?.income || 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expense Bar */}
              <div className="space-y-1">
                <div className="text-center">
                  <span className="text-xs text-red-300">지출</span>
                </div>
                <div className="relative h-32 bg-slate-700 rounded-lg overflow-hidden">
                  <div
                    className="absolute bottom-0 w-full bg-gradient-to-t from-red-500 to-red-400 transition-all duration-500 flex items-end justify-center pb-1"
                    style={{
                      height: `${Math.min((calculateMonthlyData[selectedMonthView]?.expense || 0) / Math.max(calculateMonthlyData[selectedMonthView]?.income || 1, calculateMonthlyData[selectedMonthView]?.expense || 1, Math.abs(calculateMonthlyData[selectedMonthView]?.netChange || 1)) * 100, 100)}%`
                    }}
                  >
                    <span className="text-[10px] font-bold text-white">
                      {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(calculateMonthlyData[selectedMonthView]?.expense || 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Net Change Bar (월총합) */}
              <div className="space-y-1">
                <div className="text-center">
                  <span className="text-xs text-green-300">월총합</span>
                </div>
                <div className="relative h-32 bg-slate-700 rounded-lg overflow-hidden">
                  <div
                    className={`absolute bottom-0 w-full transition-all duration-500 flex items-end justify-center pb-1 ${(calculateMonthlyData[selectedMonthView]?.netChange || 0) >= 0
                      ? 'bg-gradient-to-t from-green-500 to-green-400'
                      : 'bg-gradient-to-t from-orange-500 to-orange-400'
                      }`}
                    style={{
                      height: `${Math.min(Math.abs(calculateMonthlyData[selectedMonthView]?.netChange || 0) / Math.max(calculateMonthlyData[selectedMonthView]?.income || 1, calculateMonthlyData[selectedMonthView]?.expense || 1, Math.abs(calculateMonthlyData[selectedMonthView]?.netChange || 1)) * 100, 100)}%`
                    }}
                  >
                    <span className="text-[10px] font-bold text-white">
                      {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(calculateMonthlyData[selectedMonthView]?.netChange || 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Income/Expense Table */}
      <div className="card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">월별 수입/지출 현황표</h2>
          <div className="flex gap-2">
            <button
              onClick={handleAddIncomeCategory}
              className="btn-secondary flex items-center gap-2 text-xs sm:text-sm"
              title="수입 항목 추가"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">수입 추가</span>
              <span className="sm:hidden">수입</span>
            </button>
            <button
              onClick={handleAddExpenseCategory}
              className="btn-secondary flex items-center gap-2 text-xs sm:text-sm"
              title="지출 항목 추가"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">지출 추가</span>
              <span className="sm:hidden">지출</span>
            </button>
          </div>
        </div>

        {/* Mobile Notice */}
        <div className="block sm:hidden p-6 bg-blue-50 border-l-4 border-blue-500">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">모바일 최적화 안내</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                월별 수입/지출 현황표는 데이터양이 많아 PC에서 보시는 것을 권장합니다.
                모바일에서는 위의 <strong>"월별 상세 현황"</strong> 섹션에서 월을 선택하여
                해당 월의 수입/지출 내역을 확인하실 수 있습니다.
              </p>
              <button
                onClick={() => {
                  const monthViewSection = document.querySelector('[class*="space-y-4"]')
                  if (monthViewSection) {
                    monthViewSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                }}
                className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-800 underline"
              >
                월별 상세 현황으로 이동 →
              </button>
            </div>
          </div>
        </div>

        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-100 border-b border-blue-200">
                <th className="text-left py-3 px-4 font-bold text-blue-900 sticky left-0 bg-blue-100 z-10">항목</th>
                {MONTH_LABELS.map((month, idx) => (
                  <th key={idx} className="text-center py-3 px-4 font-bold text-blue-900 min-w-[120px]">
                    {month}
                  </th>
                ))}
                <th className="text-center py-3 px-4 font-bold text-blue-900 bg-blue-200 min-w-[140px]">TOTAL</th>
              </tr>
            </thead>

            <tbody>
              {/* Income Categories */}
              {incomeCategories.map((category) => (
                <tr key={category.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900 sticky left-0 bg-white z-10">
                    {editingCategoryId === category.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveCategoryName(true)
                            if (e.key === 'Escape') handleCancelEditCategory()
                          }}
                          className="flex-1 px-2 py-1 border border-primary-500 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveCategoryName(true)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="저장"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEditCategory}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="취소"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <span className={category.isAccumulated ? 'text-indigo-700 font-semibold' : ''}>
                          {category.name}
                          {category.isAccumulated && (
                            <span className="text-xs ml-2 text-indigo-500">(자동계산)</span>
                          )}
                        </span>
                        {!category.isAccumulated && (
                          <>
                            <button
                              onClick={() => handleStartEditCategory(category.id, category.name)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-opacity"
                              title="이름 수정"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category.id, true)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-opacity"
                              title="삭제"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                  {calculateMonthlyData.map((monthData, idx) => {
                    // January can be edited for accumulated (기초자산), others auto-calculated
                    const isJanuary = idx === 0
                    const isAccumulatedEditable = category.isAccumulated && isJanuary
                    const isEditable = !category.isAccumulated || isAccumulatedEditable

                    return (
                      <td
                        key={idx}
                        className={`text-right py-3 px-4 ${category.isAccumulated
                          ? isJanuary
                            ? 'bg-yellow-50 font-semibold text-yellow-800 cursor-pointer hover:bg-yellow-100'
                            : 'bg-indigo-50 font-semibold text-indigo-700'
                          : 'text-gray-700 cursor-pointer hover:bg-blue-50'
                          }`}
                        onClick={() => isEditable && handleOpenEditModal(idx)}
                        title={
                          category.isAccumulated
                            ? isJanuary
                              ? '기초자산 누적금액 (수동 입력 가능)'
                              : '자동 계산됨 (전월 누적금액 + 전월 월지출총합)'
                            : ''
                        }
                      >
                        {formatCurrency(category.isAccumulated ? monthData.accumulated : monthData[category.id])}
                      </td>
                    )
                  })}
                  <td className="text-right py-3 px-4 font-bold text-gray-900 bg-blue-50">
                    {formatCurrency(yearlyTotals.income[category.id])}
                  </td>
                </tr>
              ))}

              {/* Income Total Row */}
              <tr className="bg-blue-50 border-b-2 border-blue-300 font-bold">
                <td className="py-3 px-4 text-blue-900 sticky left-0 bg-blue-50 z-10">수입 TOTAL</td>
                {calculateMonthlyData.map((monthData, idx) => (
                  <td key={idx} className="text-right py-3 px-4 text-blue-900">
                    {formatCurrency(monthData.income)}
                  </td>
                ))}
                <td className="text-right py-3 px-4 text-blue-900 bg-blue-100">
                  {formatCurrency(yearlyTotals.incomeTotal)}
                </td>
              </tr>

              {/* Expense Categories */}
              {expenseCategories.map((category) => (
                <tr key={category.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900 sticky left-0 bg-white z-10">
                    {editingCategoryId === category.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveCategoryName(false)
                            if (e.key === 'Escape') handleCancelEditCategory()
                          }}
                          className="flex-1 px-2 py-1 border border-primary-500 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveCategoryName(false)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="저장"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEditCategory}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="취소"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <span>{category.name}</span>
                        <button
                          onClick={() => handleStartEditCategory(category.id, category.name)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-opacity"
                          title="이름 수정"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id, false)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-opacity"
                          title="삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </td>
                  {calculateMonthlyData.map((monthData, idx) => (
                    <td
                      key={idx}
                      className="text-right py-3 px-4 text-gray-700 cursor-pointer hover:bg-red-50"
                      onClick={() => handleOpenEditModal(idx)}
                    >
                      {formatCurrency(monthData[category.id])}
                    </td>
                  ))}
                  <td className="text-right py-3 px-4 font-bold text-gray-900 bg-red-50">
                    {formatCurrency(yearlyTotals.expense[category.id])}
                  </td>
                </tr>
              ))}

              {/* Expense Total Row */}
              <tr className="bg-red-50 border-b-2 border-red-300 font-bold">
                <td className="py-3 px-4 text-red-900 sticky left-0 bg-red-50 z-10">지출 TOTAL</td>
                {calculateMonthlyData.map((monthData, idx) => (
                  <td key={idx} className="text-right py-3 px-4 text-red-900">
                    {formatCurrency(monthData.expense)}
                  </td>
                ))}
                <td className="text-right py-3 px-4 text-red-900 bg-red-100">
                  {formatCurrency(yearlyTotals.expenseTotal)}
                </td>
              </tr>

              {/* Net Change Row */}
              <tr className="bg-gray-100 border-b-2 border-gray-400 font-bold text-lg">
                <td className="py-3 px-4 text-gray-900 sticky left-0 bg-gray-100 z-10">월 지출 총합</td>
                {calculateMonthlyData.map((monthData, idx) => (
                  <td
                    key={idx}
                    className={`text-right py-3 px-4 ${monthData.netChange >= 0 ? 'text-green-700' : 'text-red-700'}`}
                  >
                    {formatCurrency(monthData.netChange)}
                  </td>
                ))}
                <td className={`text-right py-3 px-4 bg-gray-200 ${yearlyTotals.netTotal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(yearlyTotals.netTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Trend Charts */}
      <div className="grid grid-cols-1 gap-6">
        {/* Income/Expense Trend Chart */}
        <div className="card">
          <h3 className="text-xl font-bold text-gray-900 mb-2">월별 수입/지출 추이 및 누적금액</h3>
          <p className="text-sm text-gray-600 mb-6">매월 수입과 지출 흐름 및 누적 자산을 한눈에 확인하세요</p>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="#6b7280"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#d1d5db' }}
              />
              <YAxis
                yAxisId="left"
                stroke="#6b7280"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={{ stroke: '#d1d5db' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#6366f1"
                tick={{ fill: '#6366f1', fontSize: 11 }}
                axisLine={{ stroke: '#818cf8' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                domain={[2000000, 'dataMax']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value) => formatCurrency(value) + ' KRW'}
                labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
              <Bar
                yAxisId="left"
                dataKey="income"
                fill="url(#incomeGradient)"
                stroke="#10b981"
                strokeWidth={2}
                name="월 수입"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                yAxisId="left"
                dataKey="expense"
                fill="url(#expenseGradient)"
                stroke="#ef4444"
                strokeWidth={2}
                name="월 지출"
                radius={[8, 8, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="accumulated"
                stroke="#6366f1"
                strokeWidth={3}
                dot={{ fill: '#6366f1', r: 5, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 7, strokeWidth: 2 }}
                name="누적금액"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Accumulated Asset Trend Chart */}
        <div className="card bg-gradient-to-br from-indigo-50 to-purple-50">
          <h3 className="text-xl font-bold text-gray-900 mb-2">누적 자산 추이</h3>
          <p className="text-sm text-gray-600 mb-6">월별 순변동과 누적 자산 가치를 별도 축으로 표시</p>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="accumulatedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="#6b7280"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#c7d2fe' }}
              />
              <YAxis
                yAxisId="left"
                stroke="#6b7280"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={{ stroke: '#c7d2fe' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                label={{ value: '월 순변동', angle: -90, position: 'insideLeft', style: { fill: '#6b7280' } }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#6366f1"
                tick={{ fill: '#6366f1', fontSize: 11 }}
                axisLine={{ stroke: '#818cf8' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                domain={[2000000, 'dataMax']}
                label={{ value: '누적 자산', angle: 90, position: 'insideRight', style: { fill: '#6366f1' } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '2px solid #818cf8',
                  borderRadius: '12px',
                  boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.2)'
                }}
                formatter={(value) => formatCurrency(value) + ' KRW'}
                labelStyle={{ fontWeight: 'bold', color: '#4f46e5', marginBottom: '8px' }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
              <Bar
                yAxisId="left"
                dataKey="netChange"
                fill={(entry) => entry.netChange >= 0 ? '#10b981' : '#ef4444'}
                name="월 순변동 (수입-지출)"
                radius={[8, 8, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="accumulated"
                stroke="#6366f1"
                strokeWidth={4}
                dot={{ fill: '#6366f1', r: 6, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 8, strokeWidth: 2 }}
                name="누적 자산"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Account Breakdown Table */}
      <div className="card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">계좌별 자산 현황</h2>
          <div className="flex gap-2">
            <button
              onClick={handleAddAccount}
              className="btn-secondary flex items-center gap-2 text-xs sm:text-sm"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">계좌 추가</span>
              <span className="sm:hidden">계좌</span>
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              className="btn-secondary flex items-center gap-2 text-xs sm:text-sm"
            >
              <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">금액 수정</span>
              <span className="sm:hidden">수정</span>
            </button>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="block sm:hidden p-4 space-y-3">
          {accountBreakdown.map((account) => {
            const Icon = getIconComponent(account.icon)
            const percentage = totalAccountValue > 0 ? (account.total / totalAccountValue * 100) : 0

            return (
              <div key={account.id} className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-md transition-shadow">
                {/* Account Header */}
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    <span className="text-sm font-bold text-gray-900 truncate">{account.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-1 rounded">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="space-y-2 text-xs">
                  {ASSET_CATEGORIES.map(cat => {
                    const value = account.categories[cat.id] || 0
                    if (value === 0) return null
                    return (
                      <div key={cat.id} className="flex justify-between items-center">
                        <span className="text-gray-600">{cat.name}</span>
                        <span className="font-medium text-gray-900">{formatCurrency(value)}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Total */}
                <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200">
                  <span className="text-xs font-semibold text-gray-700">합계</span>
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(account.total)}</span>
                </div>
              </div>
            )
          })}

          {/* Total Summary Card */}
          <div className="border-2 border-blue-300 rounded-lg p-3 bg-blue-50">
            <p className="text-sm font-bold text-blue-900 mb-2 text-center">전체 자산 합계</p>
            <div className="space-y-2 text-xs">
              {ASSET_CATEGORIES.map(cat => {
                const value = categoryTotals[cat.id] || 0
                if (value === 0) return null
                const catPercentage = totalAccountValue > 0 ? ((value) / totalAccountValue * 100) : 0
                return (
                  <div key={cat.id} className="flex justify-between items-center">
                    <span className="text-blue-700 font-medium">{cat.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-900">{formatCurrency(value)}</span>
                      <span className="text-blue-600 text-[10px] font-semibold bg-blue-100 px-1.5 py-0.5 rounded">
                        {catPercentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                )
              })}
              <div className="flex justify-between items-center pt-2 mt-2 border-t border-blue-300">
                <span className="text-blue-800 font-bold">TOTAL</span>
                <span className="text-base font-bold text-blue-900">{formatCurrency(totalAccountValue)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-100 border-b border-blue-200">
                <th className="text-left py-3 px-4 font-bold text-blue-900">항목</th>
                {ASSET_CATEGORIES.map(cat => (
                  <th key={cat.id} className="text-right py-3 px-4 font-bold text-blue-900 min-w-[100px]">
                    {cat.name}
                  </th>
                ))}
                <th className="text-right py-3 px-4 font-bold text-blue-900 bg-blue-200">TOTAL</th>
                <th className="text-center py-3 px-4 font-bold text-blue-900 bg-blue-200">점유율</th>
              </tr>
            </thead>

            <tbody>
              {accountBreakdown.map((account) => {
                const Icon = getIconComponent(account.icon)
                const percentage = totalAccountValue > 0 ? (account.total / totalAccountValue * 100) : 0

                return (
                  <tr key={account.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {editingCategoryId === account.id ? (
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-600" />
                          <input
                            type="text"
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveAccountName()
                              if (e.key === 'Escape') handleCancelEditCategory()
                            }}
                            className="flex-1 px-2 py-1 border border-primary-500 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveAccountName}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="저장"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEditCategory}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="취소"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group">
                          <Icon className="w-4 h-4 text-gray-600" />
                          <span>{account.name}</span>
                          <button
                            onClick={() => handleStartEditCategory(account.id, account.name)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-opacity"
                            title="이름 수정"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(account.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-opacity"
                            title="삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                    {ASSET_CATEGORIES.map(cat => (
                      <td key={cat.id} className="text-right py-3 px-4 text-gray-700">
                        {formatCurrency(account.categories[cat.id] || 0)}
                      </td>
                    ))}
                    <td className="text-right py-3 px-4 font-bold text-gray-900 bg-blue-50">
                      {formatCurrency(account.total)}
                    </td>
                    <td className="text-center py-3 px-4 font-medium text-gray-900 bg-blue-50">
                      {percentage.toFixed(0)}%
                    </td>
                  </tr>
                )
              })}

              {/* Total Row */}
              <tr className="bg-blue-100 border-t-2 border-blue-300 font-bold">
                <td className="py-3 px-4 text-blue-900">TOTAL</td>
                {ASSET_CATEGORIES.map(cat => (
                  <td key={cat.id} className="text-right py-3 px-4 text-blue-900">
                    {formatCurrency(categoryTotals[cat.id] || 0)}
                  </td>
                ))}
                <td className="text-right py-3 px-4 text-blue-900 bg-blue-200">
                  {formatCurrency(totalAccountValue)}
                </td>
                <td className="text-center py-3 px-4 text-blue-900 bg-blue-200">100%</td>
              </tr>

              {/* Percentage Row */}
              <tr className="bg-blue-50 font-bold">
                <td className="py-3 px-4 text-blue-900">점유율</td>
                {ASSET_CATEGORIES.map(cat => {
                  const catPercentage = totalAccountValue > 0 ? ((categoryTotals[cat.id] || 0) / totalAccountValue * 100) : 0
                  return (
                    <td key={cat.id} className="text-center py-3 px-4 text-blue-900">
                      {catPercentage.toFixed(0)}%
                    </td>
                  )
                })}
                <td className="text-center py-3 px-4 text-blue-900 bg-blue-100" colSpan="2">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingMonth !== null && (
        <EditMonthModal
          year={editingYear}
          month={editingMonth}
          monthName={MONTH_LABELS[editingMonth]}
          monthData={calculateMonthlyData[editingMonth]}
          incomeCategories={incomeCategories}
          expenseCategories={expenseCategories}
          onSave={handleSaveMonthData}
          onClose={handleCloseEditModal}
        />
      )}

      {/* Account Edit Modal */}
      {showEditModal && editingMonth === null && (
        <EditAccountModal
          year={selectedYear}
          accountTypes={accountTypes}
          accountData={accountBreakdown}
          portfolioMetrics={portfolioMetrics}
          portfolioLinks={portfolioLinks[String(selectedYear)] || {}}
          onLink={handleLinkPortfolioValue}
          onUnlink={handleUnlinkPortfolioValue}
          onSave={handleSaveAccountData}
          onClose={handleCloseEditModal}
        />
      )}

      {/* Add Year Modal */}
      {showAddYearModal && (
        <AddYearModal
          availableYears={availableYears}
          onAdd={handleAddYear}
          onClose={() => setShowAddYearModal(false)}
        />
      )}
    </div>
  )
}

// Add Year Modal Component
const AddYearModal = ({ availableYears, onAdd, onClose }) => {
  const currentYear = new Date().getFullYear()
  // 현재 연도 기준 -2년 ~ +3년 범위 제공 (예: 2023~2028)
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i)
  const [selectedYear, setSelectedYear] = useState(currentYear + 1) // 기본값: 내년

  const handleSubmit = (e) => {
    e.preventDefault()
    onAdd(selectedYear)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        <div className="border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary-600" />
            신규 연도 추가
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            자산 현황을 관리할 연도를 선택하세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              연도 선택
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg font-medium"
            >
              {yearOptions.map(year => (
                <option
                  key={year}
                  value={year}
                  disabled={availableYears.includes(year)}
                >
                  {year}년 {availableYears.includes(year) ? '(이미 존재)' : ''}
                </option>
              ))}
            </select>
          </div>

          {availableYears.includes(selectedYear) ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ {selectedYear}년은 이미 존재합니다. 해당 연도로 이동합니다.
              </p>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                ✨ {selectedYear}년의 새로운 자산 현황 데이터가 생성됩니다.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button type="submit" className="btn-primary flex-1 py-3">
              {availableYears.includes(selectedYear) ? '이동하기' : '추가하기'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3">
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit Month Modal Component
const EditMonthModal = ({ year, month, monthName, monthData, incomeCategories, expenseCategories, onSave, onClose }) => {
  const [formData, setFormData] = useState({})

  useEffect(() => {
    const initial = {}
    incomeCategories.forEach(cat => {
      initial[cat.id] = monthData[cat.id] || 0
    })
    expenseCategories.forEach(cat => {
      initial[cat.id] = monthData[cat.id] || 0
    })
    setFormData(initial)
  }, [month, monthData, incomeCategories, expenseCategories])

  const handleChange = (categoryId, value) => {
    setFormData(prev => ({
      ...prev,
      [categoryId]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    Object.entries(formData).forEach(([categoryId, value]) => {
      onSave(month, categoryId, value)
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <h3 className="text-xl font-bold text-gray-900">
            {year}년 {monthName} 데이터 수정
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Income Section */}
          <div>
            <h4 className="font-bold text-green-700 mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              수입 항목
            </h4>
            <div className="space-y-3">
              {incomeCategories.map(cat => (
                <div key={cat.id} className="flex items-center gap-3">
                  <label className="w-40 text-sm font-medium text-gray-700">{cat.name}</label>
                  <input
                    type="number"
                    value={formData[cat.id] || ''}
                    onChange={(e) => handleChange(cat.id, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0"
                  />
                  <span className="text-sm text-gray-500 w-12">KRW</span>
                </div>
              ))}
            </div>
          </div>

          {/* Expense Section */}
          <div>
            <h4 className="font-bold text-red-700 mb-3 flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              지출 항목
            </h4>
            <div className="space-y-3">
              {expenseCategories.map(cat => {
                // 입출금 이력 연동 항목 확인
                const isLinked = (cat.id === 'loan' || cat.id === 'vnd')
                const linkedLabel = cat.id === 'loan' ? 'KRW' : (cat.id === 'vnd' ? 'VND' : '')

                return (
                  <div key={cat.id} className="flex items-center gap-3">
                    <label className="w-40 text-sm font-medium text-gray-700">
                      {cat.name}
                      {isLinked && (
                        <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded" title={`입출금 이력 ${linkedLabel}과 자동 연동`}>
                          🔗 자동
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      value={formData[cat.id] || ''}
                      onChange={(e) => handleChange(cat.id, e.target.value)}
                      className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${isLinked ? 'border-blue-300 bg-blue-50' : 'border-gray-300'}`}
                      placeholder="0"
                      readOnly={isLinked}
                      title={isLinked ? `입출금 이력 페이지의 ${linkedLabel} 거래 내역과 자동 연동됩니다` : ''}
                    />
                    <span className="text-sm text-gray-500 w-12">KRW</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button type="submit" className="btn-primary flex-1">
              저장
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit Account Modal Component
const EditAccountModal = ({ year, accountTypes, accountData, onSave, onClose, portfolioMetrics, portfolioLinks, onLink, onUnlink }) => {
  const [formData, setFormData] = useState({})
  const [activeMetricPicker, setActiveMetricPicker] = useState(null)
  const [selectedPortfolioAccount, setSelectedPortfolioAccount] = useState('')
  const [selectedPortfolioMetric, setSelectedPortfolioMetric] = useState('evaluationAmount')

  useEffect(() => {
    const initialMap = {}
    accountTypes.forEach(acc => {
      const existing = accountData.find(a => a.id === acc.id)
      initialMap[acc.id] = {}
      ASSET_CATEGORIES.forEach(cat => {
        initialMap[acc.id][cat.id] = existing?.categories?.[cat.id] || 0
      })
    })

    setFormData(prev => {
      const isInitialLoad = Object.keys(prev).length === 0

      if (isInitialLoad) {
        return initialMap
      }

      const merged = {}

      accountTypes.forEach(acc => {
        const prevAccount = prev[acc.id] || {}
        const initialAccount = initialMap[acc.id] || {}
        merged[acc.id] = { ...prevAccount }

        ASSET_CATEGORIES.forEach(cat => {
          const isLinked = !!portfolioLinks?.[acc.id]?.[cat.id]
          const hasPrevValue = Object.prototype.hasOwnProperty.call(prevAccount, cat.id)

          if (isLinked || !hasPrevValue) {
            merged[acc.id][cat.id] = initialAccount[cat.id] || 0
          }
        })
      })

      return merged
    })
  }, [accountData, accountTypes, portfolioLinks])

  const portfolioAccountOptions = useMemo(() => {
    if (!portfolioMetrics || typeof portfolioMetrics !== 'object') return []
    return Object.values(portfolioMetrics)
      .filter(entry => entry && entry.accountName)
      .map(entry => ({
        accountName: entry.accountName,
        label: entry.accountName,
        metrics: entry
      }))
  }, [portfolioMetrics])

  useEffect(() => {
    if (portfolioAccountOptions.length === 0) return
    if (!selectedPortfolioAccount) {
      setSelectedPortfolioAccount(portfolioAccountOptions[0].accountName)
      return
    }
    const exists = portfolioAccountOptions.some(opt => opt.accountName === selectedPortfolioAccount)
    if (!exists) {
      setSelectedPortfolioAccount(portfolioAccountOptions[0].accountName)
    }
  }, [portfolioAccountOptions, selectedPortfolioAccount])

  const handleChange = (accountId, categoryId, value) => {
    setFormData(prev => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        [categoryId]: value
      }
    }))

    if (portfolioLinks?.[accountId]?.[categoryId]) {
      onUnlink?.(year, accountId, categoryId)
    }
  }

  const formatMetricValue = (value) => {
    if (!Number.isFinite(value)) return '-'
    return new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(value))
  }

  const metricOptions = [
    { key: 'evaluationAmount', label: '평가금액(원)' },
    { key: 'investmentAmount', label: '투자금' },
    { key: 'principal', label: '원금' },
    { key: 'remaining', label: '예수금(잔여)' }
  ]

  const getMetricLabel = (metricKey) => {
    const option = metricOptions.find(opt => opt.key === metricKey)
    return option ? option.label : metricKey
  }

  const getMetricValue = useCallback((accountName, metricKey) => {
    if (!portfolioMetrics) return null
    const entry = portfolioMetrics[accountName]
      || Object.values(portfolioMetrics).find(opt => normalizeAccountKey(opt?.accountName) === normalizeAccountKey(accountName))
    if (!entry) return null
    return entry[metricKey]
  }, [portfolioMetrics])

  const handleApplySelectedMetric = () => {
    if (!activeMetricPicker) return
    if (!selectedPortfolioAccount || !selectedPortfolioMetric) return
    const metricValue = getMetricValue(selectedPortfolioAccount, selectedPortfolioMetric)
    if (metricValue === null || metricValue === undefined) {
      setActiveMetricPicker(null)
      return
    }
    const numericValue = Number(metricValue)
    if (!Number.isFinite(numericValue)) {
      setActiveMetricPicker(null)
      return
    }
    const roundedValue = Math.round(numericValue)
    const { accountId, categoryId } = activeMetricPicker
    setFormData(prev => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        [categoryId]: String(roundedValue)
      }
    }))
    onLink?.(year, accountId, categoryId, {
      portfolioAccount: selectedPortfolioAccount,
      metricKey: selectedPortfolioMetric,
      metricLabel: getMetricLabel(selectedPortfolioMetric)
    })
    setActiveMetricPicker(null)
  }

  const handleOpenMetricPicker = (accountId, categoryId) => {
    if (portfolioAccountOptions.length === 0) return
    const existingLink = portfolioLinks?.[accountId]?.[categoryId]
    if (existingLink) {
      if (existingLink.portfolioAccount) {
        setSelectedPortfolioAccount(existingLink.portfolioAccount)
      }
      if (existingLink.metricKey) {
        setSelectedPortfolioMetric(existingLink.metricKey)
      }
    }
    setActiveMetricPicker({ accountId, categoryId })
  }

  const handleUnlink = (accountId, categoryId) => {
    onUnlink?.(year, accountId, categoryId)
  }

  const handleCloseMetricPicker = () => {
    setActiveMetricPicker(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    Object.entries(formData).forEach(([accountId, categories]) => {
      Object.entries(categories).forEach(([categoryId, value]) => {
        onSave(accountId, categoryId, value)
      })
    })
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
          {/* 고정 헤더 */}
          <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {year}년 계좌별 자산 수정
                </h3>
                <p className="text-sm text-blue-100 mt-1">각 계좌별로 자산 카테고리 금액을 입력하세요</p>
              </div>
              <button type="button" onClick={onClose} className="text-white/80 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* 스크롤 가능한 콘텐츠 영역 */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {accountTypes.map((acc) => {
                const Icon = getIconComponent(acc.icon)
                return (
                  <div key={acc.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    {/* 계좌명 헤더 */}
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                      <Icon className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-gray-900">{acc.name}</span>
                    </div>

                    {/* 카테고리 그리드 - 2열 */}
                    <div className="grid grid-cols-2 gap-3">
                      {ASSET_CATEGORIES.map(cat => {
                        const linkedInfo = portfolioLinks?.[acc.id]?.[cat.id]
                        return (
                          <div key={cat.id} className="bg-white rounded-lg p-3 border border-gray-100">
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">
                              {cat.name}
                            </label>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={formData[acc.id]?.[cat.id] || ''}
                                onChange={(e) => handleChange(acc.id, cat.id, e.target.value)}
                                className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right text-sm font-medium"
                                placeholder="0"
                              />
                              {portfolioAccountOptions.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenMetricPicker(acc.id, cat.id)}
                                  className="flex-shrink-0 p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="포트폴리오 값 선택"
                                >
                                  <TrendingUp className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            {linkedInfo && (
                              <div className="mt-1.5 flex items-center justify-between text-[10px] text-blue-700 bg-blue-50 rounded px-2 py-1">
                                <span className="truncate">
                                  🔗 {linkedInfo.portfolioAccount}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUnlink(acc.id, cat.id)}
                                  className="text-blue-600 hover:text-blue-800 ml-1"
                                >
                                  해제
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 고정 푸터 버튼 */}
            <div className="flex-shrink-0 flex gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2.5">
                취소
              </button>
              <button type="submit" className="btn-primary flex-1 py-2.5">
                저장
              </button>
            </div>
          </form>
        </div>
      </div>

      {activeMetricPicker && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">포트폴리오 금액 적용</h4>
              <button onClick={handleCloseMetricPicker} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {portfolioAccountOptions.length === 0 ? (
              <p className="text-sm text-gray-600">포트폴리오 데이터가 없습니다. 먼저 포트폴리오에 계좌별 자산을 추가해주세요.</p>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">계좌 선택</label>
                  <select
                    value={selectedPortfolioAccount}
                    onChange={(e) => setSelectedPortfolioAccount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  >
                    {portfolioAccountOptions.map(option => (
                      <option key={option.accountName} value={option.accountName}>
                        {option.accountName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">항목 선택</label>
                  <select
                    value={selectedPortfolioMetric}
                    onChange={(e) => setSelectedPortfolioMetric(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  >
                    {metricOptions.map(option => (
                      <option key={option.key} value={option.key}>
                        {option.label} ({formatMetricValue(getMetricValue(selectedPortfolioAccount, option.key))}원)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleApplySelectedMetric}
                    className="btn-primary flex-1"
                  >
                    적용
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseMetricPicker}
                    className="btn-secondary flex-1"
                  >
                    취소
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default AssetStatus
