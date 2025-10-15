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
  ChevronRight
} from 'lucide-react'
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

  // Save transactions to localStorage
  const saveTransactions = useCallback((vnd, usd, krw) => {
    const data = { vnd, usd, krw }
    dataSync.saveUserSetting('transaction_history_v2', data).catch(error => {
      console.error('Failed to save transactions:', error)
    })
  }, [])

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
