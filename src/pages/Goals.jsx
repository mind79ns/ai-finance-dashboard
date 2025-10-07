import React, { useState } from 'react'
import { Target, Plus, TrendingUp, Calendar } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import ChartCard from '../components/ChartCard'

const Goals = () => {
  const [goals, setGoals] = useState([
    {
      id: 1,
      name: '1억 달성',
      targetAmount: 100000,
      currentAmount: 12500,
      targetDate: '2030-12-31',
      category: '장기목표',
      status: 'active'
    },
    {
      id: 2,
      name: '월 배당 $500',
      targetAmount: 500,
      currentAmount: 85,
      targetDate: '2026-12-31',
      category: '배당수익',
      status: 'active'
    },
  ])

  const projectionData = [
    { year: '2025', current: 12500, target: 20000 },
    { year: '2026', current: 0, target: 35000 },
    { year: '2027', current: 0, target: 50000 },
    { year: '2028', current: 0, target: 65000 },
    { year: '2029', current: 0, target: 80000 },
    { year: '2030', current: 0, target: 100000 },
  ]

  const calculateProgress = (current, target) => {
    return Math.min((current / target) * 100, 100)
  }

  const calculateMonthsRemaining = (targetDate) => {
    const now = new Date()
    const target = new Date(targetDate)
    const diffTime = target - now
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30))
    return diffMonths
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary-100 rounded-lg">
            <Target className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">투자 목표 관리</h2>
            <p className="text-sm text-gray-600">나의 재무 목표 달성 현황</p>
          </div>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          목표 추가
        </button>
      </div>

      {/* Goal Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {goals.map((goal) => {
          const progress = calculateProgress(goal.currentAmount, goal.targetAmount)
          const monthsLeft = calculateMonthsRemaining(goal.targetDate)
          const monthlyRequired = (goal.targetAmount - goal.currentAmount) / monthsLeft

          return (
            <div key={goal.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{goal.name}</h3>
                  <span className="inline-block mt-1 px-2 py-1 text-xs font-medium rounded bg-primary-50 text-primary-700">
                    {goal.category}
                  </span>
                </div>
                <Target className="w-6 h-6 text-primary-600" />
              </div>

              <div className="space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">진행률</span>
                    <span className="text-sm font-medium text-primary-600">
                      {progress.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-primary-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">현재 금액</p>
                    <p className="text-lg font-bold text-gray-900">
                      ${goal.currentAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">목표 금액</p>
                    <p className="text-lg font-bold text-gray-900">
                      ${goal.targetAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">남은 기간</p>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <p className="text-sm font-medium text-gray-700">
                        {monthsLeft}개월
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">월 필요액</p>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-success" />
                      <p className="text-sm font-medium text-success">
                        ${monthlyRequired.toFixed(0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Target Date */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-600">목표 달성일</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {new Date(goal.targetDate).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Projection Chart */}
      <ChartCard
        title="목표 달성 예상 경로"
        subtitle="연도별 자산 증가 시뮬레이션 (연 20% 수익률 가정)"
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={projectionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="year" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
              formatter={(value) => `$${value.toLocaleString()}`}
            />
            <Line
              type="monotone"
              dataKey="current"
              stroke="#10b981"
              strokeWidth={2}
              name="현재 자산"
              dot={{ fill: '#10b981', r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="target"
              stroke="#0ea5e9"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="목표 경로"
              dot={{ fill: '#0ea5e9', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-primary-50 rounded-lg">
            <p className="text-sm text-primary-700 mb-1">필요 연평균 수익률</p>
            <p className="text-2xl font-bold text-primary-900">20%</p>
          </div>
          <div className="p-4 bg-success/10 rounded-lg">
            <p className="text-sm text-success mb-1">예상 총 수익</p>
            <p className="text-2xl font-bold text-success">$87,500</p>
          </div>
          <div className="p-4 bg-warning/10 rounded-lg">
            <p className="text-sm text-warning mb-1">리스크 수준</p>
            <p className="text-2xl font-bold text-warning">중위험</p>
          </div>
        </div>
      </ChartCard>

      {/* Recommendations */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">AI 목표 달성 제안</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-primary-50 rounded-lg">
            <div className="p-2 bg-primary-100 rounded">
              <TrendingUp className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">포트폴리오 리밸런싱 권장</p>
              <p className="text-sm text-gray-600 mt-1">
                현재 주식 비중이 높습니다. ETF 비중을 35%로 늘려 안정성을 확보하세요.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-success/10 rounded-lg">
            <div className="p-2 bg-success/20 rounded">
              <Target className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="font-medium text-gray-900">월간 투자금 증액 추천</p>
              <p className="text-sm text-gray-600 mt-1">
                목표 달성을 위해 월 $1,000 이상 추가 투자를 권장합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Goals
