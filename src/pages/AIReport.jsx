import { useState, useEffect, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { Sparkles, FileText, RefreshCw, Zap, TrendingUp, AlertTriangle, Clock, Archive } from 'lucide-react'
import aiService from '../services/aiService'
import marketDataService from '../services/marketDataService'
import AIStrategyBadge from '../components/AIStrategyBadge'
import dataSync from '../utils/dataSync'
import {
  formatNumber,
  formatCurrency,
  computeMarketInsights,
  computePortfolioInsights,
  computeCashflowInsights,
  buildMarketReportPrompt,
  buildPortfolioAnalysisPrompt,
  buildRebalancingPrompt,
  buildChatPrompt
} from '../utils/aiInsights'

const AIReport = () => {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('market')
  const [marketReport, setMarketReport] = useState('')
  const [portfolioAnalysis, setPortfolioAnalysis] = useState('')
  const [riskAnalysis, setRiskAnalysis] = useState(null)
  const [rebalancingSuggestion, setRebalancingSuggestion] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [marketData, setMarketData] = useState(null)
  const [portfolioData, setPortfolioData] = useState(null)
  const [selectedAI, setSelectedAI] = useState('auto') // 'auto', 'gpt', 'gemini'
  const [goalsSummary, setGoalsSummary] = useState(null)
  const [analysisHistory, setAnalysisHistory] = useState([])
  const [historyViewer, setHistoryViewer] = useState({ open: false, entry: null })
  const [cashflowInsights, setCashflowInsights] = useState(null)
  const [selectedStock, setSelectedStock] = useState(null) // 종목 분석용
  const [stockAnalysis, setStockAnalysis] = useState('') // AI 종목 분석 결과

  const marketInsights = useMemo(() => computeMarketInsights(marketData), [marketData])
  const portfolioInsights = useMemo(
    () => computePortfolioInsights(portfolioData, goalsSummary),
    [portfolioData, goalsSummary]
  )

  // Load real market and portfolio data
  useEffect(() => {
    loadRealData()
    loadHistory()
  }, [])

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem('ai_report_history')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setAnalysisHistory(parsed)
        }
      }
    } catch (error) {
      console.error('Failed to load AI report history:', error)
    }
  }

  const appendHistory = (entry) => {
    setAnalysisHistory(prev => {
      const updated = [entry, ...prev].slice(0, 20)
      try {
        localStorage.setItem('ai_report_history', JSON.stringify(updated))
      } catch (error) {
        console.error('Failed to persist AI report history:', error)
      }
      return updated
    })
  }

  const copyToClipboard = async (text, successMessage = '클립보드에 복사되었습니다.', errorMessage = '복사에 실패했습니다.') => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      window.alert('이 브라우저에서는 자동 복사를 지원하지 않습니다.')
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      window.alert(successMessage)
    } catch (error) {
      console.error('Clipboard copy failed:', error)
      window.alert(errorMessage)
    }
  }

  const downloadReport = (baseName, content) => {
    if (!content) {
      window.alert('다운로드할 내용이 없습니다.')
      return
    }
    try {
      const filename = `${baseName}_${new Date().toISOString().slice(0, 10)}.md`
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download report failed:', error)
      window.alert('다운로드 생성에 실패했습니다.')
    }
  }

  const downloadHistory = () => {
    if (!analysisHistory.length) {
      window.alert('다운로드할 리포트 기록이 없습니다.')
      return
    }

    try {
      const filename = `ai_report_history_${new Date().toISOString().slice(0, 10)}.json`
      const blob = new Blob([JSON.stringify(analysisHistory, null, 2)], { type: 'application/json;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download history failed:', error)
      window.alert('히스토리 다운로드에 실패했습니다.')
    }
  }
  const loadRealData = async () => {
    try {
      // Get real market data & sync Supabase-backed datasets
      const [
        market,
        assetsResponse,
        goalsResponse,
        assetStatusData,
        incomeCategoriesData,
        expenseCategoriesData,
        transactionHistoryData
      ] = await Promise.all([
        marketDataService.getAllMarketData(),
        dataSync.loadPortfolioAssets(),
        dataSync.loadGoals(),
        dataSync.loadUserSetting('asset_status_data', {}),
        dataSync.loadUserSetting('asset_income_categories', []),
        dataSync.loadUserSetting('asset_expense_categories', []),
        dataSync.loadUserSetting('transaction_history_v2', { vnd: [], usd: [], krw: [] })
      ])
      setMarketData(market)

      // Build portfolio analytics if data exists
      const assets = Array.isArray(assetsResponse) ? assetsResponse : []
      if (assets.length > 0) {
        const usdKrwRate = market?.currency?.usdKrw?.rate
        const usdToKrw = Number.isFinite(Number(usdKrwRate)) ? Number(usdKrwRate) : null
        const krwToUsd = usdToKrw ? 1 / usdToKrw : null

        const totalsByCurrency = {}
        const assetDetails = assets.map(asset => {
          const currency = asset.currency || 'USD'
          const totalValue = Number(asset.totalValue || 0)
          const totalProfit = Number(asset.profit || 0)

          if (!totalsByCurrency[currency]) {
            totalsByCurrency[currency] = {
              totalValue: 0,
              totalProfit: 0
            }
          }
          totalsByCurrency[currency].totalValue += totalValue
          totalsByCurrency[currency].totalProfit += totalProfit

          const valueKRW = currency === 'USD' && usdToKrw
            ? totalValue * usdToKrw
            : totalValue
          const profitKRW = currency === 'USD' && usdToKrw
            ? totalProfit * usdToKrw
            : totalProfit
          const valueUSD = currency === 'KRW' && krwToUsd
            ? totalValue * krwToUsd
            : totalValue
          const profitUSD = currency === 'KRW' && krwToUsd
            ? totalProfit * krwToUsd
            : totalProfit

          return {
            symbol: asset.symbol,
            name: asset.name,
            type: asset.type,
            currency,
            quantity: asset.quantity,
            avgPrice: asset.avgPrice,
            currentPrice: asset.currentPrice,
            profitPercent: asset.profitPercent,
            account: asset.account,
            category: asset.category,
            valueOriginal: totalValue,
            profitOriginal: totalProfit,
            valueKRW,
            profitKRW,
            valueUSD,
            profitUSD
          }
        })

        let totalValueKRW = 0
        let totalProfitKRW = 0
        let totalValueUSD = 0
        let totalProfitUSD = 0

        Object.entries(totalsByCurrency).forEach(([currency, totals]) => {
          if (currency === 'USD') {
            totalValueUSD += totals.totalValue
            totalProfitUSD += totals.totalProfit
            const convertedValue = usdToKrw ? totals.totalValue * usdToKrw : totals.totalValue
            const convertedProfit = usdToKrw ? totals.totalProfit * usdToKrw : totals.totalProfit
            totalValueKRW += convertedValue
            totalProfitKRW += convertedProfit
          } else if (currency === 'KRW') {
            totalValueKRW += totals.totalValue
            totalProfitKRW += totals.totalProfit
            const convertedValue = krwToUsd ? totals.totalValue * krwToUsd : totals.totalValue
            const convertedProfit = krwToUsd ? totals.totalProfit * krwToUsd : totals.totalProfit
            totalValueUSD += convertedValue
            totalProfitUSD += convertedProfit
          } else {
            // 다른 통화는 일단 원화/달러 동일 금액으로 취급 (추가 환율 연동 필요)
            totalValueKRW += totals.totalValue
            totalProfitKRW += totals.totalProfit
            totalValueUSD += totals.totalValue
            totalProfitUSD += totals.totalProfit
          }
        })

        const costBasisKRW = totalValueKRW - totalProfitKRW
        const profitPercent = costBasisKRW > 0 ? (totalProfitKRW / costBasisKRW) * 100 : 0

        const currencyBreakdown = Object.entries(totalsByCurrency).map(([currency, totals]) => {
          const toKRW = currency === 'USD' && usdToKrw
            ? totals.totalValue * usdToKrw
            : totals.totalValue
          const profitToKRW = currency === 'USD' && usdToKrw
            ? totals.totalProfit * usdToKrw
            : totals.totalProfit
          const toUSD = currency === 'KRW' && krwToUsd
            ? totals.totalValue * krwToUsd
            : totals.totalValue
          const profitToUSD = currency === 'KRW' && krwToUsd
            ? totals.totalProfit * krwToUsd
            : totals.totalProfit
          const costBasis = totals.totalValue - totals.totalProfit

          return {
            currency,
            totalValue: totals.totalValue,
            totalProfit: totals.totalProfit,
            totalValueKRW: toKRW,
            totalProfitKRW: profitToKRW,
            totalValueUSD: toUSD,
            totalProfitUSD: profitToUSD,
            profitPercent: costBasis > 0 ? (totals.totalProfit / costBasis) * 100 : 0
          }
        })

        // Calculate allocation using 원화 기준
        const totalValueForAllocation = assetDetails.reduce((sum, asset) => sum + (asset.valueKRW || 0), 0)
        const allocation = assetDetails.reduce((groups, asset) => {
          const type = asset.type
          if (!groups[type]) groups[type] = 0
          groups[type] += totalValueForAllocation > 0 ? (asset.valueKRW || 0) / totalValueForAllocation * 100 : 0
          return groups
        }, {})

        setPortfolioData({
          baseCurrency: 'KRW',
          exchangeRate: {
            usdKrw: usdToKrw,
            krwUsd: krwToUsd,
            lastUpdated: market?.lastUpdated || new Date().toISOString()
          },
          totals: {
            byCurrency: currencyBreakdown,
            totalValueKRW,
            totalProfitKRW,
            totalValueUSD,
            totalProfitUSD
          },
          totalValue: totalValueKRW,
          totalProfit: totalProfitKRW,
          totalValueUSD,
          totalProfitUSD,
          profitPercent,
          assets: assetDetails,
          allocation
        })
      } else {
        setPortfolioData(null)
      }

      const goals = Array.isArray(goalsResponse) ? goalsResponse : []
      if (goals.length > 0) {
        const totalGoals = goals.length
        const linkedGoals = goals.filter(goal => goal.linkedToPortfolio)
        const averageProgress = goals.reduce((sum, goal) => {
          const target = Number(goal.targetAmount || 0)
          const current = Number(goal.currentAmount || 0)
          if (!target || target <= 0) return sum
          return sum + Math.min((current / target) * 100, 100)
        }, 0) / totalGoals

        const futureGoals = goals
          .filter(goal => goal.targetDate && new Date(goal.targetDate) >= new Date())
          .sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate))

        const upcomingGoal = futureGoals[0] || null

        setGoalsSummary({
          totalGoals,
          linkedGoals: linkedGoals.length,
          averageProgress: Number.isFinite(averageProgress) ? averageProgress : null,
          upcomingGoal: upcomingGoal
            ? {
                name: upcomingGoal.name,
                targetDate: upcomingGoal.targetDate,
                progress: upcomingGoal.targetAmount
                  ? Math.min((Number(upcomingGoal.currentAmount || 0) / Number(upcomingGoal.targetAmount)) * 100, 100)
                  : null,
                currency: upcomingGoal.currency || 'USD'
              }
            : null,
          goals: goals.slice(0, 5).map(goal => ({
            name: goal.name,
            category: goal.category,
            targetAmount: goal.targetAmount,
            currentAmount: goal.currentAmount,
            currency: goal.currency || 'USD',
            targetDate: goal.targetDate,
            linkedToPortfolio: goal.linkedToPortfolio
          }))
        })
      } else {
        setGoalsSummary(null)
      }

      const cashflow = computeCashflowInsights({
        statusData: assetStatusData,
        incomeCategories: incomeCategoriesData,
        expenseCategories: expenseCategoriesData,
        transactionHistory: transactionHistoryData
      })
      const hasCashflowData = cashflow && (cashflow.hasActivity || (Number.isFinite(cashflow.totalAssets) && cashflow.totalAssets !== 0))
      setCashflowInsights(hasCashflowData ? cashflow : null)
    } catch (error) {
      console.error('Failed to load real data:', error)
    }
  }

  const generateMarketReport = async () => {
    if (!marketData) {
      setMarketReport('시장 데이터를 불러오는 중입니다...')
      await loadRealData()
      return
    }

    setLoading(true)
    try {
      const prompt = buildMarketReportPrompt(marketData, marketInsights)
      const report = await aiService.routeAIRequest(
        prompt,
        aiService.TASK_LEVEL.ADVANCED,
        '당신은 20년 경력의 전문 투자 애널리스트입니다. 시장 데이터를 깊이 있게 분석하여 실용적인 투자 리포트를 작성합니다.',
        selectedAI
      )
      setMarketReport(report)
      appendHistory({
        id: Date.now(),
        type: 'market',
        createdAt: new Date().toISOString(),
        summary: '시장 분석 리포트',
        content: report
      })
    } catch (error) {
      setMarketReport('리포트 생성 중 오류가 발생했습니다. API 키를 확인해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const generatePortfolioAnalysis = async () => {
    if (!portfolioData) {
      setPortfolioAnalysis('포트폴리오 데이터가 없습니다. Portfolio 페이지에서 자산을 추가해주세요.')
      return
    }

    setLoading(true)
    try {
      const prompt = buildPortfolioAnalysisPrompt(portfolioData, portfolioInsights, goalsSummary)
      const analysis = await aiService.routeAIRequest(
        prompt,
        aiService.TASK_LEVEL.ADVANCED,
        '당신은 자산관리 전문가(CFP)입니다. 포트폴리오를 정밀하게 분석하고 최적화 전략을 제시합니다.',
        selectedAI
      )
      setPortfolioAnalysis(analysis)
      appendHistory({
        id: Date.now(),
        type: 'portfolio',
        createdAt: new Date().toISOString(),
        summary: '포트폴리오 심층 분석',
        content: analysis
      })
    } catch (error) {
      setPortfolioAnalysis('분석 생성 중 오류가 발생했습니다. API 키를 확인해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const generateRiskAnalysis = async () => {
    if (!portfolioData) {
      setRiskAnalysis({ error: '포트폴리오 데이터가 없습니다.' })
      return
    }

    setLoading(true)
    try {
      const assets = Array.isArray(portfolioData.assets) ? portfolioData.assets : []
      if (!assets.length) {
        setRiskAnalysis({ error: '포트폴리오 자산 데이터가 부족합니다.' })
        return
      }

      const totalValue = assets.reduce((sum, asset) => {
        const valueKRW = Number(asset.valueKRW) || 0
        return sum + valueKRW
      }, 0)

      if (totalValue <= 0) {
        setRiskAnalysis({ error: '총 평가액이 0원입니다. 자산 데이터를 확인해주세요.' })
        return
      }

      const assetMetrics = assets.map(asset => {
        const valueKRW = Number(asset.valueKRW) || 0
        const profitPercent = Number(asset.profitPercent)
        const weight = valueKRW / totalValue
        return {
          symbol: asset.symbol,
          name: asset.name,
          type: asset.type,
          valueKRW,
          profitPercent: Number.isFinite(profitPercent) ? profitPercent : 0,
          weight
        }
      })

      const weightedReturn = assetMetrics.reduce(
        (sum, asset) => sum + asset.weight * asset.profitPercent,
        0
      )
      const weightedVariance = assetMetrics.reduce(
        (sum, asset) => sum + asset.weight * Math.pow(asset.profitPercent - weightedReturn, 2),
        0
      )
      const volatility = Math.sqrt(Math.max(weightedVariance, 0))
      const sharpeRatio = volatility > 0 ? weightedReturn / volatility : 0
      const concentrationIndex = assetMetrics.reduce(
        (sum, asset) => sum + Math.pow(asset.weight, 2),
        0
      )

      const valueAtRisk = totalValue * (Math.max(volatility, 0) / 100) * 1.65
      const expectedDrawdown = totalValue * (Math.max(volatility - Math.max(weightedReturn, 0), 0) / 100)

      const sortedByWeight = [...assetMetrics].sort((a, b) => b.weight - a.weight)
      const largestPosition = sortedByWeight[0]
      const worstAsset = [...assetMetrics].sort((a, b) => a.profitPercent - b.profitPercent)[0]

      const currencyExposure = portfolioInsights?.currencyExposure
        ? portfolioInsights.currencyExposure
        : (portfolioData.totals?.byCurrency || []).map(item => {
            const totalValueKRW = Number(item.totalValueKRW || item.totalValue) || 0
            const percent = totalValue > 0 ? (totalValueKRW / totalValue) * 100 : 0
            return {
              currency: item.currency,
              percent,
              totalValueKRW
            }
          }).sort((a, b) => b.percent - a.percent)

      const topCurrency = currencyExposure && currencyExposure.length ? currencyExposure[0] : null

      const riskLevel = volatility > 18 ? 'High' : volatility > 10 ? 'Medium' : 'Low'
      const diversificationScore = concentrationIndex < 0.2
        ? 'Excellent'
        : concentrationIndex < 0.35
          ? 'Good'
          : concentrationIndex < 0.5
            ? 'Fair'
            : 'Poor'

      const insights = []
      if (largestPosition && largestPosition.weight * 100 >= 35) {
        insights.push(`최대 보유 자산 ${largestPosition.symbol} 비중이 ${formatNumber(largestPosition.weight * 100, 1)}%로 높습니다.`)
      }
      if (topCurrency && topCurrency.percent >= 65) {
        insights.push(`${topCurrency.currency} 통화 노출이 ${formatNumber(topCurrency.percent, 1)}%로 집중되어 있습니다.`)
      }
      if (worstAsset && worstAsset.profitPercent <= -5) {
        insights.push(`부진한 자산 ${worstAsset.symbol} 수익률이 ${formatNumber(worstAsset.profitPercent, 1)}%입니다.`)
      }
      if (sharpeRatio < 0.5) {
        insights.push('샤프 비율이 0.5 미만으로 위험 대비 수익성이 낮습니다.')
      }
      if (expectedDrawdown > totalValue * 0.08) {
        insights.push(`1σ 기준 예상 하락폭이 약 ${formatCurrency(expectedDrawdown, 'KRW')}로 추정됩니다.`)
      }

      setRiskAnalysis({
        avgReturn: weightedReturn,
        volatility,
        sharpeRatio,
        concentrationIndex,
        riskLevel,
        diversificationScore,
        valueAtRisk,
        expectedDrawdown,
        largestPosition,
        weakestAsset: worstAsset,
        currencyExposure,
        insights,
        totalValue,
        totalProfit: portfolioData.totalProfit,
        generatedAt: new Date().toISOString()
      })
    } catch (error) {
      setRiskAnalysis({ error: '리스크 분석 중 오류가 발생했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  const generateRebalancingSuggestion = async () => {
    if (!portfolioData) {
      setRebalancingSuggestion('포트폴리오 데이터가 없습니다.')
      return
    }

    setLoading(true)
    try {
      const prompt = buildRebalancingPrompt(portfolioData, portfolioInsights, riskAnalysis)
      const suggestion = await aiService.routeAIRequest(
        prompt,
        aiService.TASK_LEVEL.ADVANCED,
        '당신은 자산배분 전문가입니다. 포트폴리오 리밸런싱 전략을 제시합니다.',
        selectedAI
      )
      setRebalancingSuggestion(suggestion)
      appendHistory({
        id: Date.now(),
        type: 'rebalancing',
        createdAt: new Date().toISOString(),
        summary: '리밸런싱 제안',
        content: suggestion
      })
    } catch (error) {
      setRebalancingSuggestion('리밸런싱 제안 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleChatSubmit = async (e) => {
    e.preventDefault()
    if (!chatInput.trim()) return

    const userMessage = chatInput
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])

    setLoading(true)
    try {
      const context = {
        portfolio: portfolioData,
        market: marketData,
        latestMarketReport: marketReport,
        latestPortfolioAnalysis: portfolioAnalysis,
        latestRebalancing: rebalancingSuggestion,
        riskAnalysis,
        goalsSummary,
        cashflow: cashflowInsights
      }

      const prompt = buildChatPrompt({
        userMessage,
        context,
        marketInsights,
        portfolioInsights
      })
      const response = await aiService.routeAIRequest(
        prompt,
        aiService.TASK_LEVEL.ADVANCED,
        '당신은 투자 전문가입니다. 사용자의 질문에 전문적이고 실용적인 답변을 제공합니다.',
        selectedAI
      )
      setChatMessages(prev => [...prev, { role: 'assistant', content: response }])
    } catch (error) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'AI API가 설정되지 않았습니다. .env 파일에 API 키를 설정해주세요.'
      }])
    } finally {
      setLoading(false)
    }
  }

  const renderHistory = () => {
    if (!analysisHistory.length) {
      return (
        <div className="border border-dashed border-gray-200 rounded-lg p-4 text-sm text-gray-500">
          아직 생성된 AI 리포트 기록이 없습니다.
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {analysisHistory.slice(0, 5).map(entry => (
          <div key={entry.id} className="border border-gray-200 rounded-lg p-4 bg-white space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-sm font-semibold text-gray-900">{entry.summary}</span>
                <p className="text-xs text-gray-500 mt-1 capitalize">
                  타입: {entry.type}
                </p>
              </div>
              <span className="text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap">
                <Clock className="w-3 h-3" />
                {new Date(entry.createdAt).toLocaleString('ko-KR')}
              </span>
            </div>
            <div className="text-xs text-gray-600 line-clamp-4 whitespace-pre-line">{entry.content}</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50"
                onClick={() => setHistoryViewer({ open: true, entry })}
              >
                전체 보기
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                onClick={() => copyToClipboard(entry.content, '클립보드에 복사되었습니다.', '복사에 실패했습니다. 브라우저 권한을 확인하세요.')}
              >
                복사
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                onClick={() => {
                  try {
                    const baseName = (entry.summary || 'ai_report').replace(/\s+/g, '_')
                    const filename = `${baseName}_${new Date(entry.createdAt).toISOString().slice(0, 10)}.md`
                    const blob = new Blob([entry.content], { type: 'text/markdown;charset=utf-8;' })
                    const url = URL.createObjectURL(blob)
                    const link = document.createElement('a')
                    link.href = url
                    link.download = filename
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                    URL.revokeObjectURL(url)
                  } catch (err) {
                    console.error('Download failed:', err)
                    window.alert('다운로드 생성에 실패했습니다.')
                  }
                }}
              >
                다운로드
              </button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary-100 rounded-lg">
            <Sparkles className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI 분석 리포트</h2>
            <p className="text-sm text-gray-600">AI 기반 시장 분석 및 포트폴리오 진단</p>
          </div>
        </div>
        <AIStrategyBadge />
      </div>

      {/* AI Model Selection */}
      <div className="card bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-white rounded-lg">
            <Zap className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-3">💡 AI 모델 선택</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedAI('auto')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedAI === 'auto'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 bg-white hover:border-purple-300'
                  }`}
                >
                  <div className="text-left">
                    <p className="font-semibold text-sm text-gray-900">🤖 자동 선택</p>
                    <p className="text-xs text-gray-600 mt-1">
                      작업에 맞게 AI 자동 배정
                    </p>
                    <p className="text-xs text-purple-600 mt-1">💰 비용 최적화</p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedAI('gpt')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedAI === 'gpt'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-green-300'
                  }`}
                >
                  <div className="text-left">
                    <p className="font-semibold text-sm text-gray-900">🧠 GPT-4.1</p>
                    <p className="text-xs text-gray-600 mt-1">
                      고급 분석 및 전략 수립
                    </p>
                    <p className="text-xs text-green-600 mt-1">⭐ 최고 성능</p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedAI('gemini')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedAI === 'gemini'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <div className="text-left">
                    <p className="font-semibold text-sm text-gray-900">⚡ Gemini 2.5 Flash</p>
                    <p className="text-xs text-gray-600 mt-1">
                      빠른 요약 및 기본 분석
                    </p>
                    <p className="text-xs text-blue-600 mt-1">🚀 빠른 속도</p>
                  </div>
                </button>
              </div>

              <div className="text-xs text-gray-600 bg-white p-2 rounded">
                <strong>현재 선택:</strong> {
                  selectedAI === 'auto' ? '🤖 자동 (작업별 최적 AI 선택)' :
                  selectedAI === 'gpt' ? '🧠 GPT-4.1 (모든 작업)' :
                  '⚡ Gemini 2.5 Flash (모든 작업)'
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('market')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'market'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          시장 리포트
        </button>
        <button
          onClick={() => setActiveTab('portfolio')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'portfolio'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          포트폴리오 진단
        </button>
        <button
          onClick={() => setActiveTab('stock')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'stock'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📊 종목 분석
        </button>
        <button
          onClick={() => setActiveTab('risk')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'risk'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          리스크 진단
        </button>
        <button
          onClick={() => setActiveTab('rebalancing')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'rebalancing'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          리밸런싱 제안
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === 'chat'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          AI 상담
        </button>
      </div>

      {/* Market Report Tab */}
      {activeTab === 'market' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>🧠 GPT-5 사용:</strong> 상세한 시장 분석 및 투자 전략을 제공합니다 (고급 분석)
            </p>
          </div>
          {marketInsights && (
            <div className="card border border-blue-100 bg-blue-50/60">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">데이터 기반 시장 요약</h4>
              <ul className="space-y-1 text-xs text-blue-800">
                {marketInsights.quickHighlights.slice(0, 4).map((item, idx) => (
                  <li key={idx}>• {item}</li>
                ))}
              </ul>
              {marketInsights.riskSignals.length > 0 && (
                <div className="mt-3 text-xs text-orange-800 bg-white/80 rounded-lg p-3 border border-orange-200">
                  <p className="font-medium mb-1">⚠️ 감지된 리스크</p>
                  <ul className="space-y-1">
                    {marketInsights.riskSignals.slice(0, 3).map((signal, idx) => (
                      <li key={idx}>- {signal}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-[11px] text-blue-700 mt-3">
                실시간 데이터 기반 자동 요약입니다. 추가적인 경제 지표와 뉴스 확인을 권장합니다.
              </p>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={generateMarketReport}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  AI 시장 리포트 생성
                </>
              )}
            </button>
            {marketReport && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(marketReport)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  복사
                </button>
                <button
                  type="button"
                  onClick={() => downloadReport('market_report', marketReport)}
                  className="px-3 py-1.5 text-xs font-medium text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
                >
                  다운로드
                </button>
              </div>
            )}
          </div>

          {marketReport && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-semibold text-gray-900">시장 분석 리포트</h3>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-white p-6 shadow-sm">
                <ReactMarkdown className="prose prose-slate max-w-none leading-relaxed marker:text-primary-500">
                  {marketReport}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {!marketReport && !loading && (
            <div className="card text-center py-12">
              <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">AI 시장 리포트를 생성하려면 버튼을 클릭하세요</p>
            </div>
          )}
        </div>
      )}

      {/* Portfolio Analysis Tab */}
      {activeTab === 'portfolio' && (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-purple-800">
              <strong>🧠 GPT-5 사용:</strong> 심층 포트폴리오 분석 및 최적화 전략을 제공합니다 (전문가급 분석)
            </p>
          </div>
          {portfolioInsights && (
            <div className="card border border-purple-100 bg-purple-50/60">
              <h4 className="text-sm font-semibold text-purple-900 mb-2">핵심 포트폴리오 인사이트</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-purple-800">
                <div>
                  <p className="font-medium mb-1">성과 요약</p>
                  <ul className="space-y-1">
                    {portfolioInsights.quickHighlights.slice(0, 3).map((item, idx) => (
                      <li key={idx}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-1">리스크 포인트</p>
                  <ul className="space-y-1">
                    {portfolioInsights.riskAlerts.length
                      ? portfolioInsights.riskAlerts.slice(0, 3).map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))
                      : <li>• 특이 리스크 없음</li>
                    }
                  </ul>
                </div>
              </div>
              {portfolioInsights.goalHighlights.length > 0 && (
                <div className="mt-3 text-xs text-purple-800 bg-white/70 rounded-lg p-3 border border-purple-100">
                  <p className="font-medium mb-1">목표 진행</p>
                  <ul className="space-y-1">
                    {portfolioInsights.goalHighlights.slice(0, 2).map((item, idx) => (
                      <li key={idx}>- {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={generatePortfolioAnalysis}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  AI 포트폴리오 진단
                </>
              )}
            </button>
            {portfolioAnalysis && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(portfolioAnalysis)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  복사
                </button>
                <button
                  type="button"
                  onClick={() => downloadReport('portfolio_analysis', portfolioAnalysis)}
                  className="px-3 py-1.5 text-xs font-medium text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
                >
                  다운로드
                </button>
              </div>
            )}
          </div>

          {portfolioAnalysis && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-semibold text-gray-900">포트폴리오 진단 결과</h3>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-white p-6 shadow-sm">
                <ReactMarkdown className="prose prose-slate max-w-none leading-relaxed marker:text-primary-500">
                  {portfolioAnalysis}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {!portfolioAnalysis && !loading && (
            <div className="card text-center py-12">
              <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">AI 포트폴리오 진단을 시작하려면 버튼을 클릭하세요</p>
            </div>
          )}
        </div>
      )}

      {/* Stock Analysis Tab */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-teal-800">
              <strong>🔍 종목 심층 분석:</strong> AI로 기본 분석 제공 + Perplexity에서 최신 실시간 정보 검색
            </p>
          </div>

          {/* 종목 선택 */}
          <div className="card">
            <h4 className="text-sm font-medium text-gray-700 mb-3">📊 분석할 종목 선택</h4>
            {portfolioData && portfolioData.assets && portfolioData.assets.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {portfolioData.assets.map((asset) => (
                  <button
                    key={asset.symbol}
                    onClick={() => setSelectedStock(asset)}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      selectedStock?.symbol === asset.symbol
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 bg-white hover:border-teal-300'
                    }`}
                  >
                    <p className="font-semibold text-sm text-gray-900">{asset.symbol}</p>
                    <p className="text-xs text-gray-600 mt-1 truncate">{asset.name}</p>
                    <p className={`text-xs mt-1 font-medium ${
                      asset.profitPercent >= 0 ? 'text-success' : 'text-danger'
                    }`}>
                      {asset.profitPercent >= 0 ? '+' : ''}{asset.profitPercent.toFixed(1)}%
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">포트폴리오에 자산이 없습니다.</p>
                <p className="text-xs mt-1">Portfolio 페이지에서 자산을 추가해주세요.</p>
              </div>
            )}
          </div>

          {/* 선택된 종목 정보 및 분석 버튼 */}
          {selectedStock && (
            <>
              <div className="card bg-gradient-to-br from-teal-50 to-blue-50 border-teal-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{selectedStock.symbol}</h3>
                    <p className="text-sm text-gray-600 mt-1">{selectedStock.name}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">현재가</p>
                        <p className="font-semibold text-gray-900">
                          {selectedStock.currency === 'KRW'
                            ? `₩${selectedStock.currentPrice.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`
                            : `$${selectedStock.currentPrice.toFixed(2)}`
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">수익률</p>
                        <p className={`font-semibold ${selectedStock.profitPercent >= 0 ? 'text-success' : 'text-danger'}`}>
                          {selectedStock.profitPercent >= 0 ? '+' : ''}{selectedStock.profitPercent.toFixed(2)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">보유 수량</p>
                        <p className="font-semibold text-gray-900">{selectedStock.quantity}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">자산 유형</p>
                        <p className="font-semibold text-gray-900">{selectedStock.type}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI 분석 + Perplexity 검색 버튼 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={async () => {
                    setLoading(true)
                    setStockAnalysis('')
                    try {
                      const prompt = `다음 종목에 대해 투자자 관점에서 심층 분석해주세요:

**종목 정보:**
- 티커: ${selectedStock.symbol}
- 종목명: ${selectedStock.name}
- 현재가: ${selectedStock.currency === 'KRW' ? `₩${selectedStock.currentPrice.toLocaleString()}` : `$${selectedStock.currentPrice.toFixed(2)}`}
- 보유 수익률: ${selectedStock.profitPercent.toFixed(2)}%
- 자산 유형: ${selectedStock.type}

**분석 요청 사항:**
1. 기업 개요 및 사업 모델
2. 최근 재무 상태 평가 (2023년까지 데이터 기준)
3. 산업 트렌드 및 경쟁 우위
4. 투자 리스크 요인
5. 중장기 투자 전망 및 추천 의견

**출력 형식:**
- 명확한 섹션별 구분
- 핵심 내용 위주로 간결하게
- 투자자 관점의 실용적인 분석`

                      const analysis = await aiService.routeAIRequest(
                        prompt,
                        aiService.TASK_LEVEL.ADVANCED,
                        '당신은 20년 경력의 증권 애널리스트입니다. 기업의 펀더멘털과 투자 가치를 정밀하게 분석합니다.',
                        selectedAI
                      )
                      setStockAnalysis(analysis)
                      appendHistory({
                        id: Date.now(),
                        type: 'stock',
                        createdAt: new Date().toISOString(),
                        summary: `종목 분석: ${selectedStock.symbol}`,
                        content: analysis
                      })
                    } catch (error) {
                      setStockAnalysis('AI 분석 생성 중 오류가 발생했습니다. API 키를 확인해주세요.')
                    } finally {
                      setLoading(false)
                    }
                  }}
                  disabled={loading}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      AI 분석 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      {selectedAI === 'gpt' ? '🧠 GPT' : selectedAI === 'gemini' ? '⚡ Gemini' : '🤖 AI'} 기본 분석 생성
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    const searchQuery = `${selectedStock.symbol} ${selectedStock.name} 주식 종목 분석 실적 전망 2025 한국어로 답변`
                    const perplexityUrl = `https://www.perplexity.ai/search/new?q=${encodeURIComponent(searchQuery)}`
                    window.open(perplexityUrl, '_blank', 'noopener,noreferrer')
                  }}
                  className="btn-secondary flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 hover:from-purple-700 hover:to-blue-700"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                  🔍 Perplexity에서 최신 정보 검색
                </button>
              </div>

              {/* AI 분석 결과 */}
              {stockAnalysis && (
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-teal-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        AI 종목 분석: {selectedStock.symbol}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(stockAnalysis)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        복사
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadReport(`stock_analysis_${selectedStock.symbol}`, stockAnalysis)}
                        className="px-3 py-1.5 text-xs font-medium text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
                      >
                        다운로드
                      </button>
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                    <p className="text-xs text-amber-800">
                      ⚠️ <strong>참고:</strong> 이 분석은 AI가 2023년까지의 학습 데이터를 기반으로 작성되었습니다.
                      최신 실적, 뉴스, 전망은 위 "Perplexity에서 최신 정보 검색" 버튼을 클릭하여 확인하세요.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-white p-6 shadow-sm">
                    <ReactMarkdown className="prose prose-slate max-w-none leading-relaxed marker:text-primary-500">
                      {stockAnalysis}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {!stockAnalysis && !loading && (
                <div className="card text-center py-12 border-2 border-dashed border-gray-300">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">
                    "{selectedStock.symbol}" 종목 분석을 시작하세요
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    AI 기본 분석 또는 Perplexity 최신 검색 중 선택하세요
                  </p>
                </div>
              )}
            </>
          )}

          {!selectedStock && (
            <div className="card text-center py-12 border-2 border-dashed border-teal-200">
              <TrendingUp className="w-12 h-12 text-teal-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">분석할 종목을 선택해주세요</p>
              <p className="text-sm text-gray-500 mt-2">
                위 목록에서 종목을 클릭하면 심층 분석을 시작할 수 있습니다
              </p>
            </div>
          )}
        </div>
      )}

      {/* Risk Analysis Tab */}
      {activeTab === 'risk' && (
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-orange-800">
              <strong>📊 자동 계산:</strong> 포트폴리오의 변동성, 샤프지수, 집중도를 분석합니다
            </p>
          </div>
          <button
            onClick={generateRiskAnalysis}
            disabled={loading || !portfolioData}
            className="btn-primary flex items-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                분석 중...
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5" />
                리스크 진단 시작
              </>
            )}
          </button>

          {riskAnalysis && !riskAnalysis.error && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card">
                  <h4 className="text-sm font-medium text-gray-600 mb-3">수익률 지표</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500">가중 평균 수익률</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {Number.isFinite(riskAnalysis.avgReturn)
                          ? `${riskAnalysis.avgReturn >= 0 ? '+' : ''}${formatNumber(riskAnalysis.avgReturn, 2)}%`
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">샤프 비율 (Sharpe Ratio)</p>
                      <p className="text-2xl font-bold text-primary-600">
                        {formatNumber(riskAnalysis.sharpeRatio, 2)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {Number(riskAnalysis.sharpeRatio) > 1
                          ? '우수'
                          : Number(riskAnalysis.sharpeRatio) > 0.5
                            ? '양호'
                            : '개선 필요'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h4 className="text-sm font-medium text-gray-600 mb-3">리스크 지표</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500">변동성 (Volatility)</p>
                      <p
                        className={`text-2xl font-bold ${
                          riskAnalysis.riskLevel === 'High'
                            ? 'text-danger'
                            : riskAnalysis.riskLevel === 'Medium'
                              ? 'text-warning'
                              : 'text-success'
                        }`}
                      >
                        {Number.isFinite(riskAnalysis.volatility)
                          ? `${formatNumber(riskAnalysis.volatility, 2)}%`
                          : 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">위험도: {riskAnalysis.riskLevel}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">분산 점수</p>
                      <p
                        className={`text-lg font-bold ${
                          riskAnalysis.diversificationScore === 'Excellent'
                            ? 'text-success'
                            : riskAnalysis.diversificationScore === 'Good'
                              ? 'text-success'
                              : riskAnalysis.diversificationScore === 'Fair'
                                ? 'text-warning'
                                : 'text-danger'
                        }`}
                      >
                        {riskAnalysis.diversificationScore}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        집중도 지수: {formatNumber(riskAnalysis.concentrationIndex, 3)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card">
                  <h4 className="text-sm font-medium text-gray-600 mb-3">잠재 손실 추정</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500">1σ 기준 예상 하락폭</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {formatCurrency(riskAnalysis.expectedDrawdown, 'KRW')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">95% VaR (단순 추정)</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {formatCurrency(riskAnalysis.valueAtRisk, 'KRW')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        통계적 추정치이며 실제 시장 변동과 차이가 있을 수 있습니다.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h4 className="text-sm font-medium text-gray-600 mb-3">집중도 & 노출</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    {riskAnalysis.largestPosition ? (
                      <p>
                        최대 보유 자산: <strong>{riskAnalysis.largestPosition.symbol}</strong>{' '}
                        ({formatNumber(riskAnalysis.largestPosition.weight * 100, 1)}% 비중,
                        수익률 {formatNumber(riskAnalysis.largestPosition.profitPercent, 1)}%)
                      </p>
                    ) : (
                      <p>최대 보유 자산 정보 없음</p>
                    )}
                    {riskAnalysis.weakestAsset ? (
                      <p>
                        부진 자산: <strong>{riskAnalysis.weakestAsset.symbol}</strong>{' '}
                        ({formatNumber(riskAnalysis.weakestAsset.profitPercent, 1)}%)
                      </p>
                    ) : (
                      <p>부진 자산 정보 없음</p>
                    )}
                    {riskAnalysis.currencyExposure && riskAnalysis.currencyExposure.length ? (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1">상위 통화 노출</p>
                        <ul className="space-y-1">
                          {riskAnalysis.currencyExposure.slice(0, 3).map(item => (
                            <li key={item.currency} className="text-xs text-gray-600">
                              {item.currency}: {formatNumber(item.percent, 1)}%
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">통화 노출 데이터 없음</p>
                    )}
                  </div>
                </div>
              </div>

              {riskAnalysis.insights && riskAnalysis.insights.length > 0 && (
                <div className="card border-l-4 border-orange-300 bg-orange-50">
                  <h4 className="text-sm font-semibold text-orange-900 mb-2">리스크 주요 포인트</h4>
                  <ul className="space-y-1 text-xs text-orange-800">
                    {riskAnalysis.insights.map((item, idx) => (
                      <li key={idx}>• {item}</li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-orange-700 mt-3">
                    자동 계산 지표는 참고용이며, 실제 의사결정 시 추가 데이터 확인과 전문가 상담이 필요합니다.
                  </p>
                </div>
              )}
            </div>
          )}

          {riskAnalysis && riskAnalysis.error && (
            <div className="card text-center py-12">
              <AlertTriangle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
              <p className="text-gray-600">{riskAnalysis.error}</p>
            </div>
          )}

          {!riskAnalysis && !loading && (
            <div className="card text-center py-12">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">리스크 진단을 시작하려면 버튼을 클릭하세요</p>
            </div>
          )}
        </div>
      )}

      {/* Rebalancing Tab */}
      {activeTab === 'rebalancing' && (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-indigo-800">
              <strong>🧠 GPT-5 사용:</strong> AI가 최적 자산 배분 및 리밸런싱 전략을 제안합니다
            </p>
          </div>
          {portfolioInsights && (
            <div className="card border border-indigo-100 bg-indigo-50/60">
              <h4 className="text-sm font-semibold text-indigo-900 mb-2">리밸런싱 참고 지표</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-indigo-900">
                <div>
                  <p className="font-medium mb-1">과도 비중</p>
                  <ul className="space-y-1">
                    {portfolioInsights.overweightTypes.length
                      ? portfolioInsights.overweightTypes.map((item, idx) => (
                          <li key={idx}>• {item.type}: {formatNumber(item.percent, 1)}%</li>
                        ))
                      : <li>• 과도 비중 섹터 없음</li>
                    }
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-1">부족 비중</p>
                  <ul className="space-y-1">
                    {portfolioInsights.underweightTypes.length
                      ? portfolioInsights.underweightTypes.map((item, idx) => (
                          <li key={idx}>• {item.type}: {formatNumber(item.percent, 1)}%</li>
                        ))
                      : <li>• 부족 비중 섹터 없음</li>
                    }
                  </ul>
                </div>
              </div>
              {portfolioInsights.currencyExposure.length > 0 && (
                <div className="mt-3 text-xs text-indigo-900">
                  <p className="font-medium mb-1">통화 노출 상위</p>
                  <ul className="space-y-1">
                    {portfolioInsights.currencyExposure.slice(0, 3).map((item, idx) => (
                      <li key={idx}>- {item.currency}: {formatNumber(item.percent, 1)}%</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <button
            onClick={generateRebalancingSuggestion}
            disabled={loading || !portfolioData}
            className="btn-primary flex items-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <TrendingUp className="w-5 h-5" />
                리밸런싱 제안 생성
              </>
            )}
          </button>
          {rebalancingSuggestion && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(rebalancingSuggestion)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                복사
              </button>
              <button
                type="button"
                onClick={() => downloadReport('rebalancing_plan', rebalancingSuggestion)}
                className="px-3 py-1.5 text-xs font-medium text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
              >
                다운로드
              </button>
            </div>
          )}

          {rebalancingSuggestion && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-semibold text-gray-900">리밸런싱 전략 제안</h3>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-white p-6 shadow-sm">
                <ReactMarkdown className="prose prose-slate max-w-none leading-relaxed marker:text-primary-500">
                  {rebalancingSuggestion}
                </ReactMarkdown>
              </div>
            </div>
          )}

      {!rebalancingSuggestion && !loading && (
        <div className="card text-center py-12">
          <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">리밸런싱 제안을 생성하려면 버튼을 클릭하세요</p>
        </div>
      )}
    </div>
  )}

  {/* Report History */}
  <div className="card">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Archive className="w-5 h-5 text-primary-600" />
        <h3 className="text-lg font-semibold text-gray-900">최근 생성된 AI 리포트</h3>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">
          최대 20개의 기록을 저장하며, 최신 5개만 표시합니다.
        </span>
        <button
          type="button"
          className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          onClick={downloadHistory}
        >
          전체 히스토리 다운로드
        </button>
      </div>
    </div>
    {renderHistory()}
  </div>

  {historyViewer.open && historyViewer.entry && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{historyViewer.entry.summary}</h3>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(historyViewer.entry.createdAt).toLocaleString('ko-KR')} · {historyViewer.entry.type}
            </p>
          </div>
          <button
            type="button"
            className="text-gray-500 hover:text-gray-700"
            onClick={() => setHistoryViewer({ open: false, entry: null })}
          >
            ✖
          </button>
        </div>
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
          <div className="markdown-body text-sm text-gray-800">
            <ReactMarkdown>{historyViewer.entry.content}</ReactMarkdown>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => copyToClipboard(historyViewer.entry.content)}
          >
            복사
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              try {
                const baseName = (historyViewer.entry.summary || 'ai_report').replace(/\s+/g, '_')
                const filename = `${baseName}_${new Date(historyViewer.entry.createdAt).toISOString().slice(0, 10)}.md`
                const blob = new Blob([historyViewer.entry.content], { type: 'text/markdown;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = filename
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                URL.revokeObjectURL(url)
              } catch (err) {
                console.error('Download failed:', err)
                window.alert('다운로드 생성에 실패했습니다.')
              }
            }}
          >
            다운로드
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
            onClick={() => setHistoryViewer({ open: false, entry: null })}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )}

  {/* AI Chat Tab */}
  {activeTab === 'chat' && (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-800">
              <strong>🧠 GPT-5 사용:</strong> 투자 전문가 수준의 맞춤형 상담을 제공합니다
            </p>
          </div>
          {cashflowInsights && (
            <div className="card border border-green-100 bg-green-50/60">
              <h4 className="text-sm font-semibold text-green-900 mb-2">자산 현황 요약</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-green-900">
                <div>
                  <p className="font-medium mb-1">누적 자산 & 연간 흐름</p>
                  <ul className="space-y-1">
                    <li>• 총자산: {formatCurrency(cashflowInsights.totalAssets, 'KRW')}</li>
                    <li>• 연간 순변화: {formatCurrency(cashflowInsights.annualNetChange, 'KRW')}</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-1">월평균 수입/지출</p>
                  <ul className="space-y-1">
                    <li>• 수입: {formatCurrency(cashflowInsights.averageMonthlyIncome, 'KRW')}</li>
                    <li>• 지출: {formatCurrency(cashflowInsights.averageMonthlyExpense, 'KRW')}</li>
                  </ul>
                </div>
              </div>
              {cashflowInsights.latestMonth && (
                <div className="mt-3 text-xs text-green-900">
                  <p className="font-medium mb-1">최근 월({cashflowInsights.latestMonth.label})</p>
                  <ul className="space-y-1">
                    <li>- 수입: {formatCurrency(cashflowInsights.latestMonth.income, 'KRW')}</li>
                    <li>- 지출: {formatCurrency(cashflowInsights.latestMonth.expense, 'KRW')}</li>
                    <li>- 순변화: {formatCurrency(cashflowInsights.latestMonth.netChange, 'KRW')}</li>
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="card">
            <div className="flex flex-col h-[600px]">
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-12">
                    <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">AI에게 투자 관련 질문을 해보세요</p>
                    <p className="text-sm text-gray-500 mt-2">예: &quot;지금 S&amp;P 500에 투자하는 것이 좋을까요?&quot;</p>
                  </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <pre className="whitespace-pre-wrap text-sm font-sans">
                        {msg.content}
                      </pre>
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-3">
                    <RefreshCw className="w-5 h-5 animate-spin text-gray-600" />
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleChatSubmit} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="질문을 입력하세요..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !chatInput.trim()}
                className="btn-primary px-6"
              >
                전송
              </button>
            </form>
          </div>
        </div>
        </div>
      )}
    </div>
  )
}

export default AIReport
