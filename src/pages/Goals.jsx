import React, { useState, useEffect } from 'react'
import { Target, Plus, TrendingUp, Calendar, X, Link as LinkIcon, Trash2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import ChartCard from '../components/ChartCard'

const Goals = () => {
  const [portfolioTotalUSD, setPortfolioTotalUSD] = useState(0)
  const [portfolioTotalKRW, setPortfolioTotalKRW] = useState(0)
  const [exchangeRate, setExchangeRate] = useState(1340)

  const [goals, setGoals] = useState([])

  // Load goals from localStorage on mount
  useEffect(() => {
    const savedGoals = localStorage.getItem('investment_goals')
    if (savedGoals) {
      try {
        setGoals(JSON.parse(savedGoals))
      } catch (error) {
        console.error('Failed to load goals from localStorage:', error)
      }
    }
  }, [])

  // Load portfolio data and sync with goals
  useEffect(() => {
    const savedAssets = localStorage.getItem('portfolio_assets')
    if (savedAssets) {
      try {
        const assets = JSON.parse(savedAssets)

        // Calculate totals
        const usdAssets = assets.filter(a => a.currency === 'USD')
        const usdTotal = usdAssets.reduce((sum, asset) => sum + asset.totalValue, 0)

        const krwAssets = assets.filter(a => a.currency === 'KRW')
        const krwTotal = krwAssets.reduce((sum, asset) => sum + asset.totalValue, 0)

        setPortfolioTotalUSD(usdTotal)
        setPortfolioTotalKRW(krwTotal)

        // Update linked goals with portfolio total
        setGoals(prevGoals => prevGoals.map(goal => {
          if (goal.linkedToPortfolio) {
            return {
              ...goal,
              currentAmount: goal.currency === 'KRW'
                ? krwTotal + (usdTotal * exchangeRate)
                : usdTotal + (krwTotal / exchangeRate)
            }
          }
          return goal
        }))
      } catch (error) {
        console.error('Failed to load portfolio:', error)
      }
    }
  }, [exchangeRate])

  // Save goals to localStorage
  useEffect(() => {
    localStorage.setItem('investment_goals', JSON.stringify(goals))
  }, [goals])

  const [showModal, setShowModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [goalToDelete, setGoalToDelete] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    targetDate: '',
    category: '장기목표',
    linkedToPortfolio: false,
    currency: 'USD'
  })

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

  const handleAddGoal = () => {
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setFormData({
      name: '',
      targetAmount: '',
      currentAmount: '',
      targetDate: '',
      category: '장기목표',
      linkedToPortfolio: false,
      currency: 'USD'
    })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const newGoal = {
      id: Date.now(),
      name: formData.name,
      targetAmount: parseFloat(formData.targetAmount),
      currentAmount: formData.linkedToPortfolio
        ? (formData.currency === 'KRW'
          ? portfolioTotalKRW + (portfolioTotalUSD * exchangeRate)
          : portfolioTotalUSD + (portfolioTotalKRW / exchangeRate))
        : parseFloat(formData.currentAmount || 0),
      targetDate: formData.targetDate,
      category: formData.category,
      status: 'active',
      linkedToPortfolio: formData.linkedToPortfolio,
      currency: formData.currency
    }

    setGoals(prev => [...prev, newGoal])
    handleCloseModal()
  }

  const handleDeleteClick = (goal) => {
    setGoalToDelete(goal)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = () => {
    if (goalToDelete) {
      setGoals(prev => prev.filter(g => g.id !== goalToDelete.id))
      setShowDeleteConfirm(false)
      setGoalToDelete(null)
    }
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
    setGoalToDelete(null)
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
        <button onClick={handleAddGoal} className="btn-primary flex items-center gap-2">
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
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">{goal.name}</h3>
                    {goal.linkedToPortfolio && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-blue-50 text-blue-700" title="포트폴리오와 자동 연동">
                        <LinkIcon className="w-3 h-3" />
                        연동
                      </span>
                    )}
                  </div>
                  <span className="inline-block mt-1 px-2 py-1 text-xs font-medium rounded bg-primary-50 text-primary-700">
                    {goal.category}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteClick(goal)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="목표 삭제"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
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
                      {goal.currency === 'KRW'
                        ? `₩${Math.round(goal.currentAmount).toLocaleString()}`
                        : `$${goal.currentAmount.toLocaleString()}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">목표 금액</p>
                    <p className="text-lg font-bold text-gray-900">
                      {goal.currency === 'KRW'
                        ? `₩${Math.round(goal.targetAmount).toLocaleString()}`
                        : `$${goal.targetAmount.toLocaleString()}`}
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
                        {goal.currency === 'KRW'
                          ? `₩${Math.round(monthlyRequired).toLocaleString()}`
                          : `$${monthlyRequired.toFixed(0)}`}
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

      {/* Add Goal Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">목표 추가</h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  목표 이름
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="예: 1억 달성"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  카테고리
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="장기목표">장기목표</option>
                  <option value="단기목표">단기목표</option>
                  <option value="배당수익">배당수익</option>
                  <option value="저축">저축</option>
                  <option value="부동산">부동산</option>
                  <option value="기타">기타</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  통화
                </label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="USD">USD ($)</option>
                  <option value="KRW">KRW (₩)</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="linkedToPortfolio"
                    checked={formData.linkedToPortfolio}
                    onChange={(e) => setFormData(prev => ({ ...prev, linkedToPortfolio: e.target.checked }))}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-blue-900">포트폴리오와 연동</p>
                    <p className="text-xs text-blue-700">체크하면 포트폴리오 총액이 자동으로 현재 금액에 반영됩니다</p>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    현재 금액 ({formData.currency === 'KRW' ? '₩' : '$'})
                  </label>
                  {formData.linkedToPortfolio ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                      {formData.currency === 'KRW'
                        ? `₩${Math.round(portfolioTotalKRW + (portfolioTotalUSD * exchangeRate)).toLocaleString()}`
                        : `$${(portfolioTotalUSD + (portfolioTotalKRW / exchangeRate)).toFixed(0)}`}
                      <span className="text-xs ml-1">(자동 연동)</span>
                    </div>
                  ) : (
                    <input
                      type="number"
                      name="currentAmount"
                      value={formData.currentAmount}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    목표 금액 ({formData.currency === 'KRW' ? '₩' : '$'})
                  </label>
                  <input
                    type="number"
                    name="targetAmount"
                    value={formData.targetAmount}
                    onChange={handleInputChange}
                    required
                    step="0.01"
                    min="0"
                    placeholder="100000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  목표 달성일
                </label>
                <input
                  type="date"
                  name="targetDate"
                  value={formData.targetDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && goalToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">목표 삭제</h3>
                <p className="text-sm text-gray-600">이 작업은 되돌릴 수 없습니다</p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 mb-2">
                다음 목표를 삭제하시겠습니까?
              </p>
              <p className="font-semibold text-gray-900">{goalToDelete.name}</p>
              <p className="text-sm text-gray-600 mt-1">
                {goalToDelete.category} - {goalToDelete.currency === 'KRW'
                  ? `₩${Math.round(goalToDelete.targetAmount).toLocaleString()}`
                  : `$${goalToDelete.targetAmount.toLocaleString()}`}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Goals
