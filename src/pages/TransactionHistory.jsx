import { useState, useEffect, useCallback } from 'react'
import {
  Receipt,
  Plus,
  Eye,
  Edit,
  Trash2,
  X,
  Save,
  DollarSign
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

  // Calculate cumulative sum
  const calculateCumulative = (transactions) => {
    return transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
  }

  // Calculate cumulative sum in KRW
  const calculateCumulativeKRW = (transactions, currency) => {
    const sum = calculateCumulative(transactions)
    if (currency === 'VND') {
      return sum * exchangeRates.vndToKrw
    } else if (currency === 'USD') {
      return sum * exchangeRates.usdToKrw
    }
    return sum
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
  const handleAddTransaction = () => {
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
    handleCloseModal()
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

  // Currency section component
  const CurrencySection = ({ currency, label, transactions }) => {
    const cumulative = calculateCumulative(transactions)
    const cumulativeKRW = calculateCumulativeKRW(transactions, currency)

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
              {formatCurrency(cumulative, currency)}
            </p>
            <p className="text-xs text-blue-600 mt-1">{transactions.length}건의 거래</p>
          </div>

          {/* 누적합산 */}
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
            <p className="text-sm font-medium text-green-700 mb-2">누적합산</p>
            <p className="text-2xl font-bold text-green-900">
              {formatCurrency(cumulative, currency)}
            </p>
            <button
              onClick={() => handleOpenHistoryModal(currency)}
              className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 mt-2"
            >
              <Eye className="w-3 h-3" />
              이력 보기
            </button>
          </div>

          {/* 누적합산 (원화환율적용) */}
          {currency !== 'KRW' && (
            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
              <p className="text-sm font-medium text-purple-700 mb-2">누적합산 (원화환율적용)</p>
              <p className="text-2xl font-bold text-purple-900">
                {formatCurrency(cumulativeKRW, 'KRW')}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                환율: {currency === 'VND'
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
              <button
                onClick={editingTransaction ? handleEditTransaction : handleAddTransaction}
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
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                거래 이력 ({selectedCurrency})
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3">
              {getTransactionsByCurrency(selectedCurrency).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  등록된 거래 이력이 없습니다.
                </div>
              ) : (
                getTransactionsByCurrency(selectedCurrency)
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
