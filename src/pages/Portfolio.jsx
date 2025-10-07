import React, { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { PlusCircle, Edit2, Trash2 } from 'lucide-react'
import ChartCard from '../components/ChartCard'

const Portfolio = () => {
  const [assets, setAssets] = useState([
    {
      id: 1,
      symbol: 'AAPL',
      name: 'Apple Inc.',
      quantity: 10,
      avgPrice: 150.00,
      currentPrice: 185.23,
      totalValue: 1852.30,
      profit: 352.30,
      profitPercent: 23.5,
      type: '주식'
    },
    {
      id: 2,
      symbol: 'SPY',
      name: 'S&P 500 ETF',
      quantity: 5,
      avgPrice: 420.00,
      currentPrice: 445.67,
      totalValue: 2228.35,
      profit: 128.35,
      profitPercent: 6.1,
      type: 'ETF'
    },
    {
      id: 3,
      symbol: 'BTC',
      name: 'Bitcoin',
      quantity: 0.1,
      avgPrice: 60000,
      currentPrice: 67234,
      totalValue: 6723.40,
      profit: 723.40,
      profitPercent: 12.1,
      type: '코인'
    },
  ])

  const performanceData = [
    { name: 'AAPL', 수익률: 23.5 },
    { name: 'SPY', 수익률: 6.1 },
    { name: 'BTC', 수익률: 12.1 },
  ]

  const totalValue = assets.reduce((sum, asset) => sum + asset.totalValue, 0)
  const totalProfit = assets.reduce((sum, asset) => sum + asset.profit, 0)
  const avgProfitPercent = (totalProfit / (totalValue - totalProfit)) * 100

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">총 평가액</p>
          <p className="text-3xl font-bold text-gray-900">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">총 수익금</p>
          <p className="text-3xl font-bold text-success">
            +${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">평균 수익률</p>
          <p className="text-3xl font-bold text-success">
            +{avgProfitPercent.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Performance Chart */}
      <ChartCard title="자산별 수익률" subtitle="현재 보유 자산 성과 비교">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Bar dataKey="수익률" fill="#10b981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Assets Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">보유 자산</h3>
            <p className="text-sm text-gray-600 mt-1">전체 {assets.length}개 자산</p>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <PlusCircle className="w-5 h-5" />
            자산 추가
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">종목</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">유형</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">보유량</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">평균단가</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">현재가</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">평가액</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">수익금</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">수익률</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">관리</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{asset.symbol}</p>
                      <p className="text-sm text-gray-600">{asset.name}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-primary-50 text-primary-700">
                      {asset.type}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right text-sm text-gray-700">
                    {asset.quantity}
                  </td>
                  <td className="py-4 px-4 text-right text-sm text-gray-700">
                    ${asset.avgPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-4 text-right text-sm text-gray-700">
                    ${asset.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-4 text-right text-sm font-medium text-gray-900">
                    ${asset.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-4 text-right text-sm">
                    <span className={asset.profit >= 0 ? 'text-success' : 'text-danger'}>
                      {asset.profit >= 0 ? '+' : ''}${asset.profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right text-sm font-medium">
                    <span className={asset.profitPercent >= 0 ? 'text-success' : 'text-danger'}>
                      {asset.profitPercent >= 0 ? '+' : ''}{asset.profitPercent.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <Edit2 className="w-4 h-4 text-gray-600" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <Trash2 className="w-4 h-4 text-danger" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Portfolio
