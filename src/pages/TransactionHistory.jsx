import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Receipt,
  Plus,
  Eye,
  Edit,
  Trash2,
  X,
  Save,
  DollarSign,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Calculator,
  ArrowRightLeft,
  RefreshCw,
  PiggyBank,
  TrendingUp,
  BarChart3
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import dataSync from '../utils/dataSync'
import marketDataService from '../services/marketDataService'

const TransactionHistory = () => {
  const [vndTransactions, setVndTransactions] = useState([])
  const [usdTransactions, setUsdTransactions] = useState([])
  const [krwTransactions, setKrwTransactions] = useState([])

  const [showAddModal, setShowAddModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState(null)

  // 월별 필터링 상태
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1) // 1-12

  const [exchangeRates, setExchangeRates] = useState({
    vndToKrw: 0.055, // VND to KRW (1 VND ≈ 0.055 KRW)
    usdToKrw: 1340    // USD to KRW
  })

  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  })

  const [editingTransaction, setEditingTransaction] = useState(null)

  // 배당금 관련 상태
  const [dividendTransactions, setDividendTransactions] = useState([])
  const [portfolioAssets, setPortfolioAssets] = useState([])
  const [showDividendModal, setShowDividendModal] = useState(false)
  const [dividendFormData, setDividendFormData] = useState({
    symbol: '',
    amount: '',
    currency: 'USD',
    date: new Date().toISOString().split('T')[0],
    description: ''
  })
  const [editingDividend, setEditingDividend] = useState(null)

  // 배당금 상세 내역 모달 상태
  const [showDividendDetailModal, setShowDividendDetailModal] = useState(false)
  const [dividendDetailType, setDividendDetailType] = useState('monthly') // 'monthly', 'yearly', 'bySymbol'

  // 배당금 연도/월 선택 상태
  const [dividendSelectedYear, setDividendSelectedYear] = useState(new Date().getFullYear())
  const [dividendSelectedMonth, setDividendSelectedMonth] = useState(new Date().getMonth() + 1)

  // 환율 계산기 상태
  const [calcFromCurrency, setCalcFromCurrency] = useState('KRW')
  const [calcAmount, setCalcAmount] = useState('')

  // Load exchange rates
  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        const marketData = await marketDataService.getAllMarketData()
        if (marketData.currency?.usdKrw?.rate) {
          setExchangeRates(prev => ({
            ...prev,
            usdToKrw: marketData.currency.usdKrw.rate
          }))
        }
        // VND to KRW rate (approximate: 1 VND ≈ 0.055 KRW)
        // You can fetch from another API if needed
      } catch (error) {
        console.error('Failed to fetch exchange rates:', error)
      }
    }

    fetchExchangeRates()
    const interval = setInterval(fetchExchangeRates, 300000) // Update every 5 minutes
    return () => clearInterval(interval)
  }, [])

  // Load transactions from localStorage
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const data = await dataSync.loadUserSetting('transaction_history_v2')
        if (data) {
          setVndTransactions(data.vnd || [])
          setUsdTransactions(data.usd || [])
          setKrwTransactions(data.krw || [])
        }
      } catch (error) {
        console.error('Failed to load transactions:', error)
      }
    }
    loadTransactions()
  }, [])

  // Load portfolio assets and dividend transactions
  useEffect(() => {
    const loadDividendData = async () => {
      try {
        // Load portfolio assets for dropdown
        const assets = await dataSync.loadPortfolioAssets()
        setPortfolioAssets(Array.isArray(assets) ? assets : [])

        // Load dividend transactions
        const dividends = await dataSync.loadUserSetting('dividend_transactions')
        setDividendTransactions(Array.isArray(dividends) ? dividends : [])
      } catch (error) {
        console.error('Failed to load dividend data:', error)
      }
    }
    loadDividendData()
  }, [])

  // Save transactions to localStorage
  const saveTransactions = useCallback((vnd, usd, krw) => {
    const data = { vnd, usd, krw }
    dataSync.saveUserSetting('transaction_history_v2', data).catch(error => {
      console.error('Failed to save transactions:', error)
    })
  }, [])

  // Save dividend transactions
  const saveDividendTransactions = useCallback((dividends) => {
    dataSync.saveUserSetting('dividend_transactions', dividends).catch(error => {
      console.error('Failed to save dividend transactions:', error)
    })
  }, [])

  // Add dividend transaction
  const handleAddDividend = (keepOpen = false) => {
    if (!dividendFormData.symbol || !dividendFormData.amount) return

    const newDividend = {
      id: Date.now(),
      symbol: dividendFormData.symbol,
      amount: parseFloat(dividendFormData.amount),
      currency: dividendFormData.currency,
      date: dividendFormData.date,
      description: dividendFormData.description || `${dividendFormData.symbol} 배당금`,
      createdAt: new Date().toISOString()
    }

    const updated = [...dividendTransactions, newDividend]
    setDividendTransactions(updated)
    saveDividendTransactions(updated)

    if (keepOpen) {
      setDividendFormData(prev => ({
        ...prev,
        amount: '',
        description: ''
      }))
    } else {
      handleCloseDividendModal()
    }
  }

  // Edit dividend transaction  
  const handleEditDividend = () => {
    if (!editingDividend || !dividendFormData.amount) return

    const updated = dividendTransactions.map(d =>
      d.id === editingDividend.id
        ? { ...d, ...dividendFormData, amount: parseFloat(dividendFormData.amount), updatedAt: new Date().toISOString() }
        : d
    )
    setDividendTransactions(updated)
    saveDividendTransactions(updated)
    handleCloseDividendModal()
  }

  // Delete dividend transaction
  const handleDeleteDividend = (id) => {
    const updated = dividendTransactions.filter(d => d.id !== id)
    setDividendTransactions(updated)
    saveDividendTransactions(updated)
  }

  // Open add dividend modal
  const handleOpenDividendModal = () => {
    setEditingDividend(null)
    setDividendFormData({
      symbol: portfolioAssets.length > 0 ? portfolioAssets[0].symbol : '',
      amount: '',
      currency: 'USD',
      date: new Date().toISOString().split('T')[0],
      description: ''
    })
    setShowDividendModal(true)
  }

  // Open edit dividend modal
  const handleOpenEditDividendModal = (dividend) => {
    setEditingDividend(dividend)
    setDividendFormData({
      symbol: dividend.symbol,
      amount: dividend.amount.toString(),
      currency: dividend.currency,
      date: dividend.date,
      description: dividend.description || ''
    })
    setShowDividendModal(true)
  }

  // Close dividend modal
  const handleCloseDividendModal = () => {
    setShowDividendModal(false)
    setEditingDividend(null)
    setDividendFormData({
      symbol: '',
      amount: '',
      currency: 'USD',
      date: new Date().toISOString().split('T')[0],
      description: ''
    })
  }

  // Calculate dividend statistics (선택된 연도/월 기준)
  const dividendStats = useMemo(() => {
    // 선택된 연도/월 기준으로 계산
    const targetYear = dividendSelectedYear
    const targetMonth = dividendSelectedMonth

    // 선택된 월 배당금 집계
    const monthlyTotal = dividendTransactions
      .filter(d => {
        const date = new Date(d.date)
        return date.getFullYear() === targetYear && (date.getMonth() + 1) === targetMonth
      })
      .reduce((sum, d) => {
        const amount = d.currency === 'USD' ? d.amount * exchangeRates.usdToKrw : d.amount
        return sum + amount
      }, 0)

    // 선택된 연도 배당금 집계
    const yearlyTotal = dividendTransactions
      .filter(d => new Date(d.date).getFullYear() === targetYear)
      .reduce((sum, d) => {
        const amount = d.currency === 'USD' ? d.amount * exchangeRates.usdToKrw : d.amount
        return sum + amount
      }, 0)

    // 종목별 배당금 집계 (선택된 연도 기준)
    const bySymbol = {}
    dividendTransactions
      .filter(d => new Date(d.date).getFullYear() === targetYear)
      .forEach(d => {
        if (!bySymbol[d.symbol]) {
          bySymbol[d.symbol] = { symbol: d.symbol, total: 0, count: 0 }
        }
        const amount = d.currency === 'USD' ? d.amount * exchangeRates.usdToKrw : d.amount
        bySymbol[d.symbol].total += amount
        bySymbol[d.symbol].count += 1
      })

    // 월별 배당금 차트 데이터 (선택된 연도 기준 12개월)
    const monthlyChartData = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const monthTotal = dividendTransactions
        .filter(d => {
          const date = new Date(d.date)
          return date.getFullYear() === targetYear && (date.getMonth() + 1) === month
        })
        .reduce((sum, d) => {
          const amount = d.currency === 'USD' ? d.amount * exchangeRates.usdToKrw : d.amount
          return sum + amount
        }, 0)
      return {
        month: `${month}월`,
        monthNum: month,
        amount: Math.round(monthTotal),
        isSelected: month === targetMonth // 현재 선택된 월 표시
      }
    })

    // 선택된 연도 내 거래 건수
    const yearlyCount = dividendTransactions.filter(d =>
      new Date(d.date).getFullYear() === targetYear
    ).length

    return {
      monthlyTotal,
      yearlyTotal,
      monthlyAvg: yearlyTotal / 12,
      bySymbol: Object.values(bySymbol).sort((a, b) => b.total - a.total),
      totalCount: dividendTransactions.length,
      yearlyCount,
      monthlyChartData,
      targetYear,
      targetMonth
    }
  }, [dividendTransactions, exchangeRates, dividendSelectedYear, dividendSelectedMonth])

  // 배당금 데이터가 있는 연도 목록
  const dividendAvailableYears = useMemo(() => {
    const years = new Set(dividendTransactions.map(d => new Date(d.date).getFullYear()))
    // 현재 연도 및 다음 연도도 추가
    const currentYear = new Date().getFullYear()
    years.add(currentYear)
    years.add(currentYear + 1)
    return Array.from(years).sort((a, b) => b - a)
  }, [dividendTransactions])

  // 배당금 이전/다음 달 이동
  const handleDividendPreviousMonth = () => {
    if (dividendSelectedMonth === 1) {
      setDividendSelectedMonth(12)
      setDividendSelectedYear(prev => prev - 1)
    } else {
      setDividendSelectedMonth(prev => prev - 1)
    }
  }

  const handleDividendNextMonth = () => {
    if (dividendSelectedMonth === 12) {
      setDividendSelectedMonth(1)
      setDividendSelectedYear(prev => prev + 1)
    } else {
      setDividendSelectedMonth(prev => prev + 1)
    }
  }


  // Calculate cumulative sum (전체 기간)
  const calculateCumulative = (transactions) => {
    return transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
  }

  // Calculate current month cumulative sum (당월만)
  const calculateCurrentMonthCumulative = (transactions) => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    return transactions
      .filter(tx => {
        const txDate = new Date(tx.date)
        return txDate.getFullYear() === currentYear && (txDate.getMonth() + 1) === currentMonth
      })
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
  }

  // Calculate cumulative sum in KRW
  const calculateCumulativeKRW = (transactions, currency) => {
    const sum = calculateCurrentMonthCumulative(transactions) // 당월만 계산
    if (currency === 'VND') {
      return sum * exchangeRates.vndToKrw
    } else if (currency === 'USD') {
      return sum * exchangeRates.usdToKrw
    }
    return sum
  }

  // Get current month transaction count
  const getCurrentMonthCount = (transactions) => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    return transactions.filter(tx => {
      const txDate = new Date(tx.date)
      return txDate.getFullYear() === currentYear && (txDate.getMonth() + 1) === currentMonth
    }).length
  }

  // Format currency
  const formatCurrency = (value, currency = 'KRW') => {
    if (value === null || value === undefined) return '-'
    const num = Number(value)
    if (!Number.isFinite(num)) return '-'

    if (currency === 'USD') {
      return `$${num.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
    } else if (currency === 'VND') {
      return `₫${num.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}`
    }
    return `₩${num.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`
  }

  // Handle add transaction
  const handleAddTransaction = (keepOpen = false) => {
    if (!formData.amount || !selectedCurrency) return

    const newTransaction = {
      id: Date.now(),
      amount: parseFloat(formData.amount),
      description: formData.description,
      date: formData.date,
      createdAt: new Date().toISOString()
    }

    let newVnd = [...vndTransactions]
    let newUsd = [...usdTransactions]
    let newKrw = [...krwTransactions]

    if (selectedCurrency === 'VND') {
      newVnd = [...vndTransactions, newTransaction]
      setVndTransactions(newVnd)
    } else if (selectedCurrency === 'USD') {
      newUsd = [...usdTransactions, newTransaction]
      setUsdTransactions(newUsd)
    } else if (selectedCurrency === 'KRW') {
      newKrw = [...krwTransactions, newTransaction]
      setKrwTransactions(newKrw)
    }

    saveTransactions(newVnd, newUsd, newKrw)

    // 모달 유지하고 폼만 리셋 (연속 추가 가능)
    if (keepOpen) {
      setFormData({
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      })
    } else {
      handleCloseModal()
    }
  }

  // Handle edit transaction
  const handleEditTransaction = () => {
    if (!formData.amount || !selectedCurrency || !editingTransaction) return

    const updatedTransaction = {
      ...editingTransaction,
      amount: parseFloat(formData.amount),
      description: formData.description,
      date: formData.date,
      updatedAt: new Date().toISOString()
    }

    let newVnd = [...vndTransactions]
    let newUsd = [...usdTransactions]
    let newKrw = [...krwTransactions]

    if (selectedCurrency === 'VND') {
      newVnd = vndTransactions.map(tx => tx.id === editingTransaction.id ? updatedTransaction : tx)
      setVndTransactions(newVnd)
    } else if (selectedCurrency === 'USD') {
      newUsd = usdTransactions.map(tx => tx.id === editingTransaction.id ? updatedTransaction : tx)
      setUsdTransactions(newUsd)
    } else if (selectedCurrency === 'KRW') {
      newKrw = krwTransactions.map(tx => tx.id === editingTransaction.id ? updatedTransaction : tx)
      setKrwTransactions(newKrw)
    }

    saveTransactions(newVnd, newUsd, newKrw)
    handleCloseModal()
  }

  // Handle delete transaction
  const handleDeleteTransaction = (id, currency) => {
    let newVnd = [...vndTransactions]
    let newUsd = [...usdTransactions]
    let newKrw = [...krwTransactions]

    if (currency === 'VND') {
      newVnd = vndTransactions.filter(tx => tx.id !== id)
      setVndTransactions(newVnd)
    } else if (currency === 'USD') {
      newUsd = usdTransactions.filter(tx => tx.id !== id)
      setUsdTransactions(newUsd)
    } else if (currency === 'KRW') {
      newKrw = krwTransactions.filter(tx => tx.id !== id)
      setKrwTransactions(newKrw)
    }

    saveTransactions(newVnd, newUsd, newKrw)
  }

  // Handle delete all transactions for a currency
  const handleDeleteAllTransactions = (currency) => {
    const confirmed = window.confirm(`정말 ${currency} 거래 이력을 모두 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)
    if (!confirmed) return

    let newVnd = [...vndTransactions]
    let newUsd = [...usdTransactions]
    let newKrw = [...krwTransactions]

    if (currency === 'VND') {
      newVnd = []
      setVndTransactions(newVnd)
    } else if (currency === 'USD') {
      newUsd = []
      setUsdTransactions(newUsd)
    } else if (currency === 'KRW') {
      newKrw = []
      setKrwTransactions(newKrw)
    }

    saveTransactions(newVnd, newUsd, newKrw)
    handleCloseModal()
  }

  // Open add modal
  const handleOpenAddModal = (currency) => {
    setSelectedCurrency(currency)
    setEditingTransaction(null)
    setFormData({
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    })
    setShowAddModal(true)
  }

  // Open edit modal
  const handleOpenEditModal = (transaction, currency) => {
    setSelectedCurrency(currency)
    setEditingTransaction(transaction)
    setFormData({
      amount: transaction.amount.toString(),
      description: transaction.description || '',
      date: transaction.date
    })
    setShowAddModal(true)
    setShowHistoryModal(false)
  }

  // Close modal
  const handleCloseModal = () => {
    setShowAddModal(false)
    setShowHistoryModal(false)
    setSelectedCurrency(null)
    setEditingTransaction(null)
    setFormData({
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    })
  }

  // Open history modal
  const handleOpenHistoryModal = (currency) => {
    setSelectedCurrency(currency)
    setShowHistoryModal(true)
  }

  // Get transactions by currency
  const getTransactionsByCurrency = (currency) => {
    if (currency === 'VND') return vndTransactions
    if (currency === 'USD') return usdTransactions
    if (currency === 'KRW') return krwTransactions
    return []
  }

  // 월별로 필터링된 거래 내역
  const getFilteredTransactions = useMemo(() => {
    const transactions = getTransactionsByCurrency(selectedCurrency)
    return transactions.filter(tx => {
      const txDate = new Date(tx.date)
      return txDate.getFullYear() === selectedYear && (txDate.getMonth() + 1) === selectedMonth
    })
  }, [selectedCurrency, selectedYear, selectedMonth, vndTransactions, usdTransactions, krwTransactions])

  // 사용 가능한 년도 목록 (거래 내역이 있는 년도만)
  const availableYears = useMemo(() => {
    const allTransactions = [...vndTransactions, ...usdTransactions, ...krwTransactions]
    const years = new Set(allTransactions.map(tx => new Date(tx.date).getFullYear()))
    return Array.from(years).sort((a, b) => b - a)
  }, [vndTransactions, usdTransactions, krwTransactions])

  // 월별 통계
  const getMonthlyStats = useMemo(() => {
    const transactions = getFilteredTransactions
    const totalAmount = transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
    const count = transactions.length

    let totalKRW = 0
    if (selectedCurrency === 'VND') {
      totalKRW = totalAmount * exchangeRates.vndToKrw
    } else if (selectedCurrency === 'USD') {
      totalKRW = totalAmount * exchangeRates.usdToKrw
    } else {
      totalKRW = totalAmount
    }

    return { totalAmount, count, totalKRW }
  }, [getFilteredTransactions, selectedCurrency, exchangeRates])

  // 환율 계산기 - 환산 결과 계산
  const calculatedRates = useMemo(() => {
    const amount = parseFloat(calcAmount) || 0
    if (amount === 0) {
      return { krw: 0, usd: 0, vnd: 0 }
    }

    let krwValue = 0
    let usdValue = 0
    let vndValue = 0

    // 입력 통화에 따라 KRW 기준값 계산
    if (calcFromCurrency === 'KRW') {
      krwValue = amount
      usdValue = amount / exchangeRates.usdToKrw
      vndValue = amount / exchangeRates.vndToKrw
    } else if (calcFromCurrency === 'USD') {
      krwValue = amount * exchangeRates.usdToKrw
      usdValue = amount
      vndValue = (amount * exchangeRates.usdToKrw) / exchangeRates.vndToKrw
    } else if (calcFromCurrency === 'VND') {
      krwValue = amount * exchangeRates.vndToKrw
      usdValue = (amount * exchangeRates.vndToKrw) / exchangeRates.usdToKrw
      vndValue = amount
    }

    return { krw: krwValue, usd: usdValue, vnd: vndValue }
  }, [calcAmount, calcFromCurrency, exchangeRates])

  // 이전 달로 이동
  const handlePreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear(prev => prev - 1)
    } else {
      setSelectedMonth(prev => prev - 1)
    }
  }

  // 다음 달로 이동
  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear(prev => prev + 1)
    } else {
      setSelectedMonth(prev => prev + 1)
    }
  }

  // Currency section component
  const CurrencySection = ({ currency, label, transactions }) => {
    const currentMonthCumulative = calculateCurrentMonthCumulative(transactions)
    const cumulativeKRW = calculateCumulativeKRW(transactions, currency)
    const currentMonthCount = getCurrentMonthCount(transactions)
    const totalCount = transactions.length

    // 현재 년월 표시
    const now = new Date()
    const currentYearMonth = `${now.getFullYear()}년 ${now.getMonth() + 1}월`

    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">{label}</h3>
          </div>
          <button
            onClick={() => handleOpenAddModal(currency)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            입력 추가
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 금액입력 */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <p className="text-sm font-medium text-blue-700 mb-2">금액입력</p>
            <p className="text-2xl font-bold text-blue-900">
              {formatCurrency(currentMonthCumulative, currency)}
            </p>
            <p className="text-xs text-blue-600 mt-1">{currentYearMonth} • {currentMonthCount}건</p>
          </div>

          {/* 누적합산 (당월) */}
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
            <p className="text-sm font-medium text-green-700 mb-2">누적합산 (당월)</p>
            <p className="text-2xl font-bold text-green-900">
              {formatCurrency(currentMonthCumulative, currency)}
            </p>
            <button
              onClick={() => handleOpenHistoryModal(currency)}
              className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 mt-2"
            >
              <Eye className="w-3 h-3" />
              이력 보기 (전체 {totalCount}건)
            </button>
          </div>

          {/* 누적합산 (원화환율적용) - 당월 */}
          {currency !== 'KRW' && (
            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
              <p className="text-sm font-medium text-purple-700 mb-2">누적합산 (원화환율적용)</p>
              <p className="text-2xl font-bold text-purple-900">
                {formatCurrency(cumulativeKRW, 'KRW')}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                {currentYearMonth} • 환율: {currency === 'VND'
                  ? `1₫ = ₩${exchangeRates.vndToKrw.toFixed(3)}`
                  : `$1 = ₩${exchangeRates.usdToKrw.toLocaleString()}`
                }
              </p>
            </div>
          )}

          {/* KRW는 2열만 사용 */}
          {currency === 'KRW' && (
            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 flex items-center justify-center">
              <p className="text-sm text-gray-500">원화는 환율 적용 없음</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-100 rounded-lg">
            <Receipt className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">입금 및 출금 자동계산</h2>
            <p className="text-sm text-gray-600">화폐별 입력 및 누적 관리 (환율 자동 적용)</p>
          </div>
        </div>
      </div>

      {/* 환율 계산기 */}
      <div className="card bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-indigo-200">
          <Calculator className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-bold text-gray-900">환율 계산기</h3>
          <span className="text-xs text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full ml-2">
            실시간 환율 적용
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 입력 영역 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                기준 통화 선택
              </label>
              <div className="flex gap-2">
                {['KRW', 'USD', 'VND'].map(currency => (
                  <button
                    key={currency}
                    onClick={() => setCalcFromCurrency(currency)}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-semibold transition-all ${calcFromCurrency === currency
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-indigo-400'
                      }`}
                  >
                    {currency === 'KRW' && '₩ 원화'}
                    {currency === 'USD' && '$ 달러'}
                    {currency === 'VND' && '₫ 동'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                금액 입력
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(e.target.value)}
                  placeholder="금액을 입력하세요"
                  className="w-full px-4 py-3 text-lg font-semibold border-2 border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  {calcFromCurrency === 'KRW' && '₩'}
                  {calcFromCurrency === 'USD' && '$'}
                  {calcFromCurrency === 'VND' && '₫'}
                </span>
              </div>
            </div>

            {/* 현재 환율 정보 */}
            <div className="bg-white rounded-xl p-4 border border-indigo-100">
              <div className="flex items-center gap-2 mb-3">
                <RefreshCw className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-medium text-gray-700">현재 적용 환율</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">USD/KRW:</span>
                  <span className="font-semibold text-gray-900">₩{exchangeRates.usdToKrw.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">VND/KRW:</span>
                  <span className="font-semibold text-gray-900">₩{exchangeRates.vndToKrw.toFixed(4)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 환산 결과 영역 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-medium text-gray-700">환산 결과</span>
            </div>

            {/* KRW 결과 */}
            <div className={`p-4 rounded-xl border-2 transition-all ${calcFromCurrency === 'KRW'
              ? 'bg-indigo-100 border-indigo-300'
              : 'bg-white border-gray-200 hover:border-indigo-200'
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🇰🇷</span>
                  <span className="font-medium text-gray-700">원화 (KRW)</span>
                </div>
                <span className={`text-xl font-bold ${calcFromCurrency === 'KRW' ? 'text-indigo-700' : 'text-gray-900'}`}>
                  ₩{calculatedRates.krw.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>

            {/* USD 결과 */}
            <div className={`p-4 rounded-xl border-2 transition-all ${calcFromCurrency === 'USD'
              ? 'bg-green-100 border-green-300'
              : 'bg-white border-gray-200 hover:border-green-200'
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🇺🇸</span>
                  <span className="font-medium text-gray-700">달러 (USD)</span>
                </div>
                <span className={`text-xl font-bold ${calcFromCurrency === 'USD' ? 'text-green-700' : 'text-gray-900'}`}>
                  ${calculatedRates.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* VND 결과 */}
            <div className={`p-4 rounded-xl border-2 transition-all ${calcFromCurrency === 'VND'
              ? 'bg-red-100 border-red-300'
              : 'bg-white border-gray-200 hover:border-red-200'
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🇻🇳</span>
                  <span className="font-medium text-gray-700">동 (VND)</span>
                </div>
                <span className={`text-xl font-bold ${calcFromCurrency === 'VND' ? 'text-red-700' : 'text-gray-900'}`}>
                  ₫{calculatedRates.vnd.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VND Section */}
      <CurrencySection
        currency="VND"
        label="금액입력 (VND)"
        transactions={vndTransactions}
      />

      {/* USD Section */}
      <CurrencySection
        currency="USD"
        label="금액입력 (USD)"
        transactions={usdTransactions}
      />

      {/* KRW Section */}
      <CurrencySection
        currency="KRW"
        label="금액입력 (KRW)"
        transactions={krwTransactions}
      />

      {/* Dividend Section */}
      <div className="card bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-3 border-b border-emerald-200 gap-3">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-gray-900">배당금 입력</h3>
            <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
              실제 배당금 기록
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* 연도/월 선택기 */}
            <div className="flex items-center gap-1 bg-white border border-emerald-300 rounded-lg px-2 py-1">
              <button
                onClick={handleDividendPreviousMonth}
                className="p-1 hover:bg-emerald-100 rounded transition-colors"
                title="이전 달"
              >
                <ChevronLeft className="w-4 h-4 text-emerald-600" />
              </button>
              <select
                value={dividendSelectedYear}
                onChange={(e) => setDividendSelectedYear(Number(e.target.value))}
                className="text-sm font-semibold text-gray-900 bg-transparent focus:outline-none cursor-pointer"
              >
                {dividendAvailableYears.map(year => (
                  <option key={year} value={year}>{year}년</option>
                ))}
              </select>
              <select
                value={dividendSelectedMonth}
                onChange={(e) => setDividendSelectedMonth(Number(e.target.value))}
                className="text-sm font-semibold text-gray-900 bg-transparent focus:outline-none cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                  <option key={month} value={month}>{month}월</option>
                ))}
              </select>
              <button
                onClick={handleDividendNextMonth}
                className="p-1 hover:bg-emerald-100 rounded transition-colors"
                title="다음 달"
              >
                <ChevronRight className="w-4 h-4 text-emerald-600" />
              </button>
            </div>
            <button
              onClick={handleOpenDividendModal}
              className="btn-primary flex items-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4" />
              배당금 추가
            </button>
          </div>
        </div>

        {/* 상단 통계 카드 - 클릭 시 상세 내역 모달 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* 선택월 배당금 */}
          <button
            onClick={() => { setDividendDetailType('monthly'); setShowDividendDetailModal(true); }}
            className="bg-white border-2 border-emerald-200 rounded-xl p-4 text-left hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer"
          >
            <p className="text-sm font-medium text-emerald-700 mb-2">{dividendSelectedMonth}월 배당금</p>
            <p className="text-2xl font-bold text-emerald-900">
              {formatCurrency(dividendStats.monthlyTotal, 'KRW')}
            </p>
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
              {dividendSelectedYear}년 {dividendSelectedMonth}월
              <Eye className="w-3 h-3 ml-auto" />
            </p>
          </button>

          {/* 연간 배당금 */}
          <button
            onClick={() => { setDividendDetailType('yearly'); setShowDividendDetailModal(true); }}
            className="bg-white border-2 border-green-200 rounded-xl p-4 text-left hover:border-green-400 hover:shadow-md transition-all cursor-pointer"
          >
            <p className="text-sm font-medium text-green-700 mb-2">{dividendSelectedYear}년 배당금</p>
            <p className="text-2xl font-bold text-green-900">
              {formatCurrency(dividendStats.yearlyTotal, 'KRW')}
            </p>
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              {dividendSelectedYear}년 • {dividendStats.yearlyCount}건
              <Eye className="w-3 h-3 ml-auto" />
            </p>
          </button>

          {/* 종목별 배당금 */}
          <button
            onClick={() => { setDividendDetailType('bySymbol'); setShowDividendDetailModal(true); }}
            className="bg-white border-2 border-teal-200 rounded-xl p-4 text-left hover:border-teal-400 hover:shadow-md transition-all cursor-pointer"
          >
            <p className="text-sm font-medium text-teal-700 mb-2">{dividendSelectedYear}년 종목별</p>
            <p className="text-2xl font-bold text-teal-900">
              {dividendStats.bySymbol.length}종목
            </p>
            <p className="text-xs text-teal-600 mt-1 flex items-center gap-1">
              월평균 {formatCurrency(dividendStats.monthlyAvg, 'KRW')}
              <Eye className="w-3 h-3 ml-auto" />
            </p>
          </button>
        </div>

        {/* 월별 배당금 차트 */}
        <div className="bg-white rounded-xl p-4 border border-emerald-100">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <p className="text-sm font-semibold text-gray-700">{dividendSelectedYear}년 월별 배당금</p>
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {dividendSelectedMonth}월 선택중
            </span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dividendStats.monthlyChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(value) => value >= 10000 ? `${(value / 10000).toFixed(0)}만` : value.toLocaleString()}
                />
                <Tooltip
                  formatter={(value) => [`₩${value.toLocaleString()}`, '배당금']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #d1d5db' }}
                />
                <Bar
                  dataKey="amount"
                  radius={[4, 4, 0, 0]}
                  fill="#10b981"
                  // 선택된 월 하이라이트
                  shape={(props) => {
                    const { x, y, width, height, payload } = props
                    const isSelected = payload.monthNum === dividendSelectedMonth
                    return (
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={isSelected ? '#059669' : '#10b981'}
                        rx={4}
                        ry={4}
                        stroke={isSelected ? '#047857' : 'none'}
                        strokeWidth={isSelected ? 2 : 0}
                      />
                    )
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {dividendStats.yearlyCount === 0 && (
            <p className="text-center text-gray-500 text-sm mt-2">{dividendSelectedYear}년 배당금 내역이 없습니다</p>
          )}
        </div>

        {/* 보유 종목이 없을 때 안내 */}
        {portfolioAssets.length === 0 && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm text-amber-800">
              💡 포트폴리오에 자산을 먼저 추가하면 드롭다운에서 종목을 선택할 수 있습니다.
            </p>
          </div>
        )}
      </div>

      {/* 배당금 상세 내역 모달 */}
      {showDividendDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                {dividendDetailType === 'monthly' && `${dividendSelectedYear}년 ${dividendSelectedMonth}월 배당금 내역`}
                {dividendDetailType === 'yearly' && `${dividendSelectedYear}년 배당금 내역`}
                {dividendDetailType === 'bySymbol' && `${dividendSelectedYear}년 종목별 배당금 현황`}
              </h3>
              <button onClick={() => setShowDividendDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {dividendDetailType === 'bySymbol' ? (
                /* 종목별 배당금 */
                <div className="space-y-2">
                  {dividendStats.bySymbol.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">{dividendSelectedYear}년 배당금 내역이 없습니다</p>
                  ) : (
                    dividendStats.bySymbol.map(item => (
                      <div key={item.symbol} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                        <div>
                          <span className="font-semibold text-gray-900">{item.symbol}</span>
                          <span className="text-xs text-gray-500 ml-2">{item.count}건</span>
                        </div>
                        <span className="text-emerald-600 font-bold">{formatCurrency(item.total, 'KRW')}</span>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* 월별/연간 배당금 내역 */
                <div className="space-y-2">
                  {(() => {
                    const filteredDividends = dividendTransactions
                      .filter(d => {
                        const date = new Date(d.date)
                        if (dividendDetailType === 'monthly') {
                          return date.getFullYear() === dividendSelectedYear && (date.getMonth() + 1) === dividendSelectedMonth
                        }
                        return date.getFullYear() === dividendSelectedYear
                      })
                      .sort((a, b) => new Date(b.date) - new Date(a.date))

                    if (filteredDividends.length === 0) {
                      return (
                        <p className="text-center text-gray-500 py-8">
                          {dividendDetailType === 'monthly'
                            ? `${dividendSelectedYear}년 ${dividendSelectedMonth}월 배당금 내역이 없습니다`
                            : `${dividendSelectedYear}년 배당금 내역이 없습니다`}
                        </p>
                      )
                    }

                    return filteredDividends.map(d => (
                      <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{d.symbol}</span>
                            <span className="text-xs text-gray-500">{new Date(d.date).toLocaleDateString('ko-KR')}</span>
                          </div>
                          {d.description && <p className="text-xs text-gray-500 mt-1">{d.description}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-600">
                            {d.currency === 'USD' ? `$${d.amount.toLocaleString()}` : `₩${d.amount.toLocaleString()}`}
                          </span>
                          <button onClick={() => { handleOpenEditDividendModal(d); setShowDividendDetailModal(false); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteDividend(d.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {dividendDetailType === 'bySymbol'
                    ? `${dividendSelectedYear}년 총 ${dividendStats.bySymbol.length}개 종목`
                    : dividendDetailType === 'monthly'
                      ? `${dividendSelectedYear}년 ${dividendSelectedMonth}월`
                      : `${dividendSelectedYear}년 총 ${dividendStats.yearlyCount}건`}
                </span>
                <button onClick={() => setShowDividendDetailModal(false)} className="btn-secondary px-4 py-2">
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dividend Add/Edit Modal */}
      {showDividendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {editingDividend ? '배당금 수정' : '배당금 추가'}
              </h3>
              <button onClick={handleCloseDividendModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* 종목 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  종목 선택
                </label>
                {portfolioAssets.length > 0 ? (
                  <select
                    value={dividendFormData.symbol}
                    onChange={(e) => setDividendFormData(prev => ({ ...prev, symbol: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {portfolioAssets.map(asset => (
                      <option key={asset.id} value={asset.symbol}>
                        {asset.symbol} - {asset.name || asset.symbol}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={dividendFormData.symbol}
                    onChange={(e) => setDividendFormData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                    placeholder="종목 심볼 입력 (예: AAPL)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                )}
              </div>

              {/* 통화 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  통화
                </label>
                <div className="flex gap-2">
                  {['USD', 'KRW'].map(currency => (
                    <button
                      key={currency}
                      onClick={() => setDividendFormData(prev => ({ ...prev, currency }))}
                      className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${dividendFormData.currency === currency
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {currency === 'USD' ? '$ USD' : '₩ KRW'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 배당금 금액 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  배당금 ({dividendFormData.currency})
                </label>
                <input
                  type="number"
                  value={dividendFormData.amount}
                  onChange={(e) => setDividendFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="배당금 입력"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* 날짜 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  입금일
                </label>
                <input
                  type="date"
                  value={dividendFormData.date}
                  onChange={(e) => setDividendFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* 메모 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  메모 (선택)
                </label>
                <input
                  type="text"
                  value={dividendFormData.description}
                  onChange={(e) => setDividendFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="예: 분기배당"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCloseDividendModal}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              {!editingDividend && (
                <button
                  onClick={() => handleAddDividend(true)}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  추가 후 계속
                </button>
              )}
              <button
                onClick={editingDividend ? handleEditDividend : () => handleAddDividend(false)}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingDividend ? '수정' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {editingTransaction ? '거래 수정' : '거래 추가'} ({selectedCurrency})
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  금액 ({selectedCurrency})
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="금액을 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  설명 (선택)
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="거래 내역 설명"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  날짜
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              {!editingTransaction && (
                <button
                  onClick={() => handleAddTransaction(true)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  추가 후 계속
                </button>
              )}
              <button
                onClick={editingTransaction ? handleEditTransaction : () => handleAddTransaction(false)}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingTransaction ? '수정' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  거래 이력 ({selectedCurrency})
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  전체 {getTransactionsByCurrency(selectedCurrency).length}건의 거래
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getTransactionsByCurrency(selectedCurrency).length > 0 && (
                  <button
                    onClick={() => handleDeleteAllTransactions(selectedCurrency)}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    전체삭제
                  </button>
                )}
                <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* 월별 필터 */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-gray-900">월별 이력</h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePreviousMonth}
                    className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                    title="이전 달"
                  >
                    <ChevronLeft className="w-5 h-5 text-blue-600" />
                  </button>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-300 rounded-lg">
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="font-semibold text-gray-900 bg-transparent focus:outline-none cursor-pointer"
                    >
                      {availableYears.length > 0 ? (
                        availableYears.map(year => (
                          <option key={year} value={year}>{year}년</option>
                        ))
                      ) : (
                        <option value={new Date().getFullYear()}>{new Date().getFullYear()}년</option>
                      )}
                    </select>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="font-semibold text-gray-900 bg-transparent focus:outline-none cursor-pointer"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                        <option key={month} value={month}>{month}월</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleNextMonth}
                    className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                    title="다음 달"
                  >
                    <ChevronRight className="w-5 h-5 text-blue-600" />
                  </button>
                </div>
              </div>

              {/* 월별 통계 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <p className="text-xs text-gray-600 mb-1">거래 건수</p>
                  <p className="text-lg font-bold text-blue-600">{getMonthlyStats.count}건</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <p className="text-xs text-gray-600 mb-1">합계</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(getMonthlyStats.totalAmount, selectedCurrency)}
                  </p>
                </div>
                {selectedCurrency !== 'KRW' && (
                  <div className="bg-white rounded-lg p-3 border border-purple-200">
                    <p className="text-xs text-gray-600 mb-1">원화 환산</p>
                    <p className="text-lg font-bold text-purple-600">
                      {formatCurrency(getMonthlyStats.totalKRW, 'KRW')}
                    </p>
                  </div>
                )}
                {selectedCurrency === 'KRW' && (
                  <div className="bg-white rounded-lg p-3 border border-gray-200 flex items-center justify-center">
                    <p className="text-xs text-gray-500">환율 적용 없음</p>
                  </div>
                )}
              </div>
            </div>

            {/* 월별 거래 내역 리스트 */}
            <div className="space-y-3">
              {getFilteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {selectedYear}년 {selectedMonth}월에 등록된 거래 이력이 없습니다.
                </div>
              ) : (
                getFilteredTransactions
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-bold text-gray-900">
                            {formatCurrency(transaction.amount, selectedCurrency)}
                          </p>
                          <span className="text-xs text-gray-500">
                            {new Date(transaction.date).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                        {transaction.description && (
                          <p className="text-sm text-gray-600 mt-1">{transaction.description}</p>
                        )}
                        {selectedCurrency !== 'KRW' && (
                          <p className="text-xs text-purple-600 mt-1">
                            ≈ {formatCurrency(
                              selectedCurrency === 'VND'
                                ? transaction.amount * exchangeRates.vndToKrw
                                : transaction.amount * exchangeRates.usdToKrw,
                              'KRW'
                            )}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(transaction, selectedCurrency)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="수정"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(transaction.id, selectedCurrency)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Usage Guide */}
      <div className="card bg-blue-50 border border-blue-200">
        <div className="flex items-start gap-3">
          <Receipt className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-2">사용 방법:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>"입력 추가" 버튼을 클릭하여 새로운 거래를 등록합니다</li>
              <li>누적합산은 모든 거래 금액을 자동으로 합산합니다</li>
              <li>VND와 USD는 현재 환율을 적용하여 원화로 환산합니다</li>
              <li>"이력 보기"를 클릭하여 거래 내역을 확인하고 수정/삭제할 수 있습니다</li>
              <li>환율은 5분마다 자동으로 업데이트됩니다</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TransactionHistory
