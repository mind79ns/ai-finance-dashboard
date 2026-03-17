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
  BarChart3,
  Utensils,
  Car,
  Home,
  ShoppingBag,
  Heart,
  GraduationCap,
  Gamepad2,
  Zap,
  Wallet,
  MoreHorizontal,
  PieChart
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend
} from 'recharts'
import dataSync from '../utils/dataSync'
import marketDataService from '../services/marketDataService'

// 카테고리 정의
const CATEGORIES = [
  { id: 'food', name: '식비', icon: Utensils, color: '#ef4444', bgColor: 'bg-red-500/20' },
  { id: 'transport', name: '교통비', icon: Car, color: '#f97316', bgColor: 'bg-orange-500/20' },
  { id: 'living', name: '생활비', icon: Home, color: '#eab308', bgColor: 'bg-yellow-500/20' },
  { id: 'shopping', name: '쇼핑', icon: ShoppingBag, color: '#22c55e', bgColor: 'bg-green-500/20' },
  { id: 'medical', name: '의료비', icon: Heart, color: '#ec4899', bgColor: 'bg-pink-500/20' },
  { id: 'education', name: '교육비', icon: GraduationCap, color: '#8b5cf6', bgColor: 'bg-violet-500/20' },
  { id: 'leisure', name: '여가/문화', icon: Gamepad2, color: '#06b6d4', bgColor: 'bg-cyan-500/20' },
  { id: 'utilities', name: '공과금', icon: Zap, color: '#6366f1', bgColor: 'bg-indigo-500/20' },
  { id: 'savings', name: '저축/투자', icon: Wallet, color: '#10b981', bgColor: 'bg-emerald-500/20' },
  { id: 'salary', name: '월급여', icon: DollarSign, color: '#3b82f6', bgColor: 'bg-blue-500/20' },
  { id: 'tech_income', name: '재테크', icon: TrendingUp, color: '#f59e0b', bgColor: 'bg-amber-500/20' },
  { id: 'other', name: '기타', icon: MoreHorizontal, color: '#6b7280', bgColor: 'bg-gray-500/20' }
]

