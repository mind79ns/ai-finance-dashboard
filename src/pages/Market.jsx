import React, { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import ChartCard from '../components/ChartCard'
import StatCard from '../components/StatCard'

const Market = () => {
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Mock market data
  const marketIndices = [
    {
      name: 'S&P 500',
      symbol: '^GSPC',
      price: 5234.18,
      change: 45.23,
      changePercent: 0.87,
      isPositive: true
    },
    {
      name: 'Nasdaq',
      symbol: '^IXIC',
      price: 16341.24,
      change: 123.45,
      changePercent: 0.76,
      isPositive: true
    },
    {
      name: 'Dow Jones',
      symbol: '^DJI',
      price: 38789.34,
      change: -56.12,
      changePercent: -0.14,
      isPositive: false
    },
    {
      name: 'Gold',
      symbol: 'GC=F',
      price: 2387.50,
      change: 12.30,
      changePercent: 0.52,
      isPositive: true
    },
  ]

  const cryptocurrencies = [
    {
      name: 'Bitcoin',
      symbol: 'BTC',
      price: 67234.50,
      change: 1234.50,
      changePercent: 1.87,
      isPositive: true,
      marketCap: '1.32T'
    },
    {
      name: 'Ethereum',
      symbol: 'ETH',
      price: 3456.78,
      change: -45.23,
      changePercent: -1.29,
      isPositive: false,
      marketCap: '415B'
    },
  ]

  const currencyRates = [
    { pair: 'USD/KRW', rate: 1342.50, change: 5.20, changePercent: 0.39, isPositive: true },
    { pair: 'EUR/USD', rate: 1.0856, change: -0.0023, changePercent: -0.21, isPositive: false },
    { pair: 'USD/JPY', rate: 149.82, change: 0.45, changePercent: 0.30, isPositive: true },
  ]

  const sp500History = [
    { time: '09:30', price: 5190 },
    { time: '10:00', price: 5200 },
    { time: '11:00', price: 5195 },
    { time: '12:00', price: 5210 },
    { time: '13:00', price: 5215 },
    { time: '14:00', price: 5220 },
    { time: '15:00', price: 5234 },
  ]

  const handleRefresh = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setLastUpdate(new Date())
    }, 1000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">
            마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR')}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* Market Indices */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">주요 지수</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {marketIndices.map((index) => (
            <div key={index.symbol} className="card">
              <p className="text-sm text-gray-600 mb-1">{index.name}</p>
              <p className="text-2xl font-bold text-gray-900 mb-2">
                {index.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <div className={`flex items-center gap-1 text-sm ${
                index.isPositive ? 'text-success' : 'text-danger'
              }`}>
                {index.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span>
                  {index.isPositive ? '+' : ''}{index.change.toFixed(2)} ({index.isPositive ? '+' : ''}{index.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* S&P 500 Chart */}
      <ChartCard title="S&P 500 실시간 차트" subtitle="오늘 장중 변화">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={sp500History}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="time" stroke="#6b7280" />
            <YAxis stroke="#6b7280" domain={['dataMin - 10', 'dataMax + 10']} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Cryptocurrencies */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">암호화폐</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cryptocurrencies.map((crypto) => (
            <div key={crypto.symbol} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-600">{crypto.name}</p>
                  <p className="text-xs text-gray-500">{crypto.symbol}</p>
                </div>
                <span className="text-xs text-gray-500">시가총액: ${crypto.marketCap}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-2">
                ${crypto.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <div className={`flex items-center gap-1 text-sm ${
                crypto.isPositive ? 'text-success' : 'text-danger'
              }`}>
                {crypto.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span>
                  {crypto.isPositive ? '+' : ''}{crypto.change.toFixed(2)} ({crypto.isPositive ? '+' : ''}{crypto.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Currency Rates */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">환율</h3>
        <div className="space-y-3">
          {currencyRates.map((currency) => (
            <div key={currency.pair} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div>
                <p className="font-medium text-gray-900">{currency.pair}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{currency.rate.toFixed(2)}</p>
                <p className={`text-sm ${currency.isPositive ? 'text-success' : 'text-danger'}`}>
                  {currency.isPositive ? '+' : ''}{currency.change.toFixed(4)} ({currency.isPositive ? '+' : ''}{currency.changePercent.toFixed(2)}%)
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Market
