import { useState, useEffect } from 'react'
import dataSync from '../utils/dataSync'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Percent,
  BarChart3,
  Activity,
  Clock,
  Plus,
  X
} from 'lucide-react'
import {
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

/**
 * 전문가급 자산 상세 뷰 컴포넌트
 *
 * 표시 정보:
 * - 실시간 가격 변동 차트
 * - 수익률 분석
 * - 보유 기간 및 통계
 * - 관련 거래 내역
 */
const AssetDetailView = ({ asset, exchangeRate }) => {
  const [priceHistory, setPriceHistory] = useState([])
  const [transactionHistory, setTransactionHistory] = useState([])
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [transactionForm, setTransactionForm] = useState({
    type: 'buy',
    quantity: '',
    price: asset?.currentPrice || '',
    date: new Date().toISOString().split('T')[0],
    memo: ''
  })

  // 가격 히스토리 시뮬레이션 (실제로는 API에서 가져와야 함)
  useEffect(() => {
    if (!asset) return

    // 30일 가격 데이터 시뮬레이션
    const generatePriceHistory = () => {
      const history = []
      const basePrice = asset.avgPrice
      const currentPrice = asset.currentPrice
      const days = 30

      for (let i = 0; i < days; i++) {
        const progress = i / (days - 1)
        const price = basePrice + (currentPrice - basePrice) * progress
        const randomVariation = (Math.random() - 0.5) * (currentPrice * 0.02)

        history.push({
          date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric'
          }),
          price: price + randomVariation,
          avgPrice: basePrice
        })
      }
      return history
    }

    setPriceHistory(generatePriceHistory())

    // Load transaction history from Supabase/localStorage sync
    const loadTransactionHistory = async () => {
      try {
        const logs = await dataSync.loadInvestmentLogs()
        if (Array.isArray(logs)) {
          const assetLogs = logs.filter(log => log.asset === asset.symbol)
          setTransactionHistory(assetLogs)
        } else {
          setTransactionHistory([])
        }
      } catch (error) {
        console.error('Failed to load transaction history:', error)
      }
    }

    loadTransactionHistory()
  }, [asset])

  // 거래 추가 모달 열기
  const handleOpenTransactionModal = () => {
    setTransactionForm({
      type: 'buy',
      quantity: '',
      price: asset?.currentPrice || '',
      date: new Date().toISOString().split('T')[0],
      memo: ''
    })
    setShowTransactionModal(true)
  }

  // 거래 추가 모달 닫기
  const handleCloseTransactionModal = () => {
    setShowTransactionModal(false)
  }

  // 폼 입력 처리
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setTransactionForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // 거래 추가 제출
  const handleSubmitTransaction = async (e) => {
    e.preventDefault()

    const quantity = parseFloat(transactionForm.quantity)
    const price = parseFloat(transactionForm.price)

    if (!Number.isFinite(quantity) || !Number.isFinite(price) || quantity <= 0 || price <= 0) {
      alert('유효한 수량과 가격을 입력해주세요.')
      return
    }

    const newTransaction = {
      id: Date.now(),
      asset: asset.symbol,
      assetName: asset.name,
      type: transactionForm.type,
      quantity,
      price,
      total: quantity * price,
      date: transactionForm.date,
      memo: transactionForm.memo,
      currency: asset.currency,
      account: asset.account || '기본계좌'
    }

    const existingLogs = await dataSync.loadInvestmentLogs()
    const logs = Array.isArray(existingLogs) ? [...existingLogs, newTransaction] : [newTransaction]
    await dataSync.saveInvestmentLogs(logs)

    const portfolioAssets = await dataSync.loadPortfolioAssets()
    const assets = Array.isArray(portfolioAssets) ? portfolioAssets.map(item => ({ ...item })) : []
    const assetIndex = assets.findIndex(item => item.symbol === asset.symbol)
    let portfolioChanged = false

    if (assetIndex !== -1) {
      const currentAsset = assets[assetIndex]

      if (transactionForm.type === 'buy') {
        const totalQuantity = Number(currentAsset.quantity || 0) + quantity
        const totalCost = (Number(currentAsset.quantity || 0) * Number(currentAsset.avgPrice || 0)) + (quantity * price)
        const newAvgPrice = totalQuantity > 0 ? totalCost / totalQuantity : Number(currentAsset.avgPrice || price)

        assets[assetIndex] = {
          ...currentAsset,
          quantity: totalQuantity,
          avgPrice: newAvgPrice
        }
        portfolioChanged = true
      } else if (transactionForm.type === 'sell') {
        const newQuantity = Number(currentAsset.quantity || 0) - quantity

        if (newQuantity <= 0) {
          assets.splice(assetIndex, 1)
        } else {
          assets[assetIndex] = {
            ...currentAsset,
            quantity: newQuantity
          }
        }
        portfolioChanged = true
      }
    }

    if (portfolioChanged) {
      await dataSync.savePortfolioAssets(assets)
    }

    const assetLogs = logs.filter(log => log.asset === asset.symbol)
    setTransactionHistory(assetLogs)

    window.dispatchEvent(new Event('storage'))

    handleCloseTransactionModal()
    alert(`✅ ${transactionForm.type === 'buy' ? '매수' : '매도'} 거래가 성공적으로 추가되었습니다!`)
  }

  if (!asset) return null

  const holdingDays = 45 // 실제로는 계산 필요
  const displayCurrency = asset.currency === 'USD' ? '$' : '₩'
  const isProfit = asset.profit >= 0

  // 통화 포맷 함수
  const formatCurrency = (value, currency) => {
    if (currency === 'KRW') {
      return `₩${Math.round(value).toLocaleString('ko-KR')}`
    }
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-6">
      {/* 헤더: 종목 정보 */}
      <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl p-6 border border-primary-100">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{asset.symbol}</h3>
            <p className="text-sm text-gray-600 mt-1">{asset.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-primary-700 border border-primary-200">
              {asset.type}
            </span>
            <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-700 border border-gray-200">
              {asset.currency}
            </span>
          </div>
        </div>

        {/* 현재가 및 변동 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">현재가</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(asset.currentPrice, asset.currency)}
            </p>
            {asset.currency === 'USD' && (
              <p className="text-xs text-gray-500 mt-1">
                ≈ ₩{(asset.currentPrice * exchangeRate).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-1">수익률</p>
            <div className={`flex items-center justify-end gap-2 ${isProfit ? 'text-success' : 'text-danger'}`}>
              {isProfit ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
              <div>
                <p className="text-3xl font-bold">
                  {isProfit ? '+' : ''}{asset.profitPercent.toFixed(2)}%
                </p>
                <p className="text-sm mt-1">
                  {isProfit ? '+' : ''}{formatCurrency(asset.profit, asset.currency)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 가격 차트 */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-primary-600" />
          <h4 className="text-lg font-semibold text-gray-900">가격 추이 (30일)</h4>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={priceHistory}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
              tickFormatter={(value) => displayCurrency + value.toFixed(0)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
              formatter={(value) => [formatCurrency(value, asset.currency), '가격']}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#0ea5e9"
              strokeWidth={2}
              fill="url(#colorPrice)"
            />
            <Line
              type="monotone"
              dataKey="avgPrice"
              stroke="#f59e0b"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              name="평균 매수가"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 상세 통계 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5 text-primary-600" />
            <p className="text-sm font-medium text-gray-700">투자 정보</p>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">보유 수량</span>
              <span className="font-semibold text-gray-900">{asset.quantity}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">평균 매수가</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(asset.avgPrice, asset.currency)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">총 투자금</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(asset.quantity * asset.avgPrice, asset.currency)}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-success" />
            <p className="text-sm font-medium text-gray-700">현재 가치</p>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">평가액</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(asset.totalValue, asset.currency)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">평가 손익</span>
              <span className={`font-semibold ${isProfit ? 'text-success' : 'text-danger'}`}>
                {isProfit ? '+' : ''}{formatCurrency(asset.profit, asset.currency)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">수익률</span>
              <span className={`font-semibold ${isProfit ? 'text-success' : 'text-danger'}`}>
                {isProfit ? '+' : ''}{asset.profitPercent.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 보유 기간 */}
      <div className="card bg-gray-50">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-gray-600" />
          <p className="text-sm font-medium text-gray-700">보유 현황</p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-primary-600">{holdingDays}</p>
            <p className="text-xs text-gray-600 mt-1">보유 일수</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {((asset.profitPercent / holdingDays) * 365).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-600 mt-1">연환산 수익률</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(asset.profit / holdingDays, asset.currency)}
            </p>
            <p className="text-xs text-gray-600 mt-1">일평균 손익</p>
          </div>
        </div>
      </div>

      {/* 거래 내역 */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary-600" />
          <h4 className="text-lg font-semibold text-gray-900">거래 내역</h4>
          <span className="text-xs text-gray-500">({transactionHistory.length}건)</span>
        </div>
        {transactionHistory.length > 0 ? (
          <div className="space-y-2">
            {transactionHistory.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                      log.type === 'buy'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-success/10 text-success'
                    }`}>
                      {log.type === 'buy' ? '매수' : '매도'}
                    </span>
                    <p className="text-sm font-medium text-gray-900">{log.date}</p>
                  </div>
                  {log.note && (
                    <p className="text-xs text-gray-500 mt-1">{log.note}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {log.quantity} @ {formatCurrency(log.price, asset.currency)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    총액: {formatCurrency(log.total, asset.currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">거래 내역이 없습니다</p>
            <p className="text-xs text-gray-400 mt-1">
              투자일지에서 거래를 추가하면 자동으로 연동됩니다
            </p>
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleOpenTransactionModal}
          className="btn-primary flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          거래 추가
        </button>
        <button
          onClick={() => {
            const targetPrice = prompt(`${asset.symbol}의 목표가를 입력하세요 (현재가: $${asset.currentPrice.toFixed(2)})`, asset.currentPrice * 1.2)
            if (targetPrice) {
              const target = parseFloat(targetPrice)
              const gain = ((target - asset.currentPrice) / asset.currentPrice * 100).toFixed(2)
              alert(`✅ 목표가 설정 완료!\n\n종목: ${asset.symbol}\n목표가: $${target}\n현재가: $${asset.currentPrice.toFixed(2)}\n기대 수익률: ${gain > 0 ? '+' : ''}${gain}%\n\n💡 목표가 알림 기능은 향후 업데이트 예정입니다.`)
            }
          }}
          className="btn-secondary flex items-center justify-center gap-2"
        >
          <Percent className="w-4 h-4" />
          목표가 설정
        </button>
      </div>

      {/* 거래 추가 모달 */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">거래 추가 - {asset.symbol}</h3>
              <button
                onClick={handleCloseTransactionModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmitTransaction} className="space-y-4">
              {/* 거래 유형 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  거래 유형
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTransactionForm(prev => ({ ...prev, type: 'buy' }))}
                    className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                      transactionForm.type === 'buy'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    매수
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionForm(prev => ({ ...prev, type: 'sell' }))}
                    className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                      transactionForm.type === 'sell'
                        ? 'bg-success text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    매도
                  </button>
                </div>
              </div>

              {/* 수량 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  수량
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={transactionForm.quantity}
                  onChange={handleInputChange}
                  required
                  min="0.001"
                  step="0.001"
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* 가격 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  가격 ({asset.currency === 'USD' ? '$' : '₩'})
                </label>
                <input
                  type="number"
                  name="price"
                  value={transactionForm.price}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  현재가: {formatCurrency(asset.currentPrice, asset.currency)}
                </p>
              </div>

              {/* 거래일 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  거래일
                </label>
                <input
                  type="date"
                  name="date"
                  value={transactionForm.date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* 메모 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  메모 (선택)
                </label>
                <textarea
                  name="memo"
                  value={transactionForm.memo}
                  onChange={handleInputChange}
                  rows="2"
                  placeholder="거래 메모..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              {/* 거래 총액 미리보기 */}
              {transactionForm.quantity && transactionForm.price && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-sm text-gray-600">거래 총액</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(
                      parseFloat(transactionForm.quantity) * parseFloat(transactionForm.price),
                      asset.currency
                    )}
                  </p>
                </div>
              )}

              {/* 버튼 */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseTransactionModal}
                  className="py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors"
                >
                  추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AssetDetailView
