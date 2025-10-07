import React from 'react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Wallet, TrendingUp, DollarSign, Target } from 'lucide-react'
import StatCard from '../components/StatCard'
import ChartCard from '../components/ChartCard'

const Dashboard = () => {
  // Mock data
  const portfolioData = [
    { month: '1월', value: 10000 },
    { month: '2월', value: 10500 },
    { month: '3월', value: 10200 },
    { month: '4월', value: 11000 },
    { month: '5월', value: 11800 },
    { month: '6월', value: 12500 },
  ]

  const assetAllocation = [
    { name: '주식', value: 45, color: '#0ea5e9' },
    { name: 'ETF', value: 30, color: '#10b981' },
    { name: '코인', value: 15, color: '#f59e0b' },
    { name: '현금', value: 10, color: '#6b7280' },
  ]

  const recentTransactions = [
    { date: '2025-10-05', type: '매수', asset: 'AAPL', amount: '$500', price: '$185.23' },
    { date: '2025-10-03', type: '매도', asset: 'TSLA', amount: '$300', price: '$242.15' },
    { date: '2025-10-01', type: '매수', asset: 'BTC', amount: '$1000', price: '$67,234' },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="총 자산"
          value="12,500"
          prefix="$"
          change={8.5}
          changeType="positive"
          icon={Wallet}
        />
        <StatCard
          title="월간 수익률"
          value="5.9"
          suffix="%"
          change={2.3}
          changeType="positive"
          icon={TrendingUp}
        />
        <StatCard
          title="총 수익금"
          value="2,500"
          prefix="$"
          change={15.2}
          changeType="positive"
          icon={DollarSign}
        />
        <StatCard
          title="목표 달성률"
          value="62"
          suffix="%"
          icon={Target}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Portfolio Trend */}
        <div className="lg:col-span-2">
          <ChartCard
            title="포트폴리오 추이"
            subtitle="최근 6개월 자산 변화"
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={portfolioData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Asset Allocation */}
        <ChartCard
          title="자산 배분"
          subtitle="포트폴리오 구성"
        >
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={assetAllocation}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {assetAllocation.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {assetAllocation.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-700">{item.name}</span>
                </div>
                <span className="font-medium">{item.value}%</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Recent Transactions */}
      <ChartCard title="최근 거래내역" subtitle="최근 3건의 거래">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">날짜</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">유형</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">자산</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">금액</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">가격</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((tx, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-700">{tx.date}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                      tx.type === '매수' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{tx.asset}</td>
                  <td className="py-3 px-4 text-sm text-gray-700">{tx.amount}</td>
                  <td className="py-3 px-4 text-sm text-gray-700">{tx.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}

export default Dashboard
