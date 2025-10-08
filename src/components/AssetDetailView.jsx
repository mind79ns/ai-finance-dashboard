import React, { useState, useEffect } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Percent,
  BarChart3,
  Activity,
  Clock
} from 'lucide-react'
import {
  LineChart,
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
  }, [asset])

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

      {/* 거래 내역 (임시) */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary-600" />
          <h4 className="text-lg font-semibold text-gray-900">거래 내역</h4>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">매수</p>
              <p className="text-xs text-gray-500 mt-1">2025-01-15</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {asset.quantity} @ {formatCurrency(asset.avgPrice, asset.currency)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatCurrency(asset.quantity * asset.avgPrice, asset.currency)}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center py-4">
            💡 거래 내역은 투자일지와 연동됩니다
          </p>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => alert(`${asset.symbol} 거래 추가 기능은 투자일지 페이지와 연동 예정입니다.`)}
          className="btn-secondary flex items-center justify-center gap-2"
        >
          <Calendar className="w-4 h-4" />
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
    </div>
  )
}

export default AssetDetailView
