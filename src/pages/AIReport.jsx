import { useState, useEffect, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Sparkles, FileText, RefreshCw, Zap, TrendingUp, AlertTriangle, Clock, Archive, Wand2, Plus, Minus } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, RadialBarChart, RadialBar } from 'recharts'
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
  buildOptimizationPrompt,
  buildChatPrompt
} from '../utils/aiInsights'

// Dark mode markdown components with inline styles (bypasses all CSS cascade issues)
// IMPORTANT: {...rest} is spread FIRST, then style={} LAST so our colors always win
const darkMarkdownComponents = {
  p: ({ children, node, style, ...rest }) => <p {...rest} style={{ ...style, color: '#f3f4f6', marginBottom: '0.5rem' }}>{children}</p>,
  span: ({ children, node, style, ...rest }) => <span {...rest} style={{ ...style, color: '#f3f4f6' }}>{children}</span>,
  strong: ({ children, node, style, ...rest }) => <strong {...rest} style={{ ...style, color: '#ffffff', fontWeight: 700 }}>{children}</strong>,
  b: ({ children, node, style, ...rest }) => <b {...rest} style={{ ...style, color: '#ffffff', fontWeight: 700 }}>{children}</b>,
  em: ({ children, node, style, ...rest }) => <em {...rest} style={{ ...style, color: '#e5e7eb' }}>{children}</em>,
  h1: ({ children, node, style, ...rest }) => <h1 {...rest} style={{ ...style, color: '#ffffff', fontSize: '1.5rem', fontWeight: 700, marginTop: '1.5rem', marginBottom: '0.75rem' }}>{children}</h1>,
  h2: ({ children, node, style, ...rest }) => <h2 {...rest} style={{ ...style, color: '#ffffff', fontSize: '1.25rem', fontWeight: 600, marginTop: '1.25rem', marginBottom: '0.5rem' }}>{children}</h2>,
  h3: ({ children, node, style, ...rest }) => <h3 {...rest} style={{ ...style, color: '#ffffff', fontSize: '1.1rem', fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem' }}>{children}</h3>,
  h4: ({ children, node, style, ...rest }) => <h4 {...rest} style={{ ...style, color: '#ffffff', fontSize: '1rem', fontWeight: 600, marginTop: '0.75rem', marginBottom: '0.25rem' }}>{children}</h4>,
  h5: ({ children, node, style, ...rest }) => <h5 {...rest} style={{ ...style, color: '#ffffff', fontSize: '0.9rem', fontWeight: 600 }}>{children}</h5>,
  h6: ({ children, node, style, ...rest }) => <h6 {...rest} style={{ ...style, color: '#ffffff', fontSize: '0.85rem', fontWeight: 600 }}>{children}</h6>,
  li: ({ children, node, style, ...rest }) => <li {...rest} style={{ ...style, color: '#f3f4f6', marginBottom: '0.25rem' }}>{children}</li>,
  ul: ({ children, node, style, ...rest }) => <ul {...rest} style={{ ...style, color: '#f3f4f6', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>{children}</ul>,
  ol: ({ children, node, style, ...rest }) => <ol {...rest} style={{ ...style, color: '#f3f4f6', paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>{children}</ol>,
  a: ({ children, node, style, ...rest }) => <a {...rest} style={{ ...style, color: '#60a5fa', textDecoration: 'underline' }}>{children}</a>,
  blockquote: ({ children, node, style, ...rest }) => <blockquote {...rest} style={{ ...style, color: '#e5e7eb', borderLeft: '3px solid #3b82f6', paddingLeft: '1rem', margin: '0.75rem 0' }}>{children}</blockquote>,
  code: ({ children, node, inline, style, ...rest }) => inline
    ? <code {...rest} style={{ ...style, color: '#e5e7eb', backgroundColor: '#374151', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', fontSize: '0.85em' }}>{children}</code>
    : <code {...rest} style={{ ...style, color: '#e5e7eb' }}>{children}</code>,
  pre: ({ children, node, style, ...rest }) => <pre {...rest} style={{ ...style, backgroundColor: '#1e293b', color: '#e5e7eb', padding: '1rem', borderRadius: '0.5rem', overflow: 'auto', margin: '0.75rem 0' }}>{children}</pre>,
  table: ({ children, node, style, ...rest }) => <table {...rest} style={{ ...style, width: '100%', borderCollapse: 'collapse', margin: '1rem 0', fontSize: '0.875rem', backgroundColor: '#1e293b', color: '#f3f4f6' }}>{children}</table>,
  thead: ({ children, node, style, ...rest }) => <thead {...rest} style={{ ...style, backgroundColor: '#334155', color: '#ffffff' }}>{children}</thead>,
  tbody: ({ children, node, style, ...rest }) => <tbody {...rest} style={{ ...style, backgroundColor: '#1e293b', color: '#f3f4f6' }}>{children}</tbody>,
  th: ({ children, node, style, ...rest }) => <th {...rest} style={{ ...style, color: '#ffffff', fontWeight: 600, padding: '0.5rem 0.75rem', border: '1px solid #475569', textAlign: 'left', backgroundColor: '#334155' }}>{children}</th>,
  td: ({ children, node, style, ...rest }) => <td {...rest} style={{ ...style, color: '#f3f4f6', padding: '0.5rem 0.75rem', border: '1px solid #475569', backgroundColor: '#1e293b' }}>{children}</td>,
  tr: ({ children, node, style, ...rest }) => <tr {...rest} style={{ ...style, borderBottom: '1px solid #475569', backgroundColor: '#1e293b', color: '#f3f4f6' }}>{children}</tr>,
  hr: ({ node, style, ...rest }) => <hr {...rest} style={{ ...style, borderColor: '#4b5563', margin: '1rem 0' }} />,
  del: ({ children, node, style, ...rest }) => <del {...rest} style={{ ...style, color: '#9ca3af' }}>{children}</del>,
  img: ({ node, style, alt, ...rest }) => <img {...rest} alt={alt} style={{ ...style, maxWidth: '100%', borderRadius: '0.5rem', margin: '0.5rem 0' }} />,
}

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
  const [customStockCode, setCustomStockCode] = useState('') // 직접 입력 종목코드
  const [customStockName, setCustomStockName] = useState('') // 직접 입력 종목명
  const [stockAnalysis, setStockAnalysis] = useState('')     // 종목 분석 결과명
  const [stockEnrichedData, setStockEnrichedData] = useState(null) // Finnhub 보강 데이터
  const [stockCompareMode, setStockCompareMode] = useState(false) // 비교 모드
  const [compareStock, setCompareStock] = useState(null) // 비교 대상 종목

  // AI Features Expansion
  const [timingAnalysis, setTimingAnalysis] = useState('')  // AI 매매 타이밍
  const [newsSummary, setNewsSummary] = useState('')        // 뉴스 요약
  const [selectedStocksForAI, setSelectedStocksForAI] = useState([])  // 선택된 종목 목록
  const [customAISymbol, setCustomAISymbol] = useState('')  // 직접 입력 종목 심볼

  // Rebalancing target allocation
  const [targetAllocation, setTargetAllocation] = useState({})  // { symbol: targetPercent }
  const [showRebalanceCalc, setShowRebalanceCalc] = useState(false)


  const marketInsights = useMemo(() => computeMarketInsights(marketData), [marketData])
  const portfolioInsights = useMemo(
    () => computePortfolioInsights(portfolioData, goalsSummary),
    [portfolioData, goalsSummary]
  )

  // Chart colors and data
  const CHART_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#14B8A6']

  const allocationChartData = useMemo(() => {
    if (!portfolioData?.assets?.length) return []
    const totalValue = portfolioData.assets.reduce((sum, a) => sum + (a.valueKRW || 0), 0)
    return portfolioData.assets.map((asset, idx) => ({
      name: asset.symbol,
      value: asset.valueKRW || 0,
      percent: ((asset.valueKRW || 0) / totalValue * 100).toFixed(1),
      fill: CHART_COLORS[idx % CHART_COLORS.length]
    }))
  }, [portfolioData])

  const rebalanceChartData = useMemo(() => {
    if (!portfolioData?.assets?.length) return []
    const totalValue = portfolioData.assets.reduce((sum, a) => sum + (a.valueKRW || 0), 0)
    return portfolioData.assets.map((asset, idx) => {
      const current = ((asset.valueKRW || 0) / totalValue * 100)
      const target = targetAllocation[asset.symbol] ?? current
      return {
        name: asset.symbol,
        current: parseFloat(current.toFixed(1)),
        target: parseFloat(target.toFixed(1)),
        fill: CHART_COLORS[idx % CHART_COLORS.length]
      }
    })
  }, [portfolioData, targetAllocation])

  // Load real market and portfolio data
  useEffect(() => {
    loadRealData()
    loadHistory()
    // 채팅 히스토리 불러오기
    try {
      const savedChat = localStorage.getItem('ai_chat_history')
      if (savedChat) {
        const parsed = JSON.parse(savedChat)
        if (Array.isArray(parsed)) {
          setChatMessages(parsed)
        }
      }
    } catch (e) {
      console.error('Failed to load chat history:', e)
    }
  }, [])

  // 채팅 히스토리 자동 저장
  useEffect(() => {
    if (chatMessages.length > 0) {
      try {
        // 최근 50개 메시지만 저장
        const toSave = chatMessages.slice(-50)
        localStorage.setItem('ai_chat_history', JSON.stringify(toSave))
      } catch (e) {
        console.error('Failed to save chat history:', e)
      }
    }
  }, [chatMessages])

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
      // AI 분석용 데이터 준비
      const promptData = {
        ...marketData,
        interestRates: marketData.interestRates ? {
          fedFunds: `${marketData.interestRates.fedRate.value}% (${marketData.interestRates.fedRate.date})`,
          treasury10y: `${marketData.interestRates.treasury10y.value}% (${marketData.interestRates.treasury10y.date})`
        } : '데이터 없음'
      }

      const prompt = buildMarketReportPrompt(promptData, marketInsights)
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

      const riskData = {
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
      }

      // AI 해석 생성
      const riskDataForAI = {
        riskLevel,
        volatility: volatility.toFixed(2),
        sharpeRatio: sharpeRatio.toFixed(2),
        diversificationScore,
        valueAtRisk: formatCurrency(valueAtRisk, 'KRW'),
        concentrationIndex: (concentrationIndex * 100).toFixed(1) + '%',
        largestAsset: largestPosition?.symbol,
        largestWeight: (largestPosition?.weight * 100).toFixed(1) + '%',
        weakestAsset: worstAsset?.symbol,
        weakestReturn: worstAsset?.profitPercent?.toFixed(1) + '%',
        insights
      }

      const aiPrompt = `당신은 포트폴리오 리스크 관리 전문가입니다. 다음 리스크 분석 결과를 해석하고 구체적인 조언을 제공해주세요.

[리스크 분석 데이터]
- 리스크 등급: ${riskDataForAI.riskLevel}
- 변동성: ${riskDataForAI.volatility}%
- 샤프 비율: ${riskDataForAI.sharpeRatio}
- 분산투자 점수: ${riskDataForAI.diversificationScore}
- VaR (95%): ${riskDataForAI.valueAtRisk}
- 집중도 지수: ${riskDataForAI.concentrationIndex}
- 최대 비중 자산: ${riskDataForAI.largestAsset} (${riskDataForAI.largestWeight})
- 최저 수익 자산: ${riskDataForAI.weakestAsset} (${riskDataForAI.weakestReturn})

[자동 생성된 인사이트]
${insights.map(i => '- ' + i).join('\n')}

다음 형식으로 분석해주세요:

## 📊 리스크 요약
(현재 포트폴리오의 리스크 수준을 2-3문장으로 요약)

## ⚠️ 주요 위험 요인
(가장 중요한 리스크 요인 2-3가지)

## 💡 개선 권고사항
(구체적이고 실행 가능한 조언 3가지)

## 🎯 목표 리스크 수준
(이 포트폴리오에 적합한 리스크 관리 목표)`

      try {
        const aiInterpretation = await aiService.routeAIRequest(
          aiPrompt,
          aiService.TASK_LEVEL.ADVANCED,
          '당신은 포트폴리오 리스크 관리 전문가입니다. 수치를 이해하기 쉽게 해석하고 실용적인 조언을 제공합니다.',
          selectedAI
        )
        riskData.aiInterpretation = aiInterpretation
      } catch (aiError) {
        console.error('AI interpretation failed:', aiError)
        riskData.aiInterpretation = null
      }

      setRiskAnalysis(riskData)

      // 히스토리에 추가
      if (riskData.aiInterpretation) {
        appendHistory({
          id: Date.now(),
          type: 'risk',
          createdAt: new Date().toISOString(),
          summary: '리스크 분석 AI 해석',
          content: riskData.aiInterpretation
        })
      }
    } catch (error) {
      setRiskAnalysis({ error: '리스크 분석 중 오류가 발생했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  const optimizeAllocation = async () => {
    if (!portfolioData?.assets?.length) return

    setLoading(true)
    try {
      const prompt = buildOptimizationPrompt(portfolioData, marketInsights, riskAnalysis)
      const response = await aiService.routeAIRequest(
        prompt,
        aiService.TASK_LEVEL.ADVANCED,
        '당신은 최고급 퀀트 투자 AI입니다. 반드시 순수 JSON 객체 형태로만 응답하세요.',
        selectedAI
      )
      
      // 파싱 시도 (마크다운 등이 섞여있을 수 있으므로 정규식으로 JSON 추출 시도)
      let jsonStr = response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonStr = jsonMatch[0]
      }
      
      const newAllocation = JSON.parse(jsonStr)
      
      // 유효성 검사
      const validatedAllocation = {}
      portfolioData.assets.forEach(asset => {
        const val = Number(newAllocation[asset.symbol])
        if (!isNaN(val) && val >= 0) {
          validatedAllocation[asset.symbol] = val
        } else {
          validatedAllocation[asset.symbol] = 0
        }
      })
      
      setTargetAllocation(validatedAllocation)
      
    } catch (error) {
      console.error('Failed to optimize allocation:', error)
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
      const prompt = buildRebalancingPrompt(portfolioData, portfolioInsights, riskAnalysis, targetAllocation, calculateRebalanceTrades)
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

  // 리밸런싱 매매 금액 계산
  const calculateRebalanceTrades = useMemo(() => {
    if (!portfolioData?.assets?.length) return []

    const totalValue = portfolioData.assets.reduce((sum, a) => sum + (a.valueKRW || 0), 0)
    if (totalValue <= 0) return []

    return portfolioData.assets.map(asset => {
      const currentPercent = ((asset.valueKRW || 0) / totalValue) * 100
      const targetPercent = targetAllocation[asset.symbol] ?? currentPercent
      const diff = targetPercent - currentPercent
      const tradeAmount = (totalValue * diff) / 100

      return {
        symbol: asset.symbol,
        name: asset.name || asset.type,
        currentValue: asset.valueKRW || 0,
        currentPercent,
        targetPercent,
        diff,
        tradeAmount,
        action: tradeAmount > 1000 ? 'BUY' : tradeAmount < -1000 ? 'SELL' : 'HOLD'
      }
    }).filter(t => Math.abs(t.tradeAmount) > 1000)
  }, [portfolioData, targetAllocation])

  // 목표 비율 초기화 (현재 비율로)
  const initTargetAllocation = () => {
    if (!portfolioData?.assets?.length) return
    const totalValue = portfolioData.assets.reduce((sum, a) => sum + (a.valueKRW || 0), 0)
    const initial = {}
    portfolioData.assets.forEach(asset => {
      initial[asset.symbol] = Math.round(((asset.valueKRW || 0) / totalValue) * 100 * 10) / 10
    })
    setTargetAllocation(initial)
  }

  const handleChatSubmit = async (e) => {
    e.preventDefault()
    if (!chatInput.trim()) return

    const userMessage = chatInput
    setChatInput('')
    const updatedMessages = [...chatMessages, { role: 'user', content: userMessage }]
    setChatMessages(updatedMessages)

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

      // 최근 대화 히스토리를 프롬프트에 포함 (최대 10개)
      const recentHistory = updatedMessages.slice(-10)
      const historyText = recentHistory.length > 1
        ? '\n\n[이전 대화 내역]\n' + recentHistory.slice(0, -1).map(m =>
          m.role === 'user' ? `사용자: ${m.content}` : `AI: ${m.content.substring(0, 500)}${m.content.length > 500 ? '...' : ''}`
        ).join('\n') + '\n\n[현재 질문]\n' + userMessage
        : userMessage

      const prompt = buildChatPrompt({
        userMessage: historyText,
        context,
        marketInsights,
        portfolioInsights
      })
      const response = await aiService.routeAIRequest(
        prompt,
        aiService.TASK_LEVEL.ADVANCED,
        '당신은 최고급 투자 전문가 AI 어시스턴트입니다. 사용자의 포트폴리오와 시장 데이터를 바탕으로 전문적이고 실용적인 답변을 마크다운 형식으로 제공합니다. 이전 대화 맥락을 반드시 고려하여 답변하세요.',
        selectedAI
      )
      setChatMessages(prev => [...prev, { role: 'assistant', content: response }])
    } catch (error) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ AI API 연결에 실패했습니다. `.env` 파일에 API 키가 올바르게 설정되어 있는지 확인해주세요.'
      }])
    } finally {
      setLoading(false)
    }
  }

  // 종목 심층 분석 (Phase 2 Refactor)
  const generateStockAnalysis = async () => {
    const targetSymbol = selectedStock ? selectedStock.symbol : customStockCode
    const targetName = selectedStock ? selectedStock.name : customStockName
    const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

    if (!targetSymbol) {
      setStockAnalysis('분석할 종목을 선택하거나 종목 코드를 입력해주세요.')
      return
    }

    setLoading(true)
    setStockAnalysis('') // Clear previous
    try {
      // 1단계: Finnhub 데이터 병렬 수집
      const [quoteRes, profileRes, metricsRes, newsRes] = await Promise.allSettled([
        marketDataService.getStockPrice(targetSymbol),
        marketDataService.getStockProfile(targetSymbol),
        marketDataService.getStockMetrics(targetSymbol),
        marketDataService.getCompanyNews(targetSymbol, 7, 5)
      ])

      const quote = quoteRes.status === 'fulfilled' ? quoteRes.value : null
      const profile = profileRes.status === 'fulfilled' ? profileRes.value : null
      const metrics = metricsRes.status === 'fulfilled' ? metricsRes.value : null
      const news = newsRes.status === 'fulfilled' ? newsRes.value : null

      // 보강 데이터 저장 (UI 카드 표시용)
      setStockEnrichedData({ quote, profile, metrics, news })

      // 2단계: 프롬프트 데이터 구성
      const priceSection = quote
        ? `현재가: $${quote.price?.toLocaleString()} | 전일대비: ${quote.change >= 0 ? '+' : ''}${quote.change?.toFixed(2)} (${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent?.toFixed(2)}%) | 당일 고/저: $${quote.high} / $${quote.low}`
        : selectedStock
          ? `현재가: ${selectedStock.currency === 'KRW' ? '₩' : '$'}${selectedStock.currentPrice?.toLocaleString()} (수익률: ${selectedStock.profitPercent?.toFixed(2)}%)`
          : '가격 정보 없음'

      const profileSection = profile
        ? `\n[기업 프로필]\n이름: ${profile.name} | 산업: ${profile.industry} | 국가: ${profile.country}\n거래소: ${profile.exchange} | 시가총액: $${(profile.marketCap || 0).toLocaleString()}M | IPO: ${profile.ipo || 'N/A'}`
        : ''

      const metricsSection = metrics
        ? `\n[재무 지표 - Finnhub 실시간]\n52주 고가: $${metrics['52WeekHigh']} (${metrics['52WeekHighDate'] || 'N/A'}) | 52주 저가: $${metrics['52WeekLow']} (${metrics['52WeekLowDate'] || 'N/A'})\nPER: ${metrics.peRatio?.toFixed(2) || 'N/A'} | PBR: ${metrics.pbRatio?.toFixed(2) || 'N/A'} | PSR: ${metrics.psRatio?.toFixed(2) || 'N/A'}\nROE: ${metrics.roe?.toFixed(2) || 'N/A'}% | ROA: ${metrics.roa?.toFixed(2) || 'N/A'}%\n배당수익률: ${metrics.dividendYield?.toFixed(2) || 'N/A'}% | Beta: ${metrics.beta?.toFixed(2) || 'N/A'}\nEPS 성장률: ${metrics.epsGrowth?.toFixed(2) || 'N/A'}% | 매출 성장률: ${metrics.revenueGrowth?.toFixed(2) || 'N/A'}%\n유동비율: ${metrics.currentRatio?.toFixed(2) || 'N/A'} | 부채비율: ${metrics.debtToEquity?.toFixed(2) || 'N/A'}\n10일 평균 거래량: ${metrics.avgVolume10Day?.toFixed(2) || 'N/A'}M주`
        : ''

      const newsSection = news && news.length > 0
        ? `\n[최근 뉴스 헤드라인 (${news.length}건)]\n${news.map((n, i) => `${i + 1}. [${n.datetime}] ${n.headline} (${n.source})`).join('\n')}`
        : ''

      const portfolioContext = selectedStock
        ? `\n[투자자 보유 정보]\n보유수량: ${selectedStock.quantity}주 | 매수가: ${selectedStock.currency === 'KRW' ? '₩' : '$'}${selectedStock.purchasePrice?.toLocaleString()} | 현재 수익률: ${selectedStock.profitPercent?.toFixed(2)}%`
        : ''

      // 3단계: 확장된 AI 프롬프트 (7개 섹션)
      const prompt = `[${today} 기준 실시간 종목 심층 분석 요청]

=== 분석 대상 ===
종목: ${targetName} (${targetSymbol})
${priceSection}
${profileSection}
${metricsSection}
${newsSection}
${portfolioContext}

=== 분석 지시 ===
당신은 월스트리트의 최상위 헤지펀드 매니저이자 CFA(공인재무분석사)입니다.
위에 제공된 **실제 시장 데이터(Finnhub API 기준)**를 기반으로, 투자자가 즉시 행동할 수 있는 심층 분석을 작성하세요.

반드시 다음 7개 섹션을 Markdown 형식으로 작성하세요:

## 1. 🎯 투자 의견 (Investment Rating)
| 항목 | 내용 |
|---|---|
| **투자 등급** | (강력매수 / 매수 / 중립 / 매도 / 강력매도) |
| **신뢰도** | (상 / 중 / 하) |
| **목표 주가** | (구체적 범위 또는 N/A) |
| **핵심 근거** | (한 줄 요약) |

## 2. 📊 핵심 지표 대시보드 (Key Metrics)
위에서 제공된 재무 지표 데이터를 기반으로 표 형태로 정리하세요:
| 지표 | 수치 | 업종 평균 대비 | 평가 |
|---|---|---|---|
| PER | | | (고평가/적정/저평가) |
| PBR | | | |
| ROE | | | |
| 배당수익률 | | | |
| 부채비율 | | | |

## 3. 📈 기술적 분석 (Technical Analysis)
* **52주 고/저 대비 위치**: 현재가가 52주 범위에서 어디에 있는지 (%) 분석
* **추세 판단**: 상승추세 / 하락추세 / 횡보구간
* **주요 지지/저항선**: 근거와 함께 제시
* **거래량 분석**: 평균 거래량 대비 현재 수급 상황

## 4. 💰 재무 건전성 (Financial Health)
* **수익성**: ROE, ROA 기반 수익 창출 능력 평가
* **성장성**: EPS/매출 성장률 기반 성장 모멘텀
* **안정성**: 유동비율, 부채비율 기반 재무 안정성
* **종합 등급**: (🟢 우수 / 🟡 보통 / 🔴 주의)

## 5. ⚔️ 경쟁사 비교 (Peer Comparison)
동종 업계의 주요 경쟁 기업 2-3개와 핵심 지표 비교표:
| 종목 | PER | 시가총액 | 성장률 | 투자매력도 |
|---|---|---|---|---|

## 6. ⚠️ 리스크 요인 (Risk Factors)
* **시장 리스크**: (금리, 환율, 지정학적 요인)
* **산업 리스크**: (경쟁 심화, 규제 변화)
* **기업 고유 리스크**: (실적 변동, 구조적 문제)
* **리스크 종합 등급**: (🟢 낮음 / 🟡 보통 / 🔴 높음)

## 7. 🎯 실전 매매 전략 (Action Plan)
| 항목 | 가격/수준 |
|---|---|
| **현재가** | |
| **1차 진입가 (공격적)** | |
| **2차 진입가 (보수적)** | |
| **손절가 (Stop Loss)** | |
| **1차 목표가** | |
| **2차 목표가** | |
| **비중 제안** | (포트폴리오 대비 %) |

**구체적 행동 지침:**
* 지금 바로 매수/매도/관망해야 하는 이유
* 분할 매수 전략 또는 손절 시나리오

**작성 원칙:**
- 🔴 위에 제공된 실제 데이터(Finnhub 재무지표, 가격, 뉴스)를 적극 활용하세요.
- 데이터가 없는 항목은 "데이터 없음"으로 표시하고, 일반적 분석으로 대체하세요.
- 구체적인 수치와 근거를 반드시 제시하세요. 추상적 서술 금지.
- 개조식(Bullet points)과 표(Table) 위주로 가독성을 극대화하세요.
- ${today} 기준 분석임을 명시하세요.`

      const analysis = await aiService.routeAIRequest(
        prompt,
        aiService.TASK_LEVEL.ADVANCED,
        '당신은 CFA 자격을 보유한 월스트리트 수석 애널리스트입니다. 실제 재무 데이터를 기반으로 근거 있는 분석만 제공합니다. 한국어로 작성하되, 전문 용어는 원어 병기합니다.',
        selectedAI
      )
      setStockAnalysis(analysis)
      appendHistory({
        id: Date.now(),
        type: 'stock',
        createdAt: new Date().toISOString(),
        stock: targetSymbol,
        summary: `${targetName} (${targetSymbol}) 심층 분석`,
        content: analysis,
        enrichedData: { quote, profile, metrics }
      })
    } catch (error) {
      setStockAnalysis('종목 분석 중 오류가 발생했습니다. API 키를 확인해주세요.')
    } finally {
      setLoading(false)
    }
  }

  // 종목 비교 분석
  const generateComparisonAnalysis = async () => {
    if (!selectedStock || !compareStock) {
      setStockAnalysis('비교할 두 종목을 모두 선택해주세요.')
      return
    }

    const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    setLoading(true)
    setStockAnalysis('')

    try {
      // 두 종목 데이터 병렬 수집
      const [quote1, profile1, metrics1, quote2, profile2, metrics2] = await Promise.allSettled([
        marketDataService.getStockPrice(selectedStock.symbol),
        marketDataService.getStockProfile(selectedStock.symbol),
        marketDataService.getStockMetrics(selectedStock.symbol),
        marketDataService.getStockPrice(compareStock.symbol),
        marketDataService.getStockProfile(compareStock.symbol),
        marketDataService.getStockMetrics(compareStock.symbol)
      ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : null))

      const buildStockInfo = (stock, quote, profile, metrics) => {
        let info = `${stock.name} (${stock.symbol})`
        if (quote) info += `\n  현재가: $${quote.price} (${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent?.toFixed(2)}%)`
        if (profile) info += `\n  산업: ${profile.industry} | 시가총액: $${(profile.marketCap || 0).toLocaleString()}M`
        if (metrics) {
          info += `\n  PER: ${metrics.peRatio?.toFixed(2) || 'N/A'} | PBR: ${metrics.pbRatio?.toFixed(2) || 'N/A'} | ROE: ${metrics.roe?.toFixed(2) || 'N/A'}%`
          info += `\n  52주: $${metrics['52WeekLow']} - $${metrics['52WeekHigh']} | 배당: ${metrics.dividendYield?.toFixed(2) || 'N/A'}%`
          info += `\n  Beta: ${metrics.beta?.toFixed(2) || 'N/A'} | 부채비율: ${metrics.debtToEquity?.toFixed(2) || 'N/A'}`
        }
        return info
      }

      const prompt = `[${today} 기준 종목 비교 분석]

=== 종목 A ===
${buildStockInfo(selectedStock, quote1, profile1, metrics1)}

=== 종목 B ===
${buildStockInfo(compareStock, quote2, profile2, metrics2)}

위 두 종목을 아래 형식으로 비교 분석해주세요:

## 📊 핵심 지표 비교표
| 지표 | ${selectedStock.symbol} | ${compareStock.symbol} | 우위 |
|---|---|---|---|
| 현재가 | | | |
| PER | | | |
| PBR | | | |
| ROE | | | |
| 시가총액 | | | |
| 배당수익률 | | | |
| 52주 고/저 위치 | | | |
| Beta (변동성) | | | |

## 🏆 종합 비교 결론
* **가치 투자 관점**: 어느 종목이 저평가?
* **성장 투자 관점**: 어느 종목이 성장성 우수?
* **안정성 관점**: 어느 종목이 안정적?
* **최종 추천**: 지금 투자한다면 어느 종목? (근거 포함)

## 💡 투자 시나리오
* **공격적 투자자**: (추천 + 이유)
* **보수적 투자자**: (추천 + 이유)
* **분산 투자**: 두 종목 비중 배분 제안

작성 원칙: 실제 데이터 기반, 표와 개조식 중심, 한국어.`

      const analysis = await aiService.routeAIRequest(
        prompt,
        aiService.TASK_LEVEL.ADVANCED,
        '당신은 CFA 자격 보유 수석 애널리스트입니다. 두 종목을 객관적으로 비교 분석합니다.',
        selectedAI
      )
      setStockAnalysis(analysis)
      appendHistory({
        id: Date.now(),
        type: 'stock-compare',
        createdAt: new Date().toISOString(),
        stock: `${selectedStock.symbol} vs ${compareStock.symbol}`,
        summary: `${selectedStock.symbol} vs ${compareStock.symbol} 비교 분석`,
        content: analysis
      })
    } catch (error) {
      setStockAnalysis('비교 분석 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // AI 매매 타이밍 분석
  const generateTimingAnalysis = async () => {
    // 선택된 종목이 없고 포트폴리오도 없는 경우
    if (selectedStocksForAI.length === 0 && (!portfolioData || !portfolioData.assets?.length)) {
      setTimingAnalysis('분석할 종목을 선택하거나 Portfolio 페이지에서 자산을 추가해주세요.')
      return
    }

    setLoading(true)
    try {
      // 선택된 종목이 있으면 선택된 종목 사용, 없으면 포트폴리오 전체
      let analysisAssets = []
      if (selectedStocksForAI.length > 0) {
        analysisAssets = selectedStocksForAI
      } else if (portfolioData?.assets) {
        analysisAssets = portfolioData.assets.slice(0, 10).map(a => ({
          symbol: a.symbol,
          name: a.name || a.type,
          currentPrice: a.currentPrice,
          avgPrice: a.avgPrice,
          quantity: a.quantity,
          profitPercent: a.profitPercent
        }))
      }

      const assetsList = analysisAssets
        .map(a => {
          const avgPriceStr = a.avgPrice ? `, 평단가 ${a.avgPrice.toLocaleString()}` : ''
          const qtyStr = a.quantity ? `, 보유수량 ${a.quantity}` : ''
          return `${a.symbol} (${a.name || ''}): 현재가 ${a.currentPrice?.toLocaleString() || 'N/A'}${avgPriceStr}${qtyStr}, 수익률 ${a.profitPercent?.toFixed?.(1) || 'N/A'}%`
        })
        .join('\n')

      const marketContext = marketData ? `
시장 현황:
      - 원 / 달러 환율: ${marketData?.currency?.usdKrw?.rate?.toLocaleString()} 원
        - VIX 변동성: ${marketData?.volatility?.vix?.value || 'N/A'}
      - Fear & Greed: ${marketData?.sentiment?.fearGreed?.value || 'N/A'}
      ` : ''

      const currentDate = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

      const prompt = `[현재 날짜: ${currentDate}]

당신은 월스트리트의 전설적인 트레이더이자 기술적 분석(Technical Analysis) 마스터입니다.
보유 종목에 대해 현재 시점 기준의 정밀한 매매 타이밍 분석을 제공해주세요.

        ${marketContext}

[분석 대상 종목]
${assetsList}

---

### 분석 지시사항
각 종목별로 다음 5가지 항목을 포함하여 정밀 분석 보고서를 작성하세요:

1. **🚦 매매 신호 (Signal)**
   - **강력매수** / **매수** / **중립** / **매도** / **강력매도** 중 하나 선택
   - 확신도 (Confidence Score): 0~100%

2. **📈 실전 매매 전략 (Action Plan)**
   - **권장 진입가**: (구체적 가격대)
   - **목표가 (1차/2차)**: (단기/중기 수익 실현가)
   - **손절가 (Stop Loss)**: (필수 리스크 관리 가격)

3. **📊 기술적 지표 분석 (AI Estimation)**
   - **RSI (14)**: (과매수/과매도 여부 판단)
   - **MACD**: (골든크로스/데드크로스 여부 추정)
   - **이동평균선**: (정배열/역배열, 20일/60일선 지지 여부)
   - **볼린저 밴드**: (밴드 상단/하단 위치 여부)

4. **🔮 단기 가격 예측 (Prediction)**
   - 향후 1-2주 가격 방향성: **상승세** / **하락세** / **횡보**
   - 예상 변동폭: (±X%)

5. **🗝️ 주요 지지/저항 라인**
   - 핵심 지지선: (가격)
   - 핵심 저항선: (가격)

---

### 작성 원칙
- ⚠️ **중요**: ${currentDate} 현재의 시장 데이터와 차트 패턴을 시뮬레이션하여 분석하세요.
- 데이터가 부족한 경우, 일반적인 기술적 패턴과 종목의 특성(배타계수, 변동성)을 기반으로 합리적인 추정을 제공하세요.
- 결과는 가독성 좋은 **Markdown** 형식으로 작성하고, 중요한 숫자는 굵게 표시하세요.
- 투자 조언이 아닌 참고용 자료임을 명시하세요.`

      const analysis = await aiService.routeAIRequest(
        prompt,
        aiService.TASK_LEVEL.ADVANCED,
        '당신은 기술적 분석 전문가입니다. 차트 패턴, 보조지표, 수급 분석을 통해 구체적인 매매 전략을 제시합니다.',
        selectedAI
      )
      setTimingAnalysis(analysis)
      appendHistory({
        id: Date.now(),
        type: 'timing',
        createdAt: new Date().toISOString(),
        summary: 'AI 매매 타이밍 분석',
        content: analysis
      })
    } catch (error) {
      setTimingAnalysis('매매 타이밍 분석 생성 중 오류가 발생했습니다. API 키를 확인해주세요.')
    } finally {
      setLoading(false)
    }
  }



  // AI 뉴스 요약
  const generateNewsSummary = async () => {
    // 선택된 종목이 없고 포트폴리오도 없는 경우
    if (selectedStocksForAI.length === 0 && (!portfolioData || !portfolioData.assets?.length)) {
      setNewsSummary('분석할 종목을 선택하거나 Portfolio 페이지에서 자산을 추가해주세요.')
      return
    }

    setLoading(true)
    try {
      // 선택된 종목이 있으면 선택된 종목 사용, 없으면 포트폴리오 전체
      let symbols = ''
      if (selectedStocksForAI.length > 0) {
        symbols = selectedStocksForAI.map(a => a.symbol).join(', ')
      } else if (portfolioData?.assets) {
        symbols = portfolioData.assets.slice(0, 8).map(a => a.symbol).join(', ')
      }

      const currentDate = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

      const prompt = `[현재 날짜: ${currentDate}]

당신은 금융 뉴스 분석 전문가입니다.다음 보유 종목들에 대한 ${currentDate} 기준 최신 동향과 뉴스 분석을 제공해주세요.

보유 종목: ${symbols}

다음 내용을 포함해 분석해주세요:

## 📰 종목별 주요 동향(${currentDate} 기준)
각 종목에 대해:
- 2025년 주요 뉴스 / 이벤트(실적발표, 신제품, M & A 등)
  - 업계 동향
    - 투자자 관심 포인트

## 🔍 섹터별 분석
  - 관련 섹터 전반적인 흐름
    - 최근 규제 / 정책 영향

## ⚠️ 리스크 요인
  - 주의해야 할 뉴스 / 이슈
    - 잠재적 위험 요소

## 💡 투자 시사점
  - 종합적인 뉴스 기반 투자 시사점

⚠️ 중요: ${currentDate} 현재 시점을 기준으로 분석해주세요.실시간 뉴스 접근이 불가하므로, 각 종목의 일반적인 특성과 최근 트렌드를 기반으로 분석해주세요.`

      const summary = await aiService.routeAIRequest(
        prompt,
        aiService.TASK_LEVEL.ADVANCED,
        '당신은 금융 뉴스 분석가입니다. 투자자 관점에서 뉴스와 시장 동향을 분석합니다.',
        selectedAI
      )
      setNewsSummary(summary)
      appendHistory({
        id: Date.now(),
        type: 'news',
        createdAt: new Date().toISOString(),
        summary: 'AI 뉴스 요약',
        content: summary
      })
    } catch (error) {
      setNewsSummary('뉴스 요약 생성 중 오류가 발생했습니다. API 키를 확인해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const renderHistory = () => {
    if (!analysisHistory.length) {
      return (
        <div className="border border-dashed border-slate-700 rounded-lg p-4 text-sm text-gray-500">
          아직 생성된 AI 리포트 기록이 없습니다.
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {analysisHistory.slice(0, 5).map(entry => {
          let accuracyBadge = null
          // 정확도계산 로직: 분석 당시 가격(enrichedData.quote.price)과 현재가 비교
          if (entry.type === 'stock' && entry.enrichedData?.quote?.price) {
            const analysisPrice = entry.enrichedData.quote.price
            // 현재가 찾기 (1. 포트폴리오, 2. 현재 선택된 종목, 3. enrichedData)
            let currentPrice = null

            // 1. Check Portfolio
            const portfolioItem = portfolioData?.assets?.find(a => a.symbol === entry.stock)
            if (portfolioItem) currentPrice = portfolioItem.currentPrice

            // 2. Check Currently Selected/Fetched Data
            if (!currentPrice && stockEnrichedData?.quote && (selectedStock?.symbol === entry.stock || customStockCode === entry.stock)) {
              currentPrice = stockEnrichedData.quote.price
            }

            if (currentPrice) {
              const returnPct = ((currentPrice - analysisPrice) / analysisPrice) * 100
              const isPositive = returnPct >= 0
              accuracyBadge = (
                <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded border ${isPositive
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                  {isPositive ? '🎯 적중' : '⚠️ 주의'} {isPositive ? '+' : ''}{returnPct.toFixed(1)}%
                </span>
              )
            } else {
              accuracyBadge = (
                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded border bg-slate-700/50 text-gray-500 border-slate-600">
                  기준가 ${analysisPrice.toLocaleString()}
                </span>
              )
            }
          }

          return (
            <div key={entry.id} className="border border-slate-700 rounded-lg p-4 bg-slate-800/60 space-y-3 hover:border-cyan-500/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center flex-wrap gap-1 mb-1">
                    <span className="text-sm font-semibold text-cyan-300">{entry.summary}</span>
                    {accuracyBadge}
                  </div>
                  <p className="text-xs text-gray-500 capitalize">
                    타입: {entry.type}
                  </p>
                </div>
                <span className="text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap">
                  <Clock className="w-3 h-3" />
                  {new Date(entry.createdAt).toLocaleString('ko-KR')}
                </span>
              </div>
              <div className="text-xs text-gray-400 line-clamp-4 whitespace-pre-line">{entry.content}</div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-medium text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/10 transition-colors"
                  onClick={() => setHistoryViewer({ open: true, entry })}
                >
                  전체 보기
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-medium text-gray-400 border border-slate-600 rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
                  onClick={() => copyToClipboard(entry.content, '클립보드에 복사되었습니다.', '복사에 실패했습니다. 브라우저 권한을 확인하세요.')}
                >
                  복사
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-medium text-gray-400 border border-slate-600 rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
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
          )
        })}
      </div>
    )
  }

  return (
    <div className="cyber-dashboard min-h-screen p-4 sm:p-6 relative">
      {/* Header - Cyberpunk Style */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg cyber-card-glow">
            <Sparkles className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold neon-text-cyan">AI 분석 리포트</h2>
            <p className="text-sm text-cyan-300/60">AI 기반 시장 분석 및 포트폴리오 진단</p>
          </div>
        </div>
        <AIStrategyBadge />
      </div>

      {/* AI Model Selection */}
      <div className="cyber-card mb-8">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-slate-800 rounded-lg border border-purple-500/30">
            <Zap className="w-6 h-6 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              💡 AI 모델 선택
              <span className="text-xs font-normal text-gray-400 bg-slate-800 px-2 py-0.5 rounded border border-gray-700">작업에 최적화된 모델을 선택하세요</span>
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedAI('auto')}
                  className={`p-3 rounded-lg border transition-all text-left group ${selectedAI === 'auto'
                    ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                    : 'border-gray-700 bg-slate-800 hover:border-purple-500/50 hover:bg-slate-700'
                    }`}
                >
                  <div>
                    <p className="font-semibold text-sm text-white group-hover:text-purple-300 transition-colors">🤖 자동 선택</p>
                    <p className="text-xs text-gray-400 mt-1">
                      작업에 맞게 AI 자동 배정
                    </p>
                    <p className="text-xs text-purple-400 mt-1">💰 비용 최적화</p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedAI('gpt')}
                  className={`p-3 rounded-lg border transition-all text-left group ${selectedAI === 'gpt'
                    ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,112,0.3)]'
                    : 'border-slate-700 bg-slate-800/50 hover:bg-slate-700 hover:border-amber-500/50'
                    }`}
                >
                  <div>
                    <p className="font-semibold text-sm text-white group-hover:text-amber-300 transition-colors">🧠 GPT-4.1</p>
                    <p className="text-xs text-gray-400 mt-1">
                      최신 플래그십 (API/Context)
                    </p>
                    <p className="text-xs text-yellow-500 mt-1">⭐ 핵심 분석 엔진</p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedAI('gemini')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${selectedAI === 'gemini'
                    ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : 'border-slate-700 bg-slate-800/50 hover:bg-slate-700 hover:border-blue-500/50'
                    } group`}
                >
                  <div className={`p-2 rounded-lg ${selectedAI === 'gemini' ? 'bg-blue-500/20' : 'bg-slate-700 group-hover:bg-blue-500/20'}`}>
                    <TrendingUp className={`w-5 h-5 ${selectedAI === 'gemini' ? 'text-blue-400' : 'text-gray-400 group-hover:text-blue-400'}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-white group-hover:text-blue-300 transition-colors">⚡ Gemini 2.5 Pro</p>
                    <p className="text-xs text-gray-400 mt-1">
                      High Context (Long Token)
                    </p>
                    <p className="text-xs text-blue-400 mt-1">🚀 추론 강화</p>
                  </div>
                </button>
              </div>

              <div className="text-xs text-gray-400 bg-slate-800/50 p-2 rounded border border-gray-700">
                <strong className="text-cyan-400">현재 선택:</strong> {
                  selectedAI === 'auto' ? '🤖 자동 (작업별 최적 AI 선택)' :
                    selectedAI === 'gpt' ? '🧠 GPT-4.1 (핵심 분석 엔진)' :
                      '⚡ Gemini 2.5 Pro (High Context)'
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 overflow-x-auto pb-1 mb-6">
        {[
          { id: 'market', label: '시장 리포트' },
          { id: 'portfolio', label: '포트폴리오 진단' },
          { id: 'stock', label: '📊 종목 분석' },
          { id: 'risk', label: '리스크 진단' },
          { id: 'rebalancing', label: '리밸런싱 제안' },
          { id: 'chat', label: 'AI 상담' },
          { id: 'timing', label: '🔮 매매 타이밍' },
          { id: 'news', label: '📰 뉴스 요약' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium transition-all duration-300 whitespace-nowrap rounded-t-lg ${activeTab === tab.id
              ? 'text-cyan-300 border-b-2 border-cyan-500 bg-slate-800/50'
              : 'text-gray-500 hover:text-gray-300 hover:bg-slate-800/30'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Market Report Tab */}
      {activeTab === 'market' && (
        <div className="space-y-6">
          <div className="bg-slate-800/50 border border-cyan-500/20 rounded-lg p-4 mb-4">
            <p className="text-sm text-cyan-200">
              <strong className="text-cyan-400">🧠 GPT-4.1 사용:</strong> 상세한 시장 분석 및 투자 전략을 제공합니다 (핵심 분석 엔진)
            </p>
          </div>
          {marketInsights && (
            <div className="cyber-card border border-blue-500/30 bg-blue-900/20">
              <h4 className="text-sm font-semibold text-blue-300 mb-2">데이터 기반 시장 요약</h4>
              <ul className="space-y-1 text-xs text-blue-200">
                {marketInsights.quickHighlights.slice(0, 4).map((item, idx) => (
                  <li key={idx}>• {item}</li>
                ))}
              </ul>
              {marketInsights.riskSignals.length > 0 && (
                <div className="mt-3 text-xs text-orange-200 bg-orange-900/30 rounded-lg p-3 border border-orange-500/30">
                  <p className="font-medium mb-1 text-orange-400">⚠️ 감지된 리스크</p>
                  <ul className="space-y-1">
                    {marketInsights.riskSignals.slice(0, 3).map((signal, idx) => (
                      <li key={idx}>- {signal}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-[11px] text-blue-400/70 mt-3">
                실시간 데이터 기반 자동 요약입니다. 추가적인 경제 지표와 뉴스 확인을 권장합니다.
              </p>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={generateMarketReport}
              disabled={loading}
              className="cyber-btn flex items-center gap-2"
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
                  className="px-3 py-1.5 text-xs font-medium text-gray-400 border border-gray-600 rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
                >
                  복사
                </button>
                <button
                  type="button"
                  onClick={() => downloadReport('market_report', marketReport)}
                  className="px-3 py-1.5 text-xs font-medium text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/10 transition-colors"
                >
                  다운로드
                </button>
              </div>
            )}
          </div>

          {marketReport && (
            <div className="cyber-card">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-semibold text-white">시장 분석 리포트</h3>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-sm">
                <ReactMarkdown
                  className="prose max-w-none leading-relaxed"
                  remarkPlugins={[remarkGfm]}
                  components={darkMarkdownComponents}
                >
                  {marketReport}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {!marketReport && !loading && (
            <div className="cyber-card text-center py-12 border-dashed border-gray-700">
              <Sparkles className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">AI 시장 리포트를 생성하려면 버튼을 클릭하세요</p>
            </div>
          )}
        </div>
      )}

      {/* Portfolio Analysis Tab */}
      {activeTab === 'portfolio' && (
        <div className="space-y-6">
          <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-4 mb-4">
            <p className="text-sm text-purple-200">
              <strong className="text-purple-400">🧠 GPT-4.1 사용:</strong> 심층 포트폴리오 분석 및 최적화 전략을 제공합니다 (전문가급 분석)
            </p>
          </div>
          {portfolioInsights && (
            <div className="cyber-card border border-purple-500/30 bg-purple-900/20">
              <h4 className="text-sm font-semibold text-purple-300 mb-2">핵심 포트폴리오 인사이트</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-purple-200">
                <div>
                  <p className="font-medium mb-1 text-purple-400">성과 요약</p>
                  <ul className="space-y-1">
                    {portfolioInsights.quickHighlights.slice(0, 3).map((item, idx) => (
                      <li key={idx}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-1 text-purple-400">리스크 포인트</p>
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
                <div className="mt-3 text-xs text-purple-200 bg-purple-900/30 rounded-lg p-3 border border-purple-500/30">
                  <p className="font-medium mb-1 text-purple-400">목표 진행</p>
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
              className="cyber-btn flex items-center gap-2"
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
                  className="px-3 py-1.5 text-xs font-medium text-gray-400 border border-gray-600 rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
                >
                  복사
                </button>
                <button
                  type="button"
                  onClick={() => downloadReport('portfolio_analysis', portfolioAnalysis)}
                  className="px-3 py-1.5 text-xs font-medium text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/10 transition-colors"
                >
                  다운로드
                </button>
              </div>
            )}
          </div>

          {portfolioAnalysis && (
            <div className="cyber-card">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">포트폴리오 진단 결과</h3>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-sm">
                <ReactMarkdown
                  className="prose max-w-none leading-relaxed"
                  remarkPlugins={[remarkGfm]}
                  components={darkMarkdownComponents}
                >
                  {portfolioAnalysis}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {!portfolioAnalysis && !loading && (
            <div className="cyber-card text-center py-12 border-dashed border-gray-700">
              <Sparkles className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">AI 포트폴리오 진단을 시작하려면 버튼을 클릭하세요</p>
            </div>
          )}
        </div>
      )}

      {/* Stock Analysis Tab */}
      {activeTab === 'stock' && (
        <div className="space-y-6">
          <div className="bg-slate-800/50 border border-teal-500/20 rounded-lg p-4 mb-4">
            <p className="text-sm text-teal-200">
              <strong className="text-teal-400">🔍 종목 심층 분석:</strong> AI가 최신 시장 데이터를 분석하여 투자 의견을 제시합니다
            </p>
          </div>

          {/* 종목 선택 */}
          <div className="cyber-card">
            <h4 className="text-sm font-medium text-gray-300 mb-3">📊 보유 종목에서 선택</h4>
            {portfolioData && portfolioData.assets && portfolioData.assets.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {portfolioData.assets.map((asset) => (
                  <button
                    key={asset.symbol}
                    onClick={() => {
                      setSelectedStock(asset)
                      setCustomStockCode('')
                      setCustomStockName('')
                    }}
                    className={`p-2 rounded-lg border transition-all text-left ${selectedStock?.symbol === asset.symbol
                      ? 'border-teal-500 bg-teal-500/20 shadow-[0_0_10px_rgba(20,184,166,0.2)]'
                      : 'border-slate-700 bg-slate-800 hover:border-teal-500/50 hover:bg-slate-700'
                      }`}
                  >
                    <p className="font-semibold text-sm text-white">{asset.symbol}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{asset.name}</p>
                    <p className={`text-[10px] mt-0.5 font-medium ${asset.profitPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                      {asset.profitPercent >= 0 ? '+' : ''}{asset.profitPercent.toFixed(1)}%
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">포트폴리오에 자산이 없습니다.</p>
                <p className="text-xs mt-1">Portfolio 페이지에서 자산을 추가하거나 아래에서 직접 입력하세요.</p>
              </div>
            )}
          </div>

          {/* OR 구분선 */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-700"></div>
            <span className="text-sm font-medium text-gray-500">또는</span>
            <div className="flex-1 h-px bg-slate-700"></div>
          </div>

          {/* 직접 입력 */}
          <div className="cyber-card">
            <h4 className="text-sm font-medium text-gray-300 mb-3">✏️ 종목 직접 입력</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-2">종목 코드</label>
                <input
                  type="text"
                  value={customStockCode}
                  onChange={(e) => {
                    setCustomStockCode(e.target.value)
                    setSelectedStock(null)
                  }}
                  placeholder="예: 005930, AAPL, TSLA"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-white placeholder-gray-600"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2">종목명</label>
                <input
                  type="text"
                  value={customStockName}
                  onChange={(e) => {
                    setCustomStockName(e.target.value)
                    setSelectedStock(null)
                  }}
                  placeholder="예: 삼성전자, Apple Inc., Tesla"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-white placeholder-gray-600"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 한국 주식: 6자리 종목코드 (예: 005930), 미국 주식: 티커 (예: AAPL)
            </p>
          </div>

          {/* 선택된 종목 정보 및 Perplexity 검색 버튼 */}
          {(selectedStock || (customStockCode && customStockName)) && (
            <>
              {selectedStock && (
                <div className="cyber-card bg-gradient-to-br from-slate-800 to-slate-900 border-teal-500/50 shadow-[0_0_20px_rgba(20,184,166,0.15)] p-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-center md:text-left">
                      <h3 className="text-3xl font-black text-white neon-text-cyan tracking-tight">{selectedStock.symbol}</h3>
                      <p className="text-lg text-gray-300 mt-1 font-medium">{selectedStock.name}</p>
                      <span className="inline-block mt-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-600 text-xs text-gray-400">
                        {selectedStock.type}
                      </span>
                    </div>

                    <div className="w-full h-px bg-slate-700 md:w-px md:h-16 md:bg-gradient-to-b from-transparent via-slate-600 to-transparent"></div>

                    <div className="grid grid-cols-3 gap-8 w-full md:w-auto text-center">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">현재가</p>
                        <p className="text-2xl font-bold text-white">
                          {selectedStock.currency === 'KRW'
                            ? `₩${selectedStock.currentPrice.toLocaleString('ko-KR', { maximumFractionDigits: 0 })} `
                            : `$${selectedStock.currentPrice.toFixed(2)} `
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">수익률</p>
                        <p className={`text - 2xl font - bold ${selectedStock.profitPercent >= 0 ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]' : 'text-rose-400 drop-shadow-[0_0_5px_rgba(251,113,133,0.5)]'} `}>
                          {selectedStock.profitPercent >= 0 ? '+' : ''}{selectedStock.profitPercent.toFixed(2)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">보유 수량</p>
                        <p className="text-2xl font-bold text-white">{selectedStock.quantity}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!selectedStock && customStockCode && customStockName && (
                <div className="cyber-card bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border-purple-500/30 p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-800 rounded-xl border border-purple-500/30 shadow-lg">
                      <TrendingUp className="w-8 h-8 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white neon-text-purple">{customStockCode}</h3>
                      <p className="text-lg text-gray-300 mt-1">{customStockName}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 비교 모드 토글 */}
              <div className="flex items-center gap-3 mt-4 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                <button
                  onClick={() => {
                    setStockCompareMode(!stockCompareMode)
                    if (stockCompareMode) setCompareStock(null)
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${stockCompareMode ? 'bg-purple-600' : 'bg-slate-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${stockCompareMode ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-gray-300">⚔️ 종목 비교 모드</span>
                {stockCompareMode && (
                  <span className="text-xs text-purple-400 ml-auto">두 종목을 비교 분석합니다</span>
                )}
              </div>

              {/* 비교 종목 선택 (비교 모드일 때만) */}
              {stockCompareMode && (
                <div className="cyber-card bg-gradient-to-br from-purple-900/10 to-indigo-900/10 border-purple-500/20 mt-3">
                  <h4 className="text-sm font-medium text-purple-300 mb-3">⚔️ 비교 대상 종목 선택</h4>
                  {portfolioData && portfolioData.assets && portfolioData.assets.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {portfolioData.assets
                        .filter(a => a.symbol !== selectedStock?.symbol)
                        .map((asset) => (
                          <button
                            key={`cmp-${asset.symbol}`}
                            onClick={() => setCompareStock(asset)}
                            className={`p-3 rounded-lg border transition-all text-left ${compareStock?.symbol === asset.symbol
                              ? 'border-purple-500 bg-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                              : 'border-slate-700 bg-slate-800 hover:border-purple-500/50 hover:bg-slate-700'
                              }`}
                          >
                            <p className="font-semibold text-sm text-white">{asset.symbol}</p>
                            <p className="text-xs text-gray-400 mt-1 truncate">{asset.name}</p>
                            <p className={`text-xs mt-1 font-medium ${asset.profitPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {asset.profitPercent >= 0 ? '+' : ''}{asset.profitPercent.toFixed(1)}%
                            </p>
                          </button>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">포트폴리오에 비교할 수 있는 종목이 없습니다.</p>
                  )}
                  {compareStock && (
                    <div className="mt-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center gap-3">
                      <span className="text-purple-400 font-semibold">{selectedStock?.symbol || customStockCode}</span>
                      <span className="text-gray-500">vs</span>
                      <span className="text-purple-400 font-semibold">{compareStock.symbol}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Enriched Data Cards (shown when data is available) */}
              {stockEnrichedData && (stockEnrichedData.metrics || stockEnrichedData.profile) && (
                <div className="cyber-card bg-gradient-to-br from-slate-800/50 to-slate-900/80 border-cyan-500/20 mt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-sm font-semibold text-cyan-300">📡 Finnhub 실시간 데이터</h4>
                    {stockEnrichedData.profile?.industry && (
                      <span className="ml-auto px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300">
                        {stockEnrichedData.profile.industry}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {stockEnrichedData.metrics?.['52WeekHigh'] && (
                      <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/50">
                        <p className="text-xs text-gray-500 mb-1">52주 범위</p>
                        <p className="text-sm font-bold text-white">
                          ${stockEnrichedData.metrics['52WeekLow']?.toFixed(1)} - ${stockEnrichedData.metrics['52WeekHigh']?.toFixed(1)}
                        </p>
                        {stockEnrichedData.quote?.price && (
                          <div className="mt-1.5">
                            <div className="w-full bg-slate-700 rounded-full h-1.5">
                              <div
                                className="bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 h-1.5 rounded-full"
                                style={{
                                  width: `${Math.min(100, Math.max(0, ((stockEnrichedData.quote.price - stockEnrichedData.metrics['52WeekLow']) / (stockEnrichedData.metrics['52WeekHigh'] - stockEnrichedData.metrics['52WeekLow'])) * 100))}%`
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {stockEnrichedData.profile?.marketCap && (
                      <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/50">
                        <p className="text-xs text-gray-500 mb-1">시가총액</p>
                        <p className="text-sm font-bold text-white">
                          ${stockEnrichedData.profile.marketCap >= 1000
                            ? `${(stockEnrichedData.profile.marketCap / 1000).toFixed(1)}B`
                            : `${stockEnrichedData.profile.marketCap.toFixed(0)}M`
                          }
                        </p>
                      </div>
                    )}
                    {stockEnrichedData.metrics?.peRatio && (
                      <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/50">
                        <p className="text-xs text-gray-500 mb-1">PER</p>
                        <p className={`text-sm font-bold ${stockEnrichedData.metrics.peRatio > 30 ? 'text-rose-400' : stockEnrichedData.metrics.peRatio > 15 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {stockEnrichedData.metrics.peRatio.toFixed(1)}x
                        </p>
                      </div>
                    )}
                    {stockEnrichedData.metrics?.roe && (
                      <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/50">
                        <p className="text-xs text-gray-500 mb-1">ROE</p>
                        <p className={`text-sm font-bold ${stockEnrichedData.metrics.roe > 15 ? 'text-emerald-400' : stockEnrichedData.metrics.roe > 8 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {stockEnrichedData.metrics.roe.toFixed(1)}%
                        </p>
                      </div>
                    )}
                    {stockEnrichedData.metrics?.dividendYield != null && (
                      <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/50">
                        <p className="text-xs text-gray-500 mb-1">배당수익률</p>
                        <p className="text-sm font-bold text-purple-400">
                          {stockEnrichedData.metrics.dividendYield.toFixed(2)}%
                        </p>
                      </div>
                    )}
                    {stockEnrichedData.metrics?.beta && (
                      <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/50">
                        <p className="text-xs text-gray-500 mb-1">Beta</p>
                        <p className={`text-sm font-bold ${stockEnrichedData.metrics.beta > 1.5 ? 'text-rose-400' : stockEnrichedData.metrics.beta > 1 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {stockEnrichedData.metrics.beta.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* News Headlines (shown when data is available) */}
              {stockEnrichedData?.news && stockEnrichedData.news.length > 0 && (
                <div className="cyber-card bg-slate-800/30 border-amber-500/20 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-semibold text-amber-300">📰 최근 뉴스 ({stockEnrichedData.news.length}건)</h4>
                  </div>
                  <div className="space-y-2">
                    {stockEnrichedData.news.slice(0, 3).map((news, i) => (
                      <a
                        key={i}
                        href={news.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-2.5 rounded-lg bg-slate-900/40 border border-slate-700/50 hover:border-amber-500/30 transition-all group"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-gray-500 whitespace-nowrap mt-0.5">{news.datetime}</span>
                          <p className="text-sm text-gray-300 group-hover:text-amber-200 transition-colors line-clamp-1">
                            {news.headline}
                          </p>
                          <span className="text-xs text-gray-600 whitespace-nowrap ml-auto">{news.source}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Native AI Analysis UI */}
              <div className="flex flex-col items-center gap-4 mt-6">
                <button
                  onClick={stockCompareMode ? generateComparisonAnalysis : generateStockAnalysis}
                  disabled={loading}
                  className={`cyber-btn flex items-center justify-center gap-2 px-8 py-3 text-base shadow-[0_0_15px_rgba(20,184,166,0.4)] w-full md:w-auto ${stockCompareMode ? 'from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : ''}`}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      {stockCompareMode ? '두 종목 데이터 수집 + 비교 분석 중...' : 'Finnhub 데이터 수집 + AI 심층 분석 중...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      {stockCompareMode ? '⚔️ AI 종목 비교 분석 시작' : '🚀 AI 심층 분석 시작 (7개 섹션)'}
                    </>
                  )}
                </button>
                <p className="text-sm text-gray-400 mt-2">
                  * Finnhub 실시간 데이터(재무지표, 52주 범위, 뉴스) + AI 분석을 결합합니다.
                </p>
              </div>

              {stockAnalysis && (
                <div className="space-y-4 mt-6">
                  {/* Investment Rating Badge - parsed from analysis */}
                  {(() => {
                    const ratingMatch = stockAnalysis.match(/투자\s*등급[^|]*\|\s*(강력매수|매수|중립|매도|강력매도)/i)
                    const rating = ratingMatch?.[1]
                    if (!rating) return null
                    const ratingConfig = {
                      '강력매수': { color: 'from-emerald-500 to-green-600', border: 'border-emerald-500', text: 'text-emerald-400', icon: '🟢', label: 'STRONG BUY' },
                      '매수': { color: 'from-blue-500 to-cyan-600', border: 'border-blue-500', text: 'text-blue-400', icon: '🔵', label: 'BUY' },
                      '중립': { color: 'from-amber-500 to-yellow-600', border: 'border-amber-500', text: 'text-amber-400', icon: '🟡', label: 'HOLD' },
                      '매도': { color: 'from-orange-500 to-red-600', border: 'border-orange-500', text: 'text-orange-400', icon: '🟠', label: 'SELL' },
                      '강력매도': { color: 'from-red-500 to-rose-700', border: 'border-red-500', text: 'text-red-400', icon: '🔴', label: 'STRONG SELL' }
                    }
                    const cfg = ratingConfig[rating] || ratingConfig['중립']
                    return (
                      <div className={`flex items-center justify-center gap-4 p-4 rounded-xl bg-gradient-to-r ${cfg.color} bg-opacity-10 border ${cfg.border}/30`}
                        style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
                      >
                        <span className="text-3xl">{cfg.icon}</span>
                        <div className="text-center">
                          <p className={`text-2xl font-black ${cfg.text}`}>{rating}</p>
                          <p className="text-xs text-gray-400 tracking-widest">{cfg.label}</p>
                        </div>
                        <span className="text-3xl">{cfg.icon}</span>
                      </div>
                    )
                  })()}

                  {/* Analysis Result */}
                  <div className="cyber-card">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-teal-400" />
                        <h3 className="text-lg font-semibold text-white">
                          {selectedStock?.name || customStockName} ({selectedStock?.symbol || customStockCode}) 심층 분석
                        </h3>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyToClipboard(stockAnalysis)}
                          className="p-1.5 text-gray-400 hover:text-white border border-slate-600 rounded hover:bg-slate-700"
                          title="복사"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-sm">
                      <ReactMarkdown
                        className="prose max-w-none leading-relaxed"
                        remarkPlugins={[remarkGfm]}
                        components={darkMarkdownComponents}
                      >
                        {stockAnalysis}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {
            !selectedStock && !(customStockCode && customStockName) && (
              <div className="cyber-card text-center py-12 border-dashed border-teal-500/30">
                <TrendingUp className="w-12 h-12 text-teal-500/50 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">분석할 종목을 선택하거나 직접 입력해주세요</p>
                <p className="text-sm text-gray-500 mt-2">
                  위 보유 종목 목록에서 선택하거나, 종목 코드와 이름을 직접 입력하세요
                </p>
              </div>
            )
          }
        </div >
      )}

      {/* Risk Analysis Tab */}
      {
        activeTab === 'risk' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 border border-orange-500/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-orange-200">
                <strong className="text-orange-400">📊 자동 계산:</strong> 포트폴리오의 변동성, 샤프지수, 집중도를 분석합니다
              </p>
            </div>
            <button
              onClick={generateRiskAnalysis}
              disabled={loading || !portfolioData}
              className="cyber-btn flex items-center gap-2"
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
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="cyber-card">
                    <h4 className="text-sm font-medium text-gray-400 mb-3">수익률 지표</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500">가중 평균 수익률</p>
                        <p className="text-2xl font-bold text-white">
                          {Number.isFinite(riskAnalysis.avgReturn)
                            ? `${riskAnalysis.avgReturn >= 0 ? '+' : ''}${formatNumber(riskAnalysis.avgReturn, 2)}% `
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">샤프 비율 (Sharpe Ratio)</p>
                        <p className="text-2xl font-bold text-cyan-400">
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

                  <div className="cyber-card">
                    <h4 className="text-sm font-medium text-gray-400 mb-3">리스크 지표</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500">변동성 (Volatility)</p>
                        <p
                          className={`text - 2xl font - bold ${riskAnalysis.riskLevel === 'High'
                            ? 'text-rose-500'
                            : riskAnalysis.riskLevel === 'Medium'
                              ? 'text-orange-400'
                              : 'text-emerald-400'
                            } `}
                        >
                          {Number.isFinite(riskAnalysis.volatility)
                            ? `${formatNumber(riskAnalysis.volatility, 2)}% `
                            : 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">위험도: {riskAnalysis.riskLevel}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">분산 점수</p>
                        <p
                          className={`text - lg font - bold ${riskAnalysis.diversificationScore === 'Excellent'
                            ? 'text-emerald-400'
                            : riskAnalysis.diversificationScore === 'Good'
                              ? 'text-emerald-400'
                              : riskAnalysis.diversificationScore === 'Fair'
                                ? 'text-orange-400'
                                : 'text-rose-500'
                            } `}
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
                  <div className="cyber-card">
                    <h4 className="text-sm font-medium text-gray-400 mb-3">잠재 손실 추정</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500">1σ 기준 예상 하락폭</p>
                        <p className="text-xl font-semibold text-white">
                          {formatCurrency(riskAnalysis.expectedDrawdown, 'KRW')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">95% VaR (단순 추정)</p>
                        <p className="text-xl font-semibold text-white">
                          {formatCurrency(riskAnalysis.valueAtRisk, 'KRW')}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          통계적 추정치이며 실제 시장 변동과 차이가 있을 수 있습니다.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="cyber-card">
                    <h4 className="text-sm font-medium text-gray-400 mb-3">집중도 & 노출</h4>
                    <div className="space-y-2 text-sm text-gray-300">
                      {riskAnalysis.largestPosition ? (
                        <p>
                          최대 보유 자산: <strong className="text-white">{riskAnalysis.largestPosition.symbol}</strong>{' '}
                          ({formatNumber(riskAnalysis.largestPosition.weight * 100, 1)}% 비중,
                          수익률 {formatNumber(riskAnalysis.largestPosition.profitPercent, 1)}%)
                        </p>
                      ) : (
                        <p>최대 보유 자산 정보 없음</p>
                      )}
                      {riskAnalysis.weakestAsset ? (
                        <p>
                          부진 자산: <strong className="text-white">{riskAnalysis.weakestAsset.symbol}</strong>{' '}
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
                              <li key={item.currency} className="text-xs text-gray-400">
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
                  <div className="cyber-card border-l-4 border-orange-500 bg-orange-900/20">
                    <h4 className="text-sm font-semibold text-orange-400 mb-2">리스크 주요 포인트</h4>
                    <ul className="space-y-1 text-xs text-orange-300">
                      {riskAnalysis.insights.map((item, idx) => (
                        <li key={idx}>• {item}</li>
                      ))}
                    </ul>
                    <p className="text-[11px] text-orange-400/70 mt-3">
                      자동 계산 지표는 참고용이며, 실제 의사결정 시 추가 데이터 확인과 전문가 상담이 필요합니다.
                    </p>
                  </div>
                )}

                {/* AI 해석 */}
                {riskAnalysis.aiInterpretation && (
                  <div className="cyber-card bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border-l-4 border-indigo-500">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-indigo-300 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        🧠 AI 리스크 해석
                      </h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyToClipboard(riskAnalysis.aiInterpretation)}
                          className="text-xs text-indigo-400 hover:text-indigo-200"
                        >
                          복사
                        </button>
                        <button
                          onClick={() => downloadReport('risk_analysis_ai', riskAnalysis.aiInterpretation)}
                          className="text-xs text-indigo-400 hover:text-indigo-200"
                        >
                          다운로드
                        </button>
                      </div>
                    </div>
                    <div className="markdown-body">
                      <ReactMarkdown
                        className="prose max-w-none leading-relaxed"
                        remarkPlugins={[remarkGfm]}
                        components={darkMarkdownComponents}
                      >
                        {riskAnalysis.aiInterpretation}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}

            {riskAnalysis && riskAnalysis.error && (
              <div className="cyber-card text-center py-12">
                <AlertTriangle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
                <p className="text-gray-400">{riskAnalysis.error}</p>
              </div>
            )}

            {!riskAnalysis && !loading && (
              <div className="cyber-card text-center py-12 border-dashed border-gray-700">
                <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">리스크 진단을 시작하려면 버튼을 클릭하세요</p>
              </div>
            )}
          </div>
        )
      }

      {/* Rebalancing Tab */}
      {
        activeTab === 'rebalancing' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 border border-indigo-500/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-indigo-200">
                <strong className="text-indigo-400">🧠 GPT-5.2 + 자동 계산:</strong> 목표 비율을 설정하면 AI가 리밸런싱 전략을 제안하고, 매매 금액을 자동으로 계산합니다
              </p>
            </div>

            {/* 목표 비율 설정 UI */}
            {portfolioData?.assets?.length > 0 && (
              <div className="cyber-card">
                <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                  <div>
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                      🎯 리밸런싱 목표 설정
                    </h4>
                    <p className="text-xs text-gray-400 mt-1">
                      각 자산의 목표 비중을 설정하면 필요한 매매 금액이 계산됩니다.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button
                      onClick={optimizeAllocation}
                      disabled={loading}
                      className="flex-1 md:flex-none text-xs px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-1 shadow-lg shadow-purple-900/20"
                    >
                      <Wand2 className="w-3 h-3" />
                      AI 최적 비중 제안
                    </button>
                    <button
                      onClick={initTargetAllocation}
                      className="flex-1 md:flex-none text-xs px-3 py-2 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 transition-colors"
                    >
                      현재 비율로 초기화
                    </button>
                    <button
                      onClick={() => setShowRebalanceCalc(!showRebalanceCalc)}
                      className="flex-1 md:flex-none text-xs px-3 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-colors"
                    >
                      {showRebalanceCalc ? '계산 결과 숨기기' : '매매 금액 계산'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {portfolioData.assets.map(asset => {
                    const totalValue = portfolioData.assets.reduce((sum, a) => sum + (a.valueKRW || 0), 0)
                    const currentPercent = ((asset.valueKRW || 0) / totalValue) * 100
                    const targetPercent = targetAllocation[asset.symbol] ?? currentPercent
                    const diffPercent = targetPercent - currentPercent

                    const handleStepParams = (step) => {
                      setTargetAllocation(prev => ({
                        ...prev,
                        [asset.symbol]: Math.max(0, Math.min(100, (parseFloat(prev[asset.symbol] ?? currentPercent) + step)))
                      }))
                    }

                    return (
                      <div key={asset.symbol} className="bg-slate-900/50 rounded-xl border border-slate-700 p-4 transition-all hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.1)] group">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-base text-gray-100">{asset.symbol}</span>
                              <span className="text-xs text-gray-500 truncate max-w-[100px]">{asset.name}</span>
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {formatCurrency(asset.valueKRW || 0, 'KRW')}
                              <span className={`ml-2 ${asset.profitPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {formatNumber(asset.profitPercent, 1)}%
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-gray-300 block">현재 {currentPercent.toFixed(1)}%</span>
                            {Math.abs(diffPercent) > 0.1 && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${diffPercent > 0 ? 'bg-emerald-900/50 text-emerald-400' : 'bg-rose-900/50 text-rose-400'}`}>
                                {diffPercent > 0 ? '+' : ''}{diffPercent.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Visualization Bars */}
                        <div className="space-y-1 mb-4">
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <span className="w-8">현보유</span>
                            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-gray-400" style={{ width: `${Math.min(100, currentPercent)}%` }} />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-indigo-300 font-medium">
                            <span className="w-8">목표</span>
                            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, targetPercent)}%` }} />
                            </div>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleStepParams(-0.5)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-600 text-gray-400 hover:text-white hover:border-indigo-500 transition-colors">
                            <Minus className="w-3 h-3" />
                          </button>

                          <div className="flex-1 relative px-2">
                            <input
                              type="range"
                              min="0"
                              max="50"
                              step="0.5"
                              value={targetPercent}
                              onChange={(e) => setTargetAllocation(prev => ({ ...prev, [asset.symbol]: parseFloat(e.target.value) }))}
                              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                          </div>

                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={targetPercent}
                            onChange={(e) => setTargetAllocation(prev => ({ ...prev, [asset.symbol]: parseFloat(e.target.value) || 0 }))}
                            className="w-16 h-8 text-center bg-slate-800 border border-slate-600 rounded-lg text-sm text-white focus:border-indigo-500 focus:outline-none"
                          />

                          <button onClick={() => handleStepParams(0.5)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-600 text-gray-400 hover:text-white hover:border-indigo-500 transition-colors">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* 목표 비율 합계 및 시뮬레이션 요약 */}
                <div className="mt-4 p-4 bg-slate-800 rounded-xl border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-gray-400 text-xs block mb-1">목표 비중 합계</span>
                      <span className={`text-lg font-bold ${Math.abs(Object.values(targetAllocation).reduce((a, b) => a + b, 0) - 100) < 0.1
                        ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                        {Object.values(targetAllocation).reduce((a, b) => a + b, 0).toFixed(1)}%
                      </span>
                      {Math.abs(Object.values(targetAllocation).reduce((a, b) => a + b, 0) - 100) >= 0.1 && (
                        <span className="text-xs text-rose-400 ml-2 animate-pulse">
                          (100%를 맞춰주세요)
                        </span>
                      )}
                    </div>
                    <div className="hidden md:block w-px h-10 bg-slate-700"></div>
                    <div>
                      <span className="text-gray-400 text-xs block mb-1">예상 총 회전율 (매매규모)</span>
                      <span className="text-lg font-bold text-gray-200">
                        {formatCurrency(calculateRebalanceTrades.reduce((sum, t) => sum + Math.abs(t.tradeAmount), 0), 'KRW')}
                      </span>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div>
                    {Math.abs(Object.values(targetAllocation).reduce((a, b) => a + b, 0) - 100) < 0.1 ? (
                      <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-sm text-emerald-400 font-medium">리밸런싱 준비 완료</span>
                      </div>
                    ) : (
                      <div className="px-4 py-2 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                        <span className="text-sm text-rose-400 font-medium">비중 합계 오류</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 매매 금액 계산 결과 */}
            {showRebalanceCalc && calculateRebalanceTrades.length > 0 && (
              <div className="cyber-card bg-gradient-to-r from-emerald-900/20 to-blue-900/20 border-l-4 border-emerald-500">
                <h4 className="text-sm font-semibold text-white mb-3">💰 리밸런싱 매매 금액</h4>
                <div className="space-y-2">
                  {calculateRebalanceTrades.map(trade => (
                    <div key={trade.symbol} className="flex items-center justify-between p-2 bg-slate-800/80 rounded-lg border border-slate-700">
                      <div>
                        <span className="font-medium text-gray-200">{trade.symbol}</span>
                        <span className="text-xs text-gray-400 ml-2">
                          {trade.currentPercent.toFixed(1)}% → {trade.targetPercent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`font - semibold ${trade.action === 'BUY' ? 'text-emerald-400' : 'text-rose-400'} `}>
                          {trade.action === 'BUY' ? '📈 매수' : '📉 매도'}
                        </span>
                        <p className={`text - sm font - bold ${trade.action === 'BUY' ? 'text-emerald-500' : 'text-rose-500'} `}>
                          {formatCurrency(Math.abs(trade.tradeAmount), 'KRW')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between text-sm">
                  <span className="text-gray-400">총 매수 금액:</span>
                  <span className="font-semibold text-emerald-400">
                    {formatCurrency(
                      calculateRebalanceTrades.filter(t => t.action === 'BUY').reduce((s, t) => s + t.tradeAmount, 0),
                      'KRW'
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* 자산 배분 차트 */}
            {allocationChartData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 현재 자산 배분 파이 차트 */}
                <div className="cyber-card">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">📊 현재 자산 배분</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={allocationChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${percent}% `}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {allocationChartData.map((entry, index) => (
                            <Cell key={`cell - ${index} `} fill={entry.fill} stroke="rgba(0,0,0,0.5)" />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatCurrency(value, 'KRW')}
                          contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: '#334155', color: '#e2e8f0' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 현재 vs 목표 비교 바 차트 */}
                <div className="cyber-card">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">📈 현재 vs 목표 비율</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rebalanceChartData} layout="vertical">
                        <XAxis type="number" domain={[0, 100]} unit="%" stroke="#94a3b8" fontSize={12} />
                        <YAxis type="category" dataKey="name" width={60} stroke="#94a3b8" fontSize={12} />
                        <Tooltip
                          formatter={(value) => `${value}% `}
                          contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: '#334155', color: '#e2e8f0' }}
                        />
                        <Legend wrapperStyle={{ color: '#94a3b8' }} />
                        <Bar dataKey="current" name="현재" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="target" name="목표" fill="#6366f1" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {portfolioInsights && (
              <div className="cyber-card border border-indigo-500/30 bg-indigo-900/20">
                <h4 className="text-sm font-semibold text-indigo-300 mb-2">리밸런싱 참고 지표</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-indigo-200">
                  <div>
                    <p className="font-medium mb-1 text-indigo-400">과도 비중</p>
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
                    <p className="font-medium mb-1 text-indigo-400">부족 비중</p>
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
                  <div className="mt-3 text-xs text-indigo-200">
                    <p className="font-medium mb-1 text-indigo-400">통화 노출 상위</p>
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
              className="cyber-btn flex items-center gap-2"
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
                  className="px-3 py-1.5 text-xs font-medium text-gray-400 border border-gray-600 rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
                >
                  복사
                </button>
                <button
                  type="button"
                  onClick={() => downloadReport('rebalancing_plan', rebalancingSuggestion)}
                  className="px-3 py-1.5 text-xs font-medium text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/10 transition-colors"
                >
                  다운로드
                </button>
              </div>
            )}

            {rebalancingSuggestion && (
              <div className="cyber-card">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-white">리밸런싱 전략 제안</h3>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-sm">
                  <ReactMarkdown
                    className="prose max-w-none leading-relaxed"
                    remarkPlugins={[remarkGfm]}
                    components={darkMarkdownComponents}
                  >
                    {rebalancingSuggestion}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {!rebalancingSuggestion && !loading && (
              <div className="cyber-card text-center py-12 border-dashed border-gray-700">
                <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">리밸런싱 제안을 생성하려면 버튼을 클릭하세요</p>
              </div>
            )}
          </div>
        )
      }

      {/* AI Timing Analysis Tab */}
      {
        activeTab === 'timing' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-purple-200">
                <strong className="text-purple-400">🔮 AI 매매 타이밍:</strong> 원하는 종목을 선택하여 기술적 분석 기반 매수/매도 신호를 AI가 분석합니다.
              </p>
            </div>

            {/* 종목 선택 UI */}
            <div className="cyber-card mb-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">📋 분석할 종목 선택</h4>

              {/* 보유 종목에서 선택 */}
              {portfolioData?.assets?.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs text-gray-500 mb-3">보유 종목에서 선택:</p>
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                    {portfolioData.assets.map(asset => {
                      const isSelected = selectedStocksForAI.some(s => s.symbol === asset.symbol)
                      return (
                        <div
                          key={asset.symbol}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedStocksForAI(prev => prev.filter(s => s.symbol !== asset.symbol))
                            } else {
                              setSelectedStocksForAI(prev => [...prev, {
                                symbol: asset.symbol,
                                name: asset.name || asset.type,
                                currentPrice: asset.currentPrice,
                                profitPercent: asset.profitPercent
                              }])
                            }
                          }}
                          className={`
                            relative p-3 rounded-xl border cursor-pointer transition-all duration-200 group
                            ${isSelected
                              ? 'bg-purple-900/30 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                              : 'bg-slate-800/50 border-slate-700 hover:border-purple-500/50 hover:bg-slate-800'
                            }
                          `}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h5 className={`font-bold text-sm ${isSelected ? 'text-purple-300' : 'text-gray-200'}`}>
                                {asset.symbol}
                              </h5>
                              <p className="text-[10px] text-gray-500 truncate">
                                {asset.name}
                              </p>
                            </div>
                            <div className={`
                              w-4 h-4 rounded-full border flex items-center justify-center transition-colors
                              ${isSelected
                                ? 'bg-purple-500 border-purple-500'
                                : 'border-slate-600 group-hover:border-purple-500/50'
                              }
                            `}>
                              {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                          </div>

                          <div className="flex justify-between items-end">
                            <span className="text-xs font-medium text-gray-300">
                              {formatCurrency(asset.currentPrice, asset.currency)}
                            </span>
                            <span className={`text-[10px] font-bold ${asset.profitPercent > 0 ? 'text-emerald-400' :
                              asset.profitPercent < 0 ? 'text-rose-400' : 'text-gray-400'
                              }`}>
                              {asset.profitPercent > 0 ? '+' : ''}{formatNumber(asset.profitPercent, 1)}%
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 직접 입력 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customAISymbol}
                  onChange={(e) => setCustomAISymbol(e.target.value.toUpperCase())}
                  placeholder="종목 심볼 입력 (예: AAPL)"
                  className="flex-1 px-3 py-2 text-sm bg-slate-900 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-600"
                />
                <button
                  onClick={() => {
                    if (customAISymbol.trim() && !selectedStocksForAI.some(s => s.symbol === customAISymbol.trim())) {
                      setSelectedStocksForAI(prev => [...prev, {
                        symbol: customAISymbol.trim(),
                        name: customAISymbol.trim()
                      }])
                      setCustomAISymbol('')
                    }
                  }}
                  className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  추가
                </button>
              </div>

              {/* 선택된 종목 표시 */}
              {selectedStocksForAI.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-xs text-gray-500 mb-2">선택된 종목 ({selectedStocksForAI.length}개):</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedStocksForAI.map(stock => (
                      <span key={stock.symbol} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-900/40 text-purple-300 border border-purple-500/30 text-xs rounded-full">
                        {stock.symbol}
                        <button
                          onClick={() => setSelectedStocksForAI(prev => prev.filter(s => s.symbol !== stock.symbol))}
                          className="text-purple-400 hover:text-white ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <button
                      onClick={() => setSelectedStocksForAI([])}
                      className="text-xs text-gray-500 hover:text-gray-300 ml-1"
                    >
                      전체 해제
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={generateTimingAnalysis}
              disabled={loading}
              className="cyber-btn flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {loading ? '분석 중...' : selectedStocksForAI.length > 0 ? `${selectedStocksForAI.length}개 종목 분석 생성` : '전체 포트폴리오 분석 생성'}
            </button>

            {timingAnalysis && (
              <div className="cyber-card bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-l-4 border-purple-500">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-purple-300">🔮 AI 매매 타이밍 분석</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(timingAnalysis)}
                      className="text-xs text-purple-400 hover:text-purple-200"
                    >
                      복사
                    </button>
                    <button
                      onClick={() => downloadReport('timing_analysis', timingAnalysis)}
                      className="text-xs text-purple-400 hover:text-purple-200"
                    >
                      다운로드
                    </button>
                  </div>
                </div>
                <div className="markdown-body">
                  <ReactMarkdown
                    className="prose max-w-none leading-relaxed"
                    remarkPlugins={[remarkGfm]}
                    components={darkMarkdownComponents}
                  >
                    {timingAnalysis}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {!timingAnalysis && !loading && (
              <div className="cyber-card text-center py-12 border-dashed border-gray-700">
                <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">AI 매매 타이밍 분석을 생성하려면 버튼을 클릭하세요</p>
                <p className="text-xs text-gray-500 mt-2">보유 종목의 기술적 분석 및 매수/매도 신호를 AI가 제공합니다</p>
              </div>
            )}
          </div>
        )
      }

      {/* AI News Summary Tab */}
      {
        activeTab === 'news' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 border border-amber-500/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-amber-200">
                <strong className="text-amber-400">📰 AI 뉴스 요약:</strong> 보유 종목 관련 최신 동향과 뉴스를 AI가 분석 및 요약합니다.
              </p>
            </div>

            <button
              onClick={generateNewsSummary}
              disabled={loading}
              className="cyber-btn flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {loading ? '요약 중...' : '뉴스 요약 생성'}
            </button>

            {newsSummary && (
              <div className="cyber-card bg-gradient-to-r from-amber-900/20 to-orange-900/20 border-l-4 border-amber-500">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-amber-300">📰 AI 뉴스 요약</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(newsSummary)}
                      className="text-xs text-amber-400 hover:text-amber-200"
                    >
                      복사
                    </button>
                    <button
                      onClick={() => downloadReport('news_summary', newsSummary)}
                      className="text-xs text-amber-400 hover:text-amber-200"
                    >
                      다운로드
                    </button>
                  </div>
                </div>
                <div className="markdown-body">
                  <ReactMarkdown
                    className="prose max-w-none leading-relaxed"
                    remarkPlugins={[remarkGfm]}
                    components={darkMarkdownComponents}
                  >
                    {newsSummary}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {!newsSummary && !loading && (
              <div className="cyber-card text-center py-12 border-dashed border-gray-700">
                <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">AI 뉴스 요약을 생성하려면 버튼을 클릭하세요</p>
                <p className="text-xs text-gray-500 mt-2">보유 종목 관련 최신 동향 및 뉴스를 AI가 분석합니다</p>
              </div>
            )}
          </div>
        )
      }

      {/* Report History */}
      <div className="cyber-card mt-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-white">최근 생성된 AI 리포트</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              최대 20개의 기록을 저장하며, 최신 5개만 표시합니다.
            </span>
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-medium text-gray-400 border border-gray-600 rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
              onClick={downloadHistory}
            >
              전체 히스토리 다운로드
            </button>
          </div>
        </div>
        {renderHistory()}
      </div>

      {
        historyViewer.open && historyViewer.entry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/50">
                <div>
                  <h3 className="text-lg font-semibold text-white">{historyViewer.entry.summary}</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(historyViewer.entry.createdAt).toLocaleString('ko-KR')} · {historyViewer.entry.type}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-gray-400 hover:text-white"
                  onClick={() => setHistoryViewer({ open: false, entry: null })}
                >
                  ✖
                </button>
              </div>
              <div className="px-6 py-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="markdown-body text-sm text-gray-300">
                  <ReactMarkdown
                    className="prose max-w-none leading-relaxed"
                    remarkPlugins={[remarkGfm]}
                    components={darkMarkdownComponents}
                  >
                    {historyViewer.entry.content}
                  </ReactMarkdown>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-700 bg-slate-800/30">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  onClick={() => copyToClipboard(historyViewer.entry.content)}
                >
                  복사
                </button>
                <button
                  type="button"
                  className="cyber-btn px-4 py-2 text-sm"
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
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
                  onClick={() => setHistoryViewer({ open: false, entry: null })}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* AI Chat Tab - Smart Investment Assistant */}
      {
        activeTab === 'chat' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-900/30 to-cyan-900/30 border border-emerald-500/20 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">🧠 스마트 투자 어시스턴트</h3>
                  <p className="text-xs text-emerald-300/70">포트폴리오 · 시장 · 목표 데이터를 실시간 연동하여 맞춤형 상담을 제공합니다</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-2 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-full">💬 대화 맥락 기억</span>
                <span className="px-2 py-0.5 text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded-full">📊 포트폴리오 연동</span>
                <span className="px-2 py-0.5 text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-full">🔮 시장 데이터 반영</span>
              </div>
            </div>

            {/* Cashflow Summary (existing) */}
            {cashflowInsights && (
              <div className="cyber-card border border-emerald-500/30 bg-emerald-900/20">
                <h4 className="text-sm font-semibold text-emerald-300 mb-2">자산 현황 요약</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-emerald-200">
                  <div>
                    <p className="font-medium mb-1 text-emerald-400">누적 자산 & 연간 흐름</p>
                    <ul className="space-y-1">
                      <li>• 총자산: {formatCurrency(cashflowInsights.totalAssets, 'KRW')}</li>
                      <li>• 연간 순변화: {formatCurrency(cashflowInsights.annualNetChange, 'KRW')}</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1 text-emerald-400">월평균 수입/지출</p>
                    <ul className="space-y-1">
                      <li>• 수입: {formatCurrency(cashflowInsights.averageMonthlyIncome, 'KRW')}</li>
                      <li>• 지출: {formatCurrency(cashflowInsights.averageMonthlyExpense, 'KRW')}</li>
                    </ul>
                  </div>
                </div>
                {cashflowInsights.latestMonth && (
                  <div className="mt-3 text-xs text-emerald-200">
                    <p className="font-medium mb-1 text-emerald-400">최근 월({cashflowInsights.latestMonth.label})</p>
                    <ul className="space-y-1">
                      <li>- 수입: {formatCurrency(cashflowInsights.latestMonth.income, 'KRW')}</li>
                      <li>- 지출: {formatCurrency(cashflowInsights.latestMonth.expense, 'KRW')}</li>
                      <li>- 순변화: {formatCurrency(cashflowInsights.latestMonth.netChange, 'KRW')}</li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Chat Container */}
            <div className="cyber-card flex flex-col p-0 overflow-hidden" style={{ height: chatMessages.length > 0 ? '700px' : 'auto' }}>
              {/* Chat Header Bar */}
              {chatMessages.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs text-gray-400">대화 중 · {chatMessages.filter(m => m.role === 'user').length}개 질문</span>
                  </div>
                  <button
                    onClick={() => setChatMessages([])}
                    className="px-3 py-1 text-xs text-gray-400 border border-slate-600 rounded-lg hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    새 대화
                  </button>
                </div>
              )}

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto space-y-4 p-5 custom-scrollbar">
                {chatMessages.length === 0 ? (
                  <div className="py-6">
                    {/* Welcome Message */}
                    <div className="text-center mb-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-2xl border border-emerald-500/30 flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-emerald-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">무엇이든 물어보세요!</h3>
                      <p className="text-sm text-gray-400">포트폴리오와 시장 데이터를 분석하여 전문가 수준의 답변을 드립니다</p>
                    </div>

                    {/* Quick Action Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        {
                          icon: '📊',
                          title: '포트폴리오 전체 진단',
                          desc: '보유 종목의 수익률, 리스크, 분산 정도를 종합 분석',
                          prompt: '내 포트폴리오를 전체적으로 진단해줘. 수익률, 리스크, 분산 투자 현황을 분석하고 개선점을 제안해줘.',
                          color: 'emerald'
                        },
                        {
                          icon: '📉',
                          title: portfolioData?.assets?.length ? `부진 종목 분석 (${(() => { const w = portfolioData.assets.reduce((min, a) => a.profitPercent < min.profitPercent ? a : min, portfolioData.assets[0]); return w?.symbol || '?'; })()})` : '부진 종목 분석',
                          desc: '가장 수익률이 낮은 종목의 문제점과 대응 전략',
                          prompt: portfolioData?.assets?.length
                            ? `내 포트폴리오에서 가장 수익률이 낮은 종목을 분석해줘. 계속 보유해야 할지, 손절해야 할지 판단 근거를 제시해줘.`
                            : '내 투자에서 부진한 항목이 있다면 분석하고 대응 방안을 제안해줘.',
                          color: 'rose'
                        },
                        {
                          icon: '🌍',
                          title: '시장 대비 전략 점검',
                          desc: '현재 시장 상황에서 내 투자 방향이 올바른지 진단',
                          prompt: '현재 글로벌 시장 상황과 내 포트폴리오를 비교 분석해줘. 시장 대비 내 투자 전략이 적절한지 평가하고, 조정이 필요한 부분을 알려줘.',
                          color: 'blue'
                        },
                        {
                          icon: '💱',
                          title: '환율 리스크 분석',
                          desc: '원/달러 환율 변동이 내 자산에 미치는 영향',
                          prompt: '원/달러 환율 변동이 내 포트폴리오에 미치는 영향을 분석해줘. 환 헤지가 필요한지, 어떤 전략으로 환율 리스크를 관리하면 좋을지 조언해줘.',
                          color: 'amber'
                        },
                        {
                          icon: '💰',
                          title: '배당 포트폴리오 최적화',
                          desc: '안정적인 배당 수익을 위한 종목 구성 제안',
                          prompt: '내 현재 포트폴리오를 배당 투자 관점에서 분석해줘. 배당 수익률을 높이면서도 안정적인 포트폴리오를 구성하려면 어떤 조정이 필요할까?',
                          color: 'purple'
                        },
                        {
                          icon: '🏦',
                          title: '세금 절약 전략',
                          desc: '양도세, 배당세 등 절세 방안 종합 가이드',
                          prompt: '한국 투자자 관점에서 내 포트폴리오의 세금 최적화 전략을 제안해줘. 해외주식 양도소득세, 배당소득세 절약을 위해 어떤 전략을 쓸 수 있을까?',
                          color: 'cyan'
                        },
                        {
                          icon: '🔍',
                          title: '신규 투자 종목 추천',
                          desc: '현재 포트폴리오와 시너지가 높은 종목 발굴',
                          prompt: '내 현재 포트폴리오 구성을 고려했을 때, 분산 투자와 성장성 측면에서 추가로 매수하면 좋을 종목을 5개 추천하고 각각의 근거를 설명해줘.',
                          color: 'teal'
                        },
                        {
                          icon: '🏖️',
                          title: '은퇴 자금 플래닝',
                          desc: '목표 은퇴 시점까지의 자산 증식 로드맵',
                          prompt: '현재 내 자산 규모와 투자 성과를 기반으로, 20년 후 은퇴를 목표로 한 자산 증식 플랜을 수립해줘. 월 투자 금액, 목표 수익률, 추천 포트폴리오 구성을 제안해줘.',
                          color: 'indigo'
                        }
                      ].map((card, idx) => {
                        const colorMap = {
                          emerald: 'border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/5',
                          rose: 'border-rose-500/30 hover:border-rose-500/60 hover:bg-rose-500/5',
                          blue: 'border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-500/5',
                          amber: 'border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/5',
                          purple: 'border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/5',
                          cyan: 'border-cyan-500/30 hover:border-cyan-500/60 hover:bg-cyan-500/5',
                          teal: 'border-teal-500/30 hover:border-teal-500/60 hover:bg-teal-500/5',
                          indigo: 'border-indigo-500/30 hover:border-indigo-500/60 hover:bg-indigo-500/5'
                        }
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              setChatInput(card.prompt)
                              setTimeout(() => {
                                const fakeEvent = { preventDefault: () => { } }
                                setChatInput('')
                                setChatMessages(prev => [...prev, { role: 'user', content: card.prompt }])
                                setLoading(true)

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
                                  userMessage: card.prompt,
                                  context,
                                  marketInsights,
                                  portfolioInsights
                                })

                                aiService.routeAIRequest(
                                  prompt,
                                  aiService.TASK_LEVEL.ADVANCED,
                                  '당신은 최고급 투자 전문가 AI 어시스턴트입니다. 사용자의 포트폴리오와 시장 데이터를 바탕으로 전문적이고 실용적인 답변을 마크다운 형식으로 제공합니다.',
                                  selectedAI
                                ).then(response => {
                                  setChatMessages(prev => [...prev, { role: 'assistant', content: response }])
                                }).catch(() => {
                                  setChatMessages(prev => [...prev, { role: 'assistant', content: '⚠️ AI API 연결에 실패했습니다.' }])
                                }).finally(() => {
                                  setLoading(false)
                                })
                              }, 50)
                            }}
                            className={`p-4 rounded-xl border bg-slate-800/30 transition-all duration-200 text-left group ${colorMap[card.color] || colorMap.emerald}`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-2xl flex-shrink-0">{card.icon}</span>
                              <div>
                                <p className="font-semibold text-sm text-white group-hover:text-cyan-300 transition-colors">{card.title}</p>
                                <p className="text-xs text-gray-500 mt-1">{card.desc}</p>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] ${msg.role === 'user' ? '' : 'w-full max-w-[85%]'}`}>
                        <div
                          className={`rounded-2xl px-5 py-4 shadow-md ${msg.role === 'user'
                            ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-br-sm'
                            : 'bg-slate-800/80 border border-slate-700 text-gray-100 rounded-bl-sm'
                            }`}
                        >
                          {msg.role === 'user' ? (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          ) : (
                            <div className="prose-sm max-w-none">
                              <ReactMarkdown
                                className="prose max-w-none leading-relaxed"
                                remarkPlugins={[remarkGfm]}
                                components={darkMarkdownComponents}
                              >
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                        {/* Action buttons for AI responses */}
                        {msg.role === 'assistant' && (
                          <div className="flex gap-2 mt-1.5 ml-1">
                            <button
                              onClick={() => copyToClipboard(msg.content)}
                              className="px-2 py-1 text-[10px] text-gray-500 hover:text-cyan-400 border border-transparent hover:border-slate-600 rounded-md transition-colors flex items-center gap-1"
                            >
                              📋 복사
                            </button>
                            <button
                              onClick={() => downloadReport(`ai_chat_${idx}`, msg.content)}
                              className="px-2 py-1 text-[10px] text-gray-500 hover:text-cyan-400 border border-transparent hover:border-slate-600 rounded-md transition-colors flex items-center gap-1"
                            >
                              💾 저장
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-800/80 border border-slate-700 rounded-2xl rounded-bl-sm px-5 py-4 shadow-md">
                      <div className="flex items-center gap-3">
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                        <span className="text-sm text-gray-400">AI가 분석 중입니다...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 bg-slate-800/80 border-t border-slate-700">
                <form onSubmit={handleChatSubmit} className="flex gap-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="투자에 대해 무엇이든 물어보세요..."
                    className="flex-1 px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-white placeholder-gray-500 text-sm"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !chatInput.trim()}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    전송
                  </button>
                </form>
              </div>
            </div>
          </div>
        )
      }
    </div >
  )
}

export default AIReport