const getCategoryById = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1]

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
    date: new Date().toISOString().split('T')[0],
    category: 'other'
  })

  // 카테고리별 통계 모달 상태
  const [showCategoryStatsModal, setShowCategoryStatsModal] = useState(false)
  const [categoryStatsCurrency, setCategoryStatsCurrency] = useState(null)
  const [categoryStatsYear, setCategoryStatsYear] = useState(new Date().getFullYear())
  const [categoryStatsMonth, setCategoryStatsMonth] = useState(new Date().getMonth() + 1)

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
        if (marketData.currency?.vndKrw?.rate) {
          setExchangeRates(prev => ({
            ...prev,
            vndToKrw: marketData.currency.vndKrw.rate
          }))
        }
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
      category: formData.category || 'other',
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
        date: new Date().toISOString().split('T')[0],
        category: formData.category // 카테고리는 유지
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
      category: formData.category || 'other',
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
      date: new Date().toISOString().split('T')[0],
      category: 'other'
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
      date: transaction.date,
      category: transaction.category || 'other'
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
      date: new Date().toISOString().split('T')[0],
      category: 'other'
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

  // 카테고리별 통계 계산
  const getCategoryStats = useCallback((transactions, currency, targetYear = new Date().getFullYear(), targetMonth = new Date().getMonth() + 1) => {
    // 당월 거래만 필터링
    const monthlyTx = transactions.filter(tx => {
      const txDate = new Date(tx.date)
      return txDate.getFullYear() === targetYear && (txDate.getMonth() + 1) === targetMonth
    })

    // 카테고리별 집계
    const categoryTotals = {}
    CATEGORIES.forEach(cat => {
      categoryTotals[cat.id] = { ...cat, total: 0, count: 0 }
    })

    let totalIncome = 0
    let totalExpense = 0

    monthlyTx.forEach(tx => {
      const catId = tx.category || 'other'
      const amount = Number(tx.amount || 0)
      
      let expenseAmt = 0

      if (catId === 'tech_income' || catId === 'salary') {
        if (amount > 0) {
          totalIncome += amount
        } else {
          totalExpense += Math.abs(amount)
          expenseAmt = Math.abs(amount)
        }
      } else {
        totalExpense += amount
        expenseAmt = amount
      }

      if (categoryTotals[catId]) {
        // UI 리스트용으로 합계 누적 (tech_income, salary는 총액(+,- 혼합) 그대로 표출)
        if (catId === 'tech_income' || catId === 'salary') {
          categoryTotals[catId].total += amount
        } else {
          categoryTotals[catId].total += expenseAmt
        }
        categoryTotals[catId].count += 1
      }
    })

    const totalAmount = totalExpense // 하위 호환성 (지출 차트용)

    // 원화 환산
    let totalKRW = totalExpense
    let totalIncomeKRW = totalIncome

    if (currency === 'VND') {
      totalKRW = totalExpense * exchangeRates.vndToKrw
      totalIncomeKRW = totalIncome * exchangeRates.vndToKrw
    } else if (currency === 'USD') {
      totalKRW = totalExpense * exchangeRates.usdToKrw
      totalIncomeKRW = totalIncome * exchangeRates.usdToKrw
    }

    // 차트용 데이터 (수익이 아닌 지출 항목만)
    const chartData = Object.values(categoryTotals)
      .filter(c => {
        if (c.id === 'tech_income' || c.id === 'salary') return c.total < 0
        return c.total > 0
      })
      .map(c => {
        const value = Math.abs(c.total)
        return {
          name: c.name,
          value,
          color: c.color,
          percent: totalAmount > 0 ? ((value / totalAmount) * 100).toFixed(1) : 0
        }
      })
      .sort((a, b) => b.value - a.value)

    const displayCategories = Object.values(categoryTotals)
      .filter(c => c.total !== 0) // 금액이 있는 모든 카테고리
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

    // 월별 차트 데이터 (최근 6개월)
    const monthlyChartData = []
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(targetYear, targetMonth - 1 - i, 1)
      const loopYear = targetDate.getFullYear()
      const loopMonth = targetDate.getMonth() + 1

      const monthTx = transactions.filter(tx => {
        const txDate = new Date(tx.date)
        return txDate.getFullYear() === loopYear && (txDate.getMonth() + 1) === loopMonth
      })

      const monthTotal = monthTx.reduce((sum, tx) => {
        const catId = tx.category || 'other'
        const amount = Number(tx.amount || 0)
        
        let expenseAmt = 0
        if (catId === 'tech_income' || catId === 'salary') {
          if (amount < 0) {
            expenseAmt = Math.abs(amount)
          }
        } else {
          expenseAmt = amount
        }
        return sum + expenseAmt
      }, 0)

      monthlyChartData.push({
        month: `${loopMonth}월`,
        amount: monthTotal,
        year: loopYear
      })
    }

    return {
      categories: displayCategories,
      totalAmount,
      totalIncome,
      totalKRW,
      totalIncomeKRW,
      count: monthlyTx.length,
      chartData,
      monthlyChartData
    }
  }, [exchangeRates])

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
    const stats = getCategoryStats(transactions, currency)
    const totalCount = transactions.length

    // 현재 년월 표시
    const now = new Date()
    const currentYearMonth = `${now.getFullYear()}년 ${now.getMonth() + 1}월`

    // 상위 3개 카테고리
    const topCategories = stats.categories.filter(c => c.total > 0).slice(0, 3)

    return (
      <div className="cyber-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-3 border-b border-cyan-500/20 gap-2">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-bold text-cyan-300">{label}</h3>
            <span className="text-xs text-cyan-400/70 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
              가계부
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { 
                setCategoryStatsCurrency(currency); 
                setCategoryStatsYear(new Date().getFullYear());
                setCategoryStatsMonth(new Date().getMonth() + 1);
                setShowCategoryStatsModal(true); 
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-fuchsia-400 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/30 rounded-lg transition-colors"
            >
              <PieChart className="w-4 h-4" />
              카테고리 분석
            </button>
            <button
              onClick={() => handleOpenAddModal(currency)}
              className="flex items-center gap-2 text-sm px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white rounded-lg hover:from-cyan-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-cyan-500/25"
            >
              <Plus className="w-4 h-4" />
              입력 추가
            </button>
          </div>
        </div>

        {/* 상단 통계 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {/* 당월 수입 */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
            <p className="text-sm font-medium text-emerald-400 mb-2">당월 수입</p>
            <p className="text-2xl font-bold text-emerald-300" style={{ textShadow: '0 0 8px rgba(16, 185, 129, 0.4)' }}>
              {formatCurrency(stats.totalIncome, currency)}
            </p>
            <p className="text-xs text-emerald-500/70 mt-1">{currentYearMonth}</p>
          </div>

          {/* 당월 지출 */}
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">
            <p className="text-sm font-medium text-rose-400 mb-2">당월 지출</p>
            <p className="text-2xl font-bold text-rose-300" style={{ textShadow: '0 0 8px rgba(244, 63, 94, 0.4)' }}>
              {formatCurrency(stats.totalAmount, currency)}
            </p>
            <p className="text-xs text-rose-500/70 mt-1">{stats.count}건 (전체)</p>
          </div>

          {/* 원화 환산 (외화일 경우) / 이력보기 (원화일 경우) */}
          {currency !== 'KRW' ? (
            <div className="bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-xl p-4">
              <p className="text-sm font-medium text-fuchsia-400 mb-2">원화 환산</p>
              <p className="text-2xl font-bold text-fuchsia-300" style={{ textShadow: '0 0 8px rgba(217, 70, 239, 0.4)' }}>
                {formatCurrency(stats.totalKRW, 'KRW')}
              </p>
              <p className="text-xs text-fuchsia-500/70 mt-1">
                환율: {currency === 'VND'
                  ? `1₫ = ₩${exchangeRates.vndToKrw.toFixed(3)}`
                  : `$1 = ₩${exchangeRates.usdToKrw.toLocaleString()}`
                }
              </p>
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
              <p className="text-sm font-medium text-emerald-400 mb-2">전체 이력</p>
              <p className="text-2xl font-bold text-emerald-300" style={{ textShadow: '0 0 8px rgba(16, 185, 129, 0.4)' }}>{totalCount}건</p>
              <button
                onClick={() => handleOpenHistoryModal(currency)}
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 mt-2"
              >
                <Eye className="w-3 h-3" />
                🔍 이력 보기
              </button>
            </div>
          )}

          {/* 이력 보기 (외화) / 공백 (원화) */}
          {currency !== 'KRW' ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
              <p className="text-sm font-medium text-emerald-400 mb-2">전체 이력</p>
              <p className="text-2xl font-bold text-emerald-300" style={{ textShadow: '0 0 8px rgba(16, 185, 129, 0.4)' }}>{totalCount}건</p>
              <button
                onClick={() => handleOpenHistoryModal(currency)}
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 mt-2"
              >
                <Eye className="w-3 h-3" />
                🔍 이력 보기
              </button>
            </div>
          ) : (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center justify-center">
              <p className="text-sm text-slate-500">원화는 환율 적용 없음</p>
            </div>
          )}
        </div>

        {/* 카테고리별 지출 미리보기 */}
        {topCategories.length > 0 && (
          <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <p className="text-sm font-semibold text-cyan-300/80">카테고리별 지출 ({currentYearMonth})</p>
              </div>
              <button
                onClick={() => { 
                  setCategoryStatsCurrency(currency); 
                  setCategoryStatsYear(new Date().getFullYear());
                  setCategoryStatsMonth(new Date().getMonth() + 1);
                  setShowCategoryStatsModal(true); 
                }}
                className="text-xs text-fuchsia-400 hover:text-fuchsia-300"
              >
                상세보기 →
              </button>
            </div>
            <div className="space-y-2">
              {topCategories.map(cat => {
                const IconComponent = cat.icon
                const isIncomeItem = cat.id === 'tech_income' && cat.total > 0;
                const displayTotal = Math.abs(cat.total);
                
                let percent = 0;
                if (isIncomeItem) {
                  percent = stats.totalIncome > 0 ? (displayTotal / stats.totalIncome) * 100 : 0;
                } else {
                  percent = stats.totalAmount > 0 ? (displayTotal / stats.totalAmount) * 100 : 0;
                }

                return (
                  <div key={cat.id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${cat.bgColor} flex items-center justify-center`}>
                      <IconComponent className="w-4 h-4" style={{ color: cat.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
                          {cat.name}
                          {isIncomeItem && <span className="text-[10px] text-emerald-400 bg-emerald-900/40 px-1 py-0.5 rounded">수익</span>}
                        </span>
                        <span className={`text-sm font-bold ${isIncomeItem ? 'text-emerald-400' : 'text-gray-200'}`}>
                          {isIncomeItem ? '+' : ''}{formatCurrency(cat.total, currency)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-700/50 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: isIncomeItem ? '#10b981' : cat.color }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">{percent.toFixed(0)}%</span>
                  </div>
                )
              })}
            </div>
            {stats.categories.filter(c => c.total > 0).length > 3 && (
              <p className="text-xs text-slate-500 mt-2 text-center">
                +{stats.categories.filter(c => c.total > 0).length - 3}개 카테고리 더보기
              </p>
            )}
          </div>
        )}

        {/* 거래 내역이 없을 때 */}
        {stats.count === 0 && (
          <div className="bg-slate-800/40 rounded-xl p-6 text-center border border-slate-700/50">
            <Receipt className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">{currentYearMonth} 거래 내역이 없습니다</p>
            <button
              onClick={() => handleOpenAddModal(currency)}
              className="mt-3 text-sm text-cyan-400 hover:text-cyan-300"
            >
              첫 거래 추가하기 →
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="cyber-dashboard min-h-screen p-4 sm:p-6 relative">
      {/* Header - Cyberpunk Style */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-lg">
            <Receipt className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold neon-text-cyan">입금 및 출금 자동계산</h2>
            <p className="text-sm text-cyan-300/60">화폐별 입력 및 누적 관리 (환율 자동 적용)</p>
          </div>
        </div>
      </div>

      {/* 환율 계산기 */}
      <div className="cyber-card cyber-card-glow">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-cyan-400/30">
          <Calculator className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-bold text-cyan-400">환율 계산기</h3>
          <span className="text-xs text-cyan-300 bg-cyan-500/20 px-2 py-1 rounded-full ml-2">
            실시간 환율 적용
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 입력 영역 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-cyan-300/80 mb-2">
                기준 통화 선택
              </label>
              <div className="flex gap-2">
                {['KRW', 'USD', 'VND'].map(currency => (
                  <button
                    key={currency}
                    onClick={() => setCalcFromCurrency(currency)}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-semibold transition-all ${calcFromCurrency === currency
                      ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white shadow-lg'
                      : 'bg-slate-800/50 text-cyan-300 border border-cyan-400/30 hover:border-cyan-400'
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
              <label className="block text-sm font-medium text-cyan-300/80 mb-2">
                금액 입력
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(e.target.value)}
                  placeholder="금액을 입력하세요"
                  className="w-full px-4 py-3 text-lg font-semibold bg-slate-800/80 border border-cyan-500/30 rounded-xl text-cyan-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-400/60 font-medium">
                  {calcFromCurrency === 'KRW' && '₩'}
                  {calcFromCurrency === 'USD' && '$'}
                  {calcFromCurrency === 'VND' && '₫'}
                </span>
              </div>
            </div>

            {/* 현재 환율 정보 */}
            <div className="bg-slate-800/60 rounded-xl p-4 border border-cyan-500/20">
              <div className="flex items-center gap-2 mb-3">
                <RefreshCw className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-cyan-300/80">현재 적용 환율</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">USD/KRW:</span>
                  <span className="font-semibold text-cyan-300">₩{exchangeRates.usdToKrw.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">VND/KRW:</span>
                  <span className="font-semibold text-cyan-300">₩{exchangeRates.vndToKrw.toFixed(4)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 환산 결과 영역 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <ArrowRightLeft className="w-4 h-4 text-fuchsia-400" />
              <span className="text-sm font-medium text-fuchsia-300/80">환산 결과</span>
            </div>

            {/* KRW 결과 */}
            <div className={`p-4 rounded-xl border transition-all ${calcFromCurrency === 'KRW'
              ? 'bg-indigo-500/15 border-indigo-400/40'
              : 'bg-slate-800/50 border-slate-700/50 hover:border-indigo-400/30'
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🇰🇷</span>
                  <span className="font-medium text-gray-300">원화 (KRW)</span>
                </div>
                <span className={`text-xl font-bold ${calcFromCurrency === 'KRW' ? 'text-indigo-300' : 'text-gray-200'}`} style={calcFromCurrency === 'KRW' ? { textShadow: '0 0 8px rgba(129, 140, 248, 0.5)' } : {}}>
                  ₩{calculatedRates.krw.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>

            {/* USD 결과 */}
            <div className={`p-4 rounded-xl border transition-all ${calcFromCurrency === 'USD'
              ? 'bg-emerald-500/15 border-emerald-400/40'
              : 'bg-slate-800/50 border-slate-700/50 hover:border-emerald-400/30'
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🇺🇸</span>
                  <span className="font-medium text-gray-300">달러 (USD)</span>
                </div>
                <span className={`text-xl font-bold ${calcFromCurrency === 'USD' ? 'text-emerald-300' : 'text-gray-200'}`} style={calcFromCurrency === 'USD' ? { textShadow: '0 0 8px rgba(52, 211, 153, 0.5)' } : {}}>
                  ${calculatedRates.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* VND 결과 */}
            <div className={`p-4 rounded-xl border transition-all ${calcFromCurrency === 'VND'
              ? 'bg-rose-500/15 border-rose-400/40'
              : 'bg-slate-800/50 border-slate-700/50 hover:border-rose-400/30'
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🇻🇳</span>
                  <span className="font-medium text-gray-300">동 (VND)</span>
                </div>
                <span className={`text-xl font-bold ${calcFromCurrency === 'VND' ? 'text-rose-300' : 'text-gray-200'}`} style={calcFromCurrency === 'VND' ? { textShadow: '0 0 8px rgba(251, 113, 133, 0.5)' } : {}}>
                  ₫{calculatedRates.vnd.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 통화 섹션 + 배당금 섹션: 2열 그리드 배치 (모바일은 1열) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
        <div className="cyber-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-3 border-b border-emerald-500/30 gap-3">
            <div className="flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-emerald-300">배당금 입력</h3>
              <span className="text-xs text-emerald-400/70 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                실제 배당금 기록
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-800/80 border border-emerald-500/30 rounded-lg px-2 py-1">
                <button
                  onClick={handleDividendPreviousMonth}
                  className="p-1 hover:bg-emerald-500/20 rounded transition-colors"
                  title="이전 달"
                >
                  <ChevronLeft className="w-4 h-4 text-emerald-400" />
                </button>
                <select
                  value={dividendSelectedYear}
                  onChange={(e) => setDividendSelectedYear(Number(e.target.value))}
                  className="text-sm font-semibold text-emerald-300 bg-transparent focus:outline-none cursor-pointer"
                >
                  {dividendAvailableYears.map(year => (
                    <option key={year} value={year} className="bg-slate-900 text-emerald-300">{year}년</option>
                  ))}
                </select>
                <select
                  value={dividendSelectedMonth}
                  onChange={(e) => setDividendSelectedMonth(Number(e.target.value))}
                  className="text-sm font-semibold text-emerald-300 bg-transparent focus:outline-none cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                    <option key={month} value={month} className="bg-slate-900 text-emerald-300">{month}월</option>
                  ))}
                </select>
                <button
                  onClick={handleDividendNextMonth}
                  className="p-1 hover:bg-emerald-500/20 rounded transition-colors"
                  title="다음 달"
                >
                  <ChevronRight className="w-4 h-4 text-emerald-400" />
                </button>
              </div>
              <button
                onClick={handleOpenDividendModal}
                className="flex items-center gap-2 text-sm px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-400 hover:to-teal-400 transition-all shadow-lg shadow-emerald-500/25"
              >
                <Plus className="w-4 h-4" />
                배당금 추가
              </button>
            </div>
          </div>

          {/* 상단 통계 카드 - 클릭 시 상세 내역 모달 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {/* 선택월 배당금 */}
            <button
              onClick={() => { setDividendDetailType('monthly'); setShowDividendDetailModal(true); }}
              className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-left hover:border-emerald-400/50 hover:bg-emerald-500/15 transition-all cursor-pointer"
            >
              <p className="text-sm font-medium text-emerald-400 mb-2">{dividendSelectedMonth}월 배당금</p>
              <p className="text-2xl font-bold text-emerald-300" style={{ textShadow: '0 0 8px rgba(16, 185, 129, 0.4)' }}>
                {formatCurrency(dividendStats.monthlyTotal, 'KRW')}
              </p>
              <p className="text-xs text-emerald-500/70 mt-1 flex items-center gap-1">
                {dividendSelectedYear}년 {dividendSelectedMonth}월
                <Eye className="w-3 h-3 ml-auto" />
              </p>
            </button>

            {/* 연간 배당금 */}
            <button
              onClick={() => { setDividendDetailType('yearly'); setShowDividendDetailModal(true); }}
              className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-4 text-left hover:border-teal-400/50 hover:bg-teal-500/15 transition-all cursor-pointer"
            >
              <p className="text-sm font-medium text-teal-400 mb-2">{dividendSelectedYear}년 배당금</p>
              <p className="text-2xl font-bold text-teal-300" style={{ textShadow: '0 0 8px rgba(20, 184, 166, 0.4)' }}>
                {formatCurrency(dividendStats.yearlyTotal, 'KRW')}
              </p>
              <p className="text-xs text-teal-500/70 mt-1 flex items-center gap-1">
                {dividendSelectedYear}년 • {dividendStats.yearlyCount}건
                <Eye className="w-3 h-3 ml-auto" />
              </p>
            </button>

            {/* 종목별 배당금 */}
            <button
              onClick={() => { setDividendDetailType('bySymbol'); setShowDividendDetailModal(true); }}
              className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 text-left hover:border-cyan-400/50 hover:bg-cyan-500/15 transition-all cursor-pointer"
            >
              <p className="text-sm font-medium text-cyan-400 mb-2">{dividendSelectedYear}년 종목별</p>
              <p className="text-2xl font-bold text-cyan-300" style={{ textShadow: '0 0 8px rgba(6, 182, 212, 0.4)' }}>
                {dividendStats.bySymbol.length}종목
              </p>
              <p className="text-xs text-cyan-500/70 mt-1 flex items-center gap-1">
                월평궪 {formatCurrency(dividendStats.monthlyAvg, 'KRW')}
                <Eye className="w-3 h-3 ml-auto" />
              </p>
            </button>
          </div>

          {/* 월별 배당금 차트 */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-300/80">{dividendSelectedYear}년 월별 배당금</p>
              <span className="text-xs text-emerald-400/70 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {dividendSelectedMonth}월 선택중
              </span>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dividendStats.monthlyChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                    tickFormatter={(value) => value >= 10000 ? `${(value / 10000).toFixed(0)}만` : value.toLocaleString()}
                  />
                  <Tooltip
                    formatter={(value) => [`₩${value.toLocaleString()}`, '배당금']}
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }}
                  />
                  <Bar
                    dataKey="amount"
                    radius={[4, 4, 0, 0]}
                    fill="#10b981"
                    shape={(props) => {
                      const { x, y, width, height, payload } = props
                      const isSelected = payload.monthNum === dividendSelectedMonth
                      return (
                        <rect
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill={isSelected ? '#34d399' : '#10b981'}
                          rx={4}
                          ry={4}
                          stroke={isSelected ? '#6ee7b7' : 'none'}
                          strokeWidth={isSelected ? 2 : 0}
                        />
                      )
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {dividendStats.yearlyCount === 0 && (
              <p className="text-center text-slate-500 text-sm mt-2">{dividendSelectedYear}년 배당금 내역이 없습니다</p>
            )}
          </div>

          {/* 보유 종목이 없을 때 안내 */}
          {portfolioAssets.length === 0 && (
            <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <p className="text-sm text-amber-300">
                💡 포트폴리오에 자산을 먼저 추가하면 드롭다운에서 종목을 선택할 수 있습니다.
              </p>
            </div>
          )}
        </div>
      </div> {/* 2열 그리드 닫기 */}

      {/* 배당금 상세 내역 모달 */}
      {showDividendDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl shadow-cyan-500/10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-bold text-cyan-300">
                {dividendDetailType === 'monthly' && `${dividendSelectedYear}년 ${dividendSelectedMonth}월 배당금 내역`}
                {dividendDetailType === 'yearly' && `${dividendSelectedYear}년 배당금 내역`}
                {dividendDetailType === 'bySymbol' && `${dividendSelectedYear}년 종목별 배당금 현황`}
              </h3>
              <button onClick={() => setShowDividendDetailModal(false)} className="text-slate-400 hover:text-cyan-400">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {dividendDetailType === 'bySymbol' ? (
                <div className="space-y-2">
                  {dividendStats.bySymbol.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">{dividendSelectedYear}년 배당금 내역이 없습니다</p>
                  ) : (
                    dividendStats.bySymbol.map(item => (
                      <div key={item.symbol} className="flex items-center justify-between bg-slate-800/60 rounded-lg px-4 py-3 border border-slate-700/50">
                        <div>
                          <span className="font-semibold text-gray-200">{item.symbol}</span>
                          <span className="text-xs text-slate-500 ml-2">{item.count}건</span>
                        </div>
                        <span className="text-emerald-400 font-bold">{formatCurrency(item.total, 'KRW')}</span>
                      </div>
                    ))
                  )}
                </div>
              ) : (
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
                        <p className="text-center text-slate-500 py-8">
                          {dividendDetailType === 'monthly'
                            ? `${dividendSelectedYear}년 ${dividendSelectedMonth}월 배당금 내역이 없습니다`
                            : `${dividendSelectedYear}년 배당금 내역이 없습니다`}
                        </p>
                      )
                    }

                    return filteredDividends.map(d => (
                      <div key={d.id} className="flex items-center justify-between p-3 bg-slate-800/60 rounded-lg hover:bg-slate-800 border border-slate-700/50">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-200">{d.symbol}</span>
                            <span className="text-xs text-slate-500">{new Date(d.date).toLocaleDateString('ko-KR')}</span>
                          </div>
                          {d.description && <p className="text-xs text-slate-500 mt-1">{d.description}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-400">
                            {d.currency === 'USD' ? `$${d.amount.toLocaleString()}` : `₩${d.amount.toLocaleString()}`}
                          </span>
                          <button onClick={() => { handleOpenEditDividendModal(d); setShowDividendDetailModal(false); }} className="p-1 text-cyan-400 hover:bg-cyan-500/20 rounded">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteDividend(d.id)} className="p-1 text-rose-400 hover:bg-rose-500/20 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/50 rounded-b-2xl">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">
                  {dividendDetailType === 'bySymbol'
                    ? `${dividendSelectedYear}년 총 ${dividendStats.bySymbol.length}개 종목`
                    : dividendDetailType === 'monthly'
                      ? `${dividendSelectedYear}년 ${dividendSelectedMonth}월`
                      : `${dividendSelectedYear}년 총 ${dividendStats.yearlyCount}건`}
                </span>
                <button onClick={() => setShowDividendDetailModal(false)} className="px-4 py-2 bg-slate-700 text-cyan-300 rounded-lg hover:bg-slate-600 transition-colors">
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
          <div className="bg-slate-900 border border-emerald-500/30 rounded-lg max-w-md w-full p-6 shadow-2xl shadow-emerald-500/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-emerald-300">
                {editingDividend ? '배당금 수정' : '배당금 추가'}
              </h3>
              <button onClick={handleCloseDividendModal} className="text-slate-400 hover:text-cyan-400">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cyan-300/80 mb-2">종목 선택</label>
                {portfolioAssets.length > 0 ? (
                  <select
                    value={dividendFormData.symbol}
                    onChange={(e) => setDividendFormData(prev => ({ ...prev, symbol: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400"
                  >
                    {portfolioAssets.map(asset => (
                      <option key={asset.id} value={asset.symbol}>{asset.symbol} - {asset.name || asset.symbol}</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" value={dividendFormData.symbol}
                    onChange={(e) => setDividendFormData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                    placeholder="종목 심볼 입력 (예: AAPL)"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-gray-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-cyan-300/80 mb-2">통화</label>
                <div className="flex gap-2">
                  {['USD', 'KRW'].map(currency => (
                    <button key={currency}
                      onClick={() => setDividendFormData(prev => ({ ...prev, currency }))}
                      className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${dividendFormData.currency === currency
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                        : 'bg-slate-800 text-slate-400 border border-slate-600 hover:border-emerald-500/50'
                        }`}
                    >
                      {currency === 'USD' ? '$ USD' : '₩ KRW'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-cyan-300/80 mb-2">배당금 ({dividendFormData.currency})</label>
                <input type="number" value={dividendFormData.amount}
                  onChange={(e) => setDividendFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="배당금 입력"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-gray-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required />
              </div>

              <div>
                <label className="block text-sm font-medium text-cyan-300/80 mb-2">입금일</label>
                <input type="date" value={dividendFormData.date}
                  onChange={(e) => setDividendFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required />
              </div>

              <div>
                <label className="block text-sm font-medium text-cyan-300/80 mb-2">메모 (선택)</label>
                <input type="text" value={dividendFormData.description}
                  onChange={(e) => setDividendFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="예: 분기배당"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-gray-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleCloseDividendModal}
                className="flex-1 px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors">
                취소
              </button>
              {!editingDividend && (
                <button onClick={() => handleAddDividend(true)}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> 추가 후 계속
                </button>
              )}
              <button onClick={editingDividend ? handleEditDividend : () => handleAddDividend(false)}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> {editingDividend ? '수정' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl shadow-cyan-500/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-cyan-300">
                {editingTransaction ? '거래 수정' : '거래 추가'} ({selectedCurrency})
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-cyan-400">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cyan-300/80 mb-2">카테고리 선택</label>
                <div className="grid grid-cols-5 gap-2">
                  {CATEGORIES.map(cat => {
                    const IconComponent = cat.icon
                    const isSelected = formData.category === cat.id
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${isSelected
                          ? 'border-cyan-400 bg-cyan-500/15'
                          : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                          }`}
                        title={cat.name}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cat.bgColor}`}>
                          <IconComponent className="w-4 h-4" style={{ color: cat.color }} />
                        </div>
                        <span className={`text-xs ${isSelected ? 'font-semibold text-cyan-300' : 'text-slate-400'}`}>
                          {cat.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cyan-300/80 mb-2">금액 ({selectedCurrency})</label>
                  <input type="number" value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="금액 입력"
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-gray-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cyan-300/80 mb-2">날짜</label>
                  <input type="date" value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-cyan-300/80 mb-2">메모 (선택)</label>
                <input type="text" value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="거래 내역 메모"
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-gray-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleCloseModal}
                className="flex-1 px-4 py-2.5 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors font-medium">
                취소
              </button>
              {!editingTransaction && (
                <button onClick={() => handleAddTransaction(true)}
                  className="flex-1 px-4 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors flex items-center justify-center gap-2 font-medium">
                  <Plus className="w-4 h-4" /> 계속 추가
                </button>
              )}
              <button onClick={editingTransaction ? handleEditTransaction : () => handleAddTransaction(false)}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white rounded-lg hover:from-cyan-400 hover:to-fuchsia-400 transition-all flex items-center justify-center gap-2 font-medium shadow-lg shadow-cyan-500/25">
                <Save className="w-4 h-4" /> {editingTransaction ? '수정' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-lg max-w-3xl w-full p-6 max-h-[85vh] overflow-y-auto shadow-2xl shadow-cyan-500/10">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-cyan-300">
                  거래 이력 ({selectedCurrency})
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  전체 {getTransactionsByCurrency(selectedCurrency).length}건의 거래
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getTransactionsByCurrency(selectedCurrency).length > 0 && (
                  <button
                    onClick={() => handleDeleteAllTransactions(selectedCurrency)}
                    className="px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-500 transition-colors flex items-center gap-1 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    전체삭제
                  </button>
                )}
                <button onClick={handleCloseModal} className="text-slate-400 hover:text-cyan-400">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* 월별 필터 */}
            <div className="bg-slate-800/60 border border-cyan-500/20 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-cyan-400" />
                  <h4 className="font-semibold text-cyan-300">월별 이력</h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePreviousMonth}
                    className="p-1.5 hover:bg-cyan-500/20 rounded-lg transition-colors"
                    title="이전 달"
                  >
                    <ChevronLeft className="w-5 h-5 text-cyan-400" />
                  </button>
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/80 border border-cyan-500/30 rounded-lg">
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="font-semibold text-cyan-300 bg-transparent focus:outline-none cursor-pointer"
                    >
                      {availableYears.length > 0 ? (
                        availableYears.map(year => (
                          <option key={year} value={year} className="bg-slate-900 text-cyan-300">{year}년</option>
                        ))
                      ) : (
                        <option value={new Date().getFullYear()} className="bg-slate-900 text-cyan-300">{new Date().getFullYear()}년</option>
                      )}
                    </select>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="font-semibold text-cyan-300 bg-transparent focus:outline-none cursor-pointer"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                        <option key={month} value={month} className="bg-slate-900 text-cyan-300">{month}월</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleNextMonth}
                    className="p-1.5 hover:bg-cyan-500/20 rounded-lg transition-colors"
                    title="다음 달"
                  >
                    <ChevronRight className="w-5 h-5 text-cyan-400" />
                  </button>
                </div>
              </div>

              {/* 월별 통계 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-cyan-500/10 rounded-lg p-3 border border-cyan-500/20">
                  <p className="text-xs text-cyan-400/70 mb-1">거래 건수</p>
                  <p className="text-lg font-bold text-cyan-300">{getMonthlyStats.count}건</p>
                </div>
                <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
                  <p className="text-xs text-emerald-400/70 mb-1">합계</p>
                  <p className="text-lg font-bold text-emerald-300">
                    {formatCurrency(getMonthlyStats.totalAmount, selectedCurrency)}
                  </p>
                </div>
                {selectedCurrency !== 'KRW' && (
                  <div className="bg-fuchsia-500/10 rounded-lg p-3 border border-fuchsia-500/20">
                    <p className="text-xs text-fuchsia-400/70 mb-1">원화 환산</p>
                    <p className="text-lg font-bold text-fuchsia-300">
                      {formatCurrency(getMonthlyStats.totalKRW, 'KRW')}
                    </p>
                  </div>
                )}
                {selectedCurrency === 'KRW' && (
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 flex items-center justify-center">
                    <p className="text-xs text-slate-500">환율 적용 없음</p>
                  </div>
                )}
              </div>
            </div>

            {/* 월별 거래 내역 리스트 */}
            <div className="space-y-3">
              {getFilteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  {selectedYear}년 {selectedMonth}월에 등록된 거래 이력이 없습니다.
                </div>
              ) : (
                getFilteredTransactions
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((transaction) => {
                    const category = getCategoryById(transaction.category)
                    const CategoryIcon = category.icon
                    return (
                      <div
                        key={transaction.id}
                        className="flex items-center gap-3 p-4 bg-slate-800/60 rounded-lg hover:bg-slate-800 transition-colors border border-slate-700/50"
                      >
                        <div className={`w-10 h-10 rounded-xl ${category.bgColor} flex items-center justify-center flex-shrink-0`}>
                          <CategoryIcon className="w-5 h-5" style={{ color: category.color }} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${category.color}20`, color: category.color }}>
                              {category.name}
                            </span>
                            <span className="text-xs text-slate-500">
                              {new Date(transaction.date).toLocaleDateString('ko-KR')}
                            </span>
                          </div>
                          {transaction.description && (
                            <p className="text-sm text-slate-400 mt-1 truncate">{transaction.description}</p>
                          )}
                          {selectedCurrency !== 'KRW' && (
                            <p className="text-xs text-fuchsia-400 mt-0.5">
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
                          <p className="text-lg font-bold text-gray-200 whitespace-nowrap">
                            {formatCurrency(transaction.amount, selectedCurrency)}
                          </p>
                          <button
                            onClick={() => handleOpenEditModal(transaction, selectedCurrency)}
                            className="p-2 text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition-colors"
                            title="수정"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(transaction.id, selectedCurrency)}
                            className="p-2 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Category Stats Modal */}
      {showCategoryStatsModal && categoryStatsCurrency && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-fuchsia-500/30 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl shadow-fuchsia-500/10">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-fuchsia-500/15 rounded-lg border border-fuchsia-500/30">
                  <PieChart className="w-5 h-5 text-fuchsia-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-fuchsia-300">
                    카테고리 분석 ({categoryStatsCurrency})
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => {
                        if (categoryStatsMonth === 1) {
                          setCategoryStatsMonth(12)
                          setCategoryStatsYear(y => y - 1)
                        } else {
                          setCategoryStatsMonth(m => m - 1)
                        }
                      }}
                      className="p-1 hover:bg-fuchsia-500/20 rounded-lg transition-colors group"
                      title="이전 달"
                    >
                      <ChevronLeft className="w-4 h-4 text-fuchsia-400 group-hover:text-fuchsia-300" />
                    </button>
                    <span className="text-sm font-medium text-slate-300">
                      {categoryStatsYear}년 {categoryStatsMonth}월 지출 현황
                    </span>
                    <button
                      onClick={() => {
                        if (categoryStatsMonth === 12) {
                          setCategoryStatsMonth(1)
                          setCategoryStatsYear(y => y + 1)
                        } else {
                          setCategoryStatsMonth(m => m + 1)
                        }
                      }}
                      className="p-1 hover:bg-fuchsia-500/20 rounded-lg transition-colors group"
                      title="다음 달"
                    >
                      <ChevronRight className="w-4 h-4 text-fuchsia-400 group-hover:text-fuchsia-300" />
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowCategoryStatsModal(false)}
                className="text-slate-400 hover:text-fuchsia-400"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                const transactions = getTransactionsByCurrency(categoryStatsCurrency)
                const stats = getCategoryStats(transactions, categoryStatsCurrency, categoryStatsYear, categoryStatsMonth)

                return (
                  <div className="space-y-6">
                    {/* 상단 요약 카드 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-cyan-600 to-cyan-800 rounded-xl p-4 text-white shadow-lg shadow-cyan-500/20">
                        <p className="text-cyan-200 text-sm mb-1">당월 총 지출</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(stats.totalAmount, categoryStatsCurrency)}
                        </p>
                        <p className="text-cyan-200 text-xs mt-1">{stats.count}건의 거래</p>
                      </div>
                      {categoryStatsCurrency !== 'KRW' && (
                        <div className="bg-gradient-to-br from-fuchsia-600 to-fuchsia-800 rounded-xl p-4 text-white shadow-lg shadow-fuchsia-500/20">
                          <p className="text-fuchsia-200 text-sm mb-1">원화 환산</p>
                          <p className="text-2xl font-bold">{formatCurrency(stats.totalKRW, 'KRW')}</p>
                          <p className="text-fuchsia-200 text-xs mt-1">
                            환율: {categoryStatsCurrency === 'VND'
                              ? `1₫ = ₩${exchangeRates.vndToKrw.toFixed(3)}`
                              : `$1 = ₩${exchangeRates.usdToKrw.toLocaleString()}`}
                          </p>
                        </div>
                      )}
                      <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-xl p-4 text-white shadow-lg shadow-emerald-500/20">
                        <p className="text-emerald-200 text-sm mb-1">카테고리 수</p>
                        <p className="text-2xl font-bold">{stats.chartData.length}개</p>
                        <p className="text-emerald-200 text-xs mt-1">활성 카테고리</p>
                      </div>
                    </div>

                    {/* 차트 영역 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
                        <h4 className="font-semibold text-cyan-300/80 mb-4 flex items-center gap-2">
                          <PieChart className="w-4 h-4 text-fuchsia-400" />
                          카테고리별 지출 비율
                        </h4>
                        {stats.chartData.length > 0 ? (
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsPie>
                                <Pie
                                  data={stats.chartData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={50}
                                  outerRadius={80}
                                  paddingAngle={2}
                                  dataKey="value"
                                  label={({ name, percent }) => `${name} ${percent}%`}
                                  labelLine={false}
                                >
                                  {stats.chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  formatter={(value) => formatCurrency(value, categoryStatsCurrency)}
                                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }}
                                />
                              </RechartsPie>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="h-64 flex items-center justify-center text-slate-500">
                            데이터가 없습니다
                          </div>
                        )}
                      </div>

                      <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
                        <h4 className="font-semibold text-cyan-300/80 mb-4 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-emerald-400" />
                          최근 6개월 지출 추이
                        </h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.monthlyChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                              <XAxis
                                dataKey="month"
                                tick={{ fontSize: 12, fill: '#94a3b8' }}
                                tickLine={false}
                                axisLine={{ stroke: '#334155' }}
                              />
                              <YAxis
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                tickLine={false}
                                axisLine={{ stroke: '#334155' }}
                                tickFormatter={(value) => {
                                  if (categoryStatsCurrency === 'KRW') {
                                    return value >= 10000 ? `${(value / 10000).toFixed(0)}만` : value.toLocaleString()
                                  }
                                  return value.toLocaleString()
                                }}
                              />
                              <Tooltip
                                formatter={(value) => [formatCurrency(value, categoryStatsCurrency), '지출']}
                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }}
                              />
                              <Bar
                                dataKey="amount"
                                fill="#6366f1"
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* 카테고리별 상세 목록 */}
                    <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
                      <h4 className="font-semibold text-cyan-300/80 mb-4">카테고리별 상세 내역</h4>
                      <div className="space-y-3">
                        {stats.categories.map(cat => {
                          const IconComponent = cat.icon
                          const isIncomeItem = (cat.id === 'tech_income' || cat.id === 'salary') && cat.total > 0;
                          const displayTotal = Math.abs(cat.total);

                          let percent = 0;
                          if (isIncomeItem) {
                            percent = stats.totalIncome > 0 ? (displayTotal / stats.totalIncome) * 100 : 0;
                          } else {
                            percent = stats.totalAmount > 0 ? (displayTotal / stats.totalAmount) * 100 : 0;
                          }

                          return (
                            <div key={cat.id} className="flex items-center gap-4 p-3 bg-slate-900/60 rounded-xl hover:bg-slate-900 transition-colors border border-slate-700/30">
                              <div className={`w-12 h-12 rounded-xl ${cat.bgColor} flex items-center justify-center`}>
                                <IconComponent className="w-6 h-6" style={{ color: cat.color }} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <span className="font-semibold text-gray-200 flex items-center gap-2">
                                      {cat.name}
                                      {isIncomeItem && <span className="text-[10px] text-emerald-400 bg-emerald-900/40 px-1 py-0.5 rounded">수익</span>}
                                    </span>
                                    <span className="text-xs text-slate-500">{cat.count}건</span>
                                  </div>
                                  <span className={`font-bold ${isIncomeItem ? 'text-emerald-400' : 'text-gray-200'}`}>
                                    {isIncomeItem ? '+' : ''}{formatCurrency(cat.total, categoryStatsCurrency)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-slate-700/50 rounded-full h-2">
                                    <div
                                      className="h-2 rounded-full transition-all duration-500"
                                      style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: isIncomeItem ? '#10b981' : cat.color }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium text-slate-400 w-14 text-right">
                                    {percent.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/50 rounded-b-2xl">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowCategoryStatsModal(false)}
                  className="px-6 py-2 bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white rounded-lg hover:from-fuchsia-400 hover:to-cyan-400 transition-all font-medium shadow-lg shadow-fuchsia-500/25"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Guide */}
      <div className="cyber-card">
        <div className="flex items-start gap-3">
          <Receipt className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-slate-300">
            <p className="font-semibold mb-2 text-cyan-300">사용 방법:</p>
            <ul className="space-y-1 list-disc list-inside text-slate-400">
              <li>"입력 추가" 버튼을 클릭하여 새로운 거래를 등록합니다</li>
              <li>카테고리를 선택하여 지출을 분류할 수 있습니다</li>
              <li>"카테고리 분석" 버튼으로 지출 현황을 차트로 확인합니다</li>
              <li>VND와 USD는 현재 환율을 적용하여 원화로 환산합니다</li>
              <li>환율은 5분마다 자동으로 업데이트됩니다</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TransactionHistory
