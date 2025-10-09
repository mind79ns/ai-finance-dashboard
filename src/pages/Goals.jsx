import React, { useState, useEffect, useMemo } from 'react'
import { Target, Plus, TrendingUp, Calendar, X, Link as LinkIcon, Trash2, Sparkles, RefreshCw } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import ChartCard from '../components/ChartCard'
import aiService from '../services/aiService'
import marketDataService from '../services/marketDataService'

const Goals = () => {
  const [portfolioTotalUSD, setPortfolioTotalUSD] = useState(0)
  const [portfolioTotalKRW, setPortfolioTotalKRW] = useState(0)
  const [exchangeRate, setExchangeRate] = useState(1340)

  const [goals, setGoals] = useState([])
  const [aiSuggestions, setAiSuggestions] = useState([])
  const [loadingAI, setLoadingAI] = useState(false)
  const [portfolioAssets, setPortfolioAssets] = useState([])

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

  // Fetch real-time exchange rate
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const marketData = await marketDataService.getAllMarketData()
        if (marketData.currency?.usdKrw?.rate) {
          setExchangeRate(marketData.currency.usdKrw.rate)
          console.log(`💱 Exchange Rate Updated: $1 = ₩${marketData.currency.usdKrw.rate}`)
        }
      } catch (error) {
        console.error('Failed to fetch exchange rate:', error)
      }
    }

    fetchExchangeRate()
    // Update exchange rate every 5 minutes
    const interval = setInterval(fetchExchangeRate, 300000)
    return () => clearInterval(interval)
  }, [])

  // Load portfolio data and calculate totals
  useEffect(() => {
    const loadPortfolioData = () => {
      const savedAssets = localStorage.getItem('portfolio_assets')
      if (savedAssets) {
        try {
          const assets = JSON.parse(savedAssets)
          setPortfolioAssets(assets)

          // Calculate totals
          const usdAssets = assets.filter(a => a.currency === 'USD')
          const usdTotal = usdAssets.reduce((sum, asset) => sum + asset.totalValue, 0)

          const krwAssets = assets.filter(a => a.currency === 'KRW')
          const krwTotal = krwAssets.reduce((sum, asset) => sum + asset.totalValue, 0)

          setPortfolioTotalUSD(usdTotal)
          setPortfolioTotalKRW(krwTotal)

          console.log(`📊 Portfolio Totals - USD: $${usdTotal.toFixed(0)}, KRW: ₩${krwTotal.toFixed(0)}`)
        } catch (error) {
          console.error('Failed to load portfolio:', error)
        }
      }
    }

    // Initial load
    loadPortfolioData()

    // Listen for portfolio changes from other tabs/windows or InvestmentLog updates
    const handleStorageChange = (e) => {
      if (e.key === 'portfolio_assets') {
        console.log('🔄 Portfolio assets changed, reloading...')
        loadPortfolioData()
      }
    }

    window.addEventListener('storage', handleStorageChange)

    // Also poll every 3 seconds to catch same-tab updates (InvestmentLog transactions)
    const pollInterval = setInterval(loadPortfolioData, 3000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(pollInterval)
    }
  }, [])

  // Update linked goals when portfolio totals or exchange rate changes
  useEffect(() => {
    setGoals(prevGoals => prevGoals.map(goal => {
      if (goal.linkedToPortfolio) {
        const newAmount = goal.currency === 'KRW'
          ? portfolioTotalKRW + (portfolioTotalUSD * exchangeRate)
          : portfolioTotalUSD + (portfolioTotalKRW / exchangeRate)

        console.log(`🔗 Syncing Goal "${goal.name}" (${goal.currency}): ${goal.currency === 'KRW' ? '₩' : '$'}${newAmount.toFixed(0)}`)

        return {
          ...goal,
          currentAmount: newAmount
        }
      }
      return goal
    }))
  }, [portfolioTotalUSD, portfolioTotalKRW, exchangeRate])

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

  // Helper functions (declared before being used)
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

  // Dynamic projection data based on first active goal
  const generateProjectionData = () => {
    // Use the first goal with the furthest target date for projection
    const activeGoals = goals.filter(g => g.status === 'active' && g.targetDate)

    if (activeGoals.length === 0) {
      // Fallback to demo data if no goals
      return [
        { year: new Date().getFullYear().toString(), current: 0, projected: 0, target: 0 }
      ]
    }

    // Sort by target date (furthest in future first) for long-term projection
    const sortedGoals = [...activeGoals].sort((a, b) =>
      new Date(b.targetDate) - new Date(a.targetDate)
    )
    const primaryGoal = sortedGoals[0]

    const startYear = new Date().getFullYear()
    const targetYear = new Date(primaryGoal.targetDate).getFullYear()
    const yearsToTarget = Math.max(targetYear - startYear, 1)

    const currentAmount = primaryGoal.currentAmount || 0
    const targetAmount = primaryGoal.targetAmount || 0
    const remainingAmount = targetAmount - currentAmount
    const monthsToTarget = calculateMonthsRemaining(primaryGoal.targetDate)
    const monthlyContribution = remainingAmount / Math.max(monthsToTarget, 1)

    // Generate year-by-year projection with compound growth assumption (8% annual return)
    const annualReturnRate = 0.08
    const projectionYears = Math.min(yearsToTarget + 1, 10) // Max 10 years projection

    const data = []
    for (let i = 0; i <= projectionYears; i++) {
      const year = startYear + i

      // Compound growth projection (more realistic)
      const compoundGrowth = currentAmount * Math.pow(1 + annualReturnRate, i) +
                             (monthlyContribution * 12 * ((Math.pow(1 + annualReturnRate, i) - 1) / annualReturnRate))

      // Target path (linear to target)
      const targetPath = currentAmount + (remainingAmount * (i / yearsToTarget))

      data.push({
        year: year.toString(),
        current: i === 0 ? currentAmount : 0, // Only show current for year 0
        projected: Math.round(compoundGrowth),
        target: Math.round(Math.min(targetPath, targetAmount))
      })
    }

    return data
  }

  // Memoize projection data to prevent TDZ errors on re-render
  const projectionData = useMemo(() => {
    return generateProjectionData()
  }, [goals])

  // Calculate required annual return based on first goal
  const calculateRequiredReturn = () => {
    const activeGoals = goals.filter(g => g.status === 'active' && g.targetDate)
    if (activeGoals.length === 0) return 0

    const sortedGoals = [...activeGoals].sort((a, b) =>
      new Date(b.targetDate) - new Date(a.targetDate)
    )
    const goal = sortedGoals[0]

    const years = Math.max((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24 * 365), 0.1)
    const currentAmount = goal.currentAmount || 1
    const targetAmount = goal.targetAmount || 0

    // Calculate CAGR needed: (Target/Current)^(1/years) - 1
    const requiredReturn = (Math.pow(targetAmount / currentAmount, 1 / years) - 1) * 100
    return requiredReturn
  }

  // Memoize required return to prevent TDZ errors on re-render
  const requiredAnnualReturn = useMemo(() => {
    return calculateRequiredReturn()
  }, [goals])

  // Calculate total expected profit
  const calculateExpectedProfit = () => {
    const activeGoals = goals.filter(g => g.status === 'active')
    if (activeGoals.length === 0) return 0

    const totalCurrent = activeGoals.reduce((sum, g) => sum + (g.currentAmount || 0), 0)
    const totalTarget = activeGoals.reduce((sum, g) => sum + (g.targetAmount || 0), 0)
    return totalTarget - totalCurrent
  }

  // Memoize expected profit to prevent TDZ errors on re-render
  const expectedProfit = useMemo(() => {
    return calculateExpectedProfit()
  }, [goals])

  // Risk level assessment
  const assessRiskLevel = () => {
    const returnRate = requiredAnnualReturn
    if (returnRate < 5) return { level: '안전', color: 'text-green-600' }
    if (returnRate < 10) return { level: '낮은위험', color: 'text-blue-600' }
    if (returnRate < 15) return { level: '중위험', color: 'text-yellow-600' }
    if (returnRate < 25) return { level: '높은위험', color: 'text-orange-600' }
    return { level: '초고위험', color: 'text-red-600' }
  }

  // Memoize risk assessment to prevent TDZ errors on re-render
  const riskAssessment = useMemo(() => {
    return assessRiskLevel()
  }, [requiredAnnualReturn])

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

  // Generate AI suggestions for goal achievement
  const handleGenerateAISuggestions = async () => {
    setLoadingAI(true)
    setAiSuggestions([])

    try {
      // Prepare context for AI
      const context = {
        goals: goals.map(g => ({
          name: g.name,
          category: g.category,
          currency: g.currency,
          currentAmount: g.currentAmount,
          targetAmount: g.targetAmount,
          targetDate: g.targetDate,
          progress: calculateProgress(g.currentAmount, g.targetAmount),
          monthsRemaining: calculateMonthsRemaining(g.targetDate),
          linkedToPortfolio: g.linkedToPortfolio
        })),
        portfolio: {
          totalUSD: portfolioTotalUSD,
          totalKRW: portfolioTotalKRW,
          exchangeRate: exchangeRate,
          assetCount: portfolioAssets.length,
          assets: portfolioAssets.map(a => ({
            symbol: a.symbol,
            type: a.type,
            currency: a.currency,
            totalValue: a.totalValue,
            profitPercent: a.profitPercent
          }))
        },
        requiredAnnualReturn: requiredAnnualReturn,
        riskLevel: riskAssessment.level
      }

      const prompt = `당신은 전문 재무 설계사입니다. 다음 투자 목표와 포트폴리오 현황을 분석하고, 목표 달성을 위한 구체적인 제안을 제공해주세요.

현황:
${JSON.stringify(context, null, 2)}

다음 형식으로 3-5개의 구체적인 제안을 해주세요:
1. 제안 제목 (한 줄)
2. 상세 설명 (2-3문장, 구체적인 수치와 실행 방안 포함)

각 제안은 실행 가능해야 하며, 현재 상황에 맞는 맞춤형 조언이어야 합니다.`

      const response = await aiService.routeAIRequest(
        prompt,
        aiService.TASK_LEVEL.ADVANCED,
        '당신은 20년 경력의 재무 설계 전문가입니다. 고객의 투자 목표 달성을 위한 실용적이고 구체적인 조언을 제공합니다.'
      )

      // Parse AI response into structured suggestions
      const suggestions = parseAISuggestions(response)
      setAiSuggestions(suggestions)

      console.log('✅ AI Suggestions Generated:', suggestions.length)
    } catch (error) {
      console.error('AI Suggestions Error:', error)
      // Fallback suggestions if AI fails
      setAiSuggestions([
        {
          title: 'AI 서비스 연결 실패',
          description: 'AI API 키를 확인해주세요. .env 파일에 VITE_OPENAI_API_KEY 또는 VITE_GEMINI_API_KEY를 설정하세요.',
          type: 'error'
        }
      ])
    } finally {
      setLoadingAI(false)
    }
  }

  // Parse AI response into structured suggestions
  const parseAISuggestions = (aiResponse) => {
    const suggestions = []

    // Try to extract numbered suggestions from AI response
    const lines = aiResponse.split('\n').filter(line => line.trim())

    let currentSuggestion = null
    let suggestionType = 'info' // default

    lines.forEach(line => {
      const trimmed = line.trim()

      // Detect suggestion title (numbered line like "1. Title" or "**1. Title**")
      const titleMatch = trimmed.match(/^[*#]*\s*\d+[.)]\s*(.+?)[*#]*$/)
      if (titleMatch) {
        // Save previous suggestion if exists
        if (currentSuggestion) {
          suggestions.push(currentSuggestion)
        }

        // Start new suggestion
        const title = titleMatch[1].trim()

        // Determine type based on keywords
        if (title.includes('위험') || title.includes('주의') || title.includes('경고')) {
          suggestionType = 'warning'
        } else if (title.includes('리밸런싱') || title.includes('조정') || title.includes('변경')) {
          suggestionType = 'rebalance'
        } else if (title.includes('증액') || title.includes('추가') || title.includes('투자')) {
          suggestionType = 'investment'
        } else {
          suggestionType = 'info'
        }

        currentSuggestion = {
          title: title,
          description: '',
          type: suggestionType
        }
      } else if (currentSuggestion && trimmed.length > 0 && !trimmed.match(/^[*#-]+$/)) {
        // Add to description (skip markdown separators)
        currentSuggestion.description += (currentSuggestion.description ? ' ' : '') + trimmed
      }
    })

    // Save last suggestion
    if (currentSuggestion) {
      suggestions.push(currentSuggestion)
    }

    // If parsing failed, return full response as single suggestion
    if (suggestions.length === 0) {
      return [{
        title: 'AI 분석 결과',
        description: aiResponse,
        type: 'info'
      }]
    }

    return suggestions
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
            <p className="text-sm text-gray-600 flex items-center gap-2">
              나의 재무 목표 달성 현황
              {portfolioAssets.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  실시간 연동
                </span>
              )}
            </p>
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
          const monthlyRequired = monthsLeft > 0
            ? (goal.targetAmount - goal.currentAmount) / monthsLeft
            : 0

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

      {/* Projection Chart - Dynamic Data */}
      {goals.length > 0 ? (
        <ChartCard
          title="목표 달성 예상 경로"
          subtitle={(() => {
            const activeGoals = goals.filter(g => g.status === 'active')
            if (activeGoals.length === 0) return '목표 기준 시뮬레이션 (연 8% 복리 수익률 가정)'
            const sortedGoals = activeGoals.sort((a, b) => new Date(b.targetDate) - new Date(a.targetDate))
            const primaryGoal = sortedGoals[0]
            return `${primaryGoal?.name || '목표'} 기준 시뮬레이션 (연 8% 복리 수익률 가정)`
          })()}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={projectionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="year"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
                  return value.toString()
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '8px 12px'
                }}
                formatter={(value) => {
                  const activeGoal = goals.filter(g => g.status === 'active')[0]
                  const currency = activeGoal?.currency || 'USD'
                  return [
                    currency === 'KRW'
                      ? `₩${Math.round(value).toLocaleString()}`
                      : `$${value.toLocaleString()}`,
                    ''
                  ]
                }}
                labelFormatter={(label) => `${label}년`}
              />
              <Line
                type="monotone"
                dataKey="current"
                stroke="#10b981"
                strokeWidth={3}
                name="현재 자산"
                dot={{ fill: '#10b981', r: 5 }}
                activeDot={{ r: 7 }}
              />
              <Line
                type="monotone"
                dataKey="projected"
                stroke="#3b82f6"
                strokeWidth={2}
                name="예상 경로 (복리 8%)"
                dot={{ fill: '#3b82f6', r: 4 }}
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
              <p className={`text-2xl font-bold ${riskAssessment.color}`}>
                {requiredAnnualReturn > 0 && isFinite(requiredAnnualReturn)
                  ? `${requiredAnnualReturn.toFixed(1)}%`
                  : '0%'}
              </p>
            </div>
            <div className="p-4 bg-success/10 rounded-lg">
              <p className="text-sm text-success mb-1">예상 총 수익</p>
              <p className="text-2xl font-bold text-success">
                {goals[0]?.currency === 'KRW'
                  ? `₩${Math.round(expectedProfit).toLocaleString()}`
                  : `$${Math.round(expectedProfit).toLocaleString()}`}
              </p>
            </div>
            <div className="p-4 bg-warning/10 rounded-lg">
              <p className="text-sm text-gray-700 mb-1">리스크 수준</p>
              <p className={`text-2xl font-bold ${riskAssessment.color}`}>
                {riskAssessment.level}
              </p>
            </div>
          </div>

          {goals.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>차트 설명:</strong> 파란색 실선은 연 8% 복리 수익률 가정 시 예상 경로입니다.
                점선은 목표 달성을 위한 이상적인 경로를 나타냅니다.
                실제 수익률은 시장 상황에 따라 달라질 수 있습니다.
              </p>
            </div>
          )}
        </ChartCard>
      ) : (
        <div className="card">
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">목표를 추가하여 시작하세요</h3>
            <p className="text-sm text-gray-600 mb-4">
              목표를 설정하면 달성 예상 경로 차트가 자동으로 생성됩니다
            </p>
            <button onClick={handleAddGoal} className="btn-primary">
              첫 번째 목표 추가
            </button>
          </div>
        </div>
      )}

      {/* AI Recommendations - Active Feature */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">AI 목표 달성 제안</h3>
          </div>
          <button
            onClick={handleGenerateAISuggestions}
            disabled={loadingAI || goals.length === 0}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingAI ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                분석 중...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                AI 제안 생성
              </>
            )}
          </button>
        </div>

        {aiSuggestions.length > 0 ? (
          <div className="space-y-3">
            {aiSuggestions.map((suggestion, index) => {
              const bgColor = suggestion.type === 'error' ? 'bg-red-50 border-red-200'
                : suggestion.type === 'warning' ? 'bg-yellow-50 border-yellow-200'
                : suggestion.type === 'rebalance' ? 'bg-purple-50 border-purple-200'
                : suggestion.type === 'investment' ? 'bg-green-50 border-green-200'
                : 'bg-blue-50 border-blue-200'

              const iconColor = suggestion.type === 'error' ? 'text-red-600'
                : suggestion.type === 'warning' ? 'text-yellow-600'
                : suggestion.type === 'rebalance' ? 'text-purple-600'
                : suggestion.type === 'investment' ? 'text-green-600'
                : 'text-blue-600'

              const Icon = suggestion.type === 'error' ? X
                : suggestion.type === 'warning' ? Calendar
                : suggestion.type === 'rebalance' ? TrendingUp
                : suggestion.type === 'investment' ? Target
                : Sparkles

              return (
                <div key={index} className={`flex items-start gap-3 p-4 rounded-lg border ${bgColor}`}>
                  <div className={`p-2 rounded ${bgColor}`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{suggestion.title}</p>
                    <p className="text-sm text-gray-700 mt-1">
                      {suggestion.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">AI 분석을 시작하려면 버튼을 클릭하세요</p>
            <p className="text-sm text-gray-500">
              포트폴리오와 목표를 분석하여 맞춤형 제안을 생성합니다
            </p>
          </div>
        )}

        {goals.length === 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              <strong>안내:</strong> AI 제안을 받으려면 먼저 목표를 추가하세요.
            </p>
          </div>
        )}
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
