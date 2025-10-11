import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Sparkles, FileText, Download, RefreshCw, Zap, TrendingUp, AlertTriangle, Clock, Archive } from 'lucide-react'
import aiService from '../services/aiService'
import marketDataService from '../services/marketDataService'
import AIStrategyBadge from '../components/AIStrategyBadge'

const formatNumber = (value, digits = 2) => {
  if (value === null || value === undefined) return 'N/A'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 'N/A'
  return numeric.toFixed(digits)
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
  const buildMarketHighlights = (data) => {
    if (!data) return null
    const lines = []

    if (data.stocks) {
      const { sp500, nasdaq, dow } = data.stocks
      const stockLines = [sp500, nasdaq, dow]
        .filter(Boolean)
        .map(item => `- ${item.name}: ${formatNumber(item.price, 2)} (${item.changePercent > 0 ? '+' : ''}${formatNumber(item.changePercent, 2)}%)`)
      if (stockLines.length) {
        lines.push('주요 지수 ETF')
        lines.push(...stockLines)
      }
    }

    if (data.gold) {
      lines.push('귀금속')
      lines.push(`- Gold (GLD): ${formatNumber(data.gold.price, 2)} (${data.gold.changePercent > 0 ? '+' : ''}${formatNumber(data.gold.changePercent, 2)}%)`)
    }

    if (data.crypto) {
      const cryptoLines = Object.values(data.crypto || {})
        .slice(0, 4)
        .map(coin => `- ${coin.name}: ${formatNumber(coin.price, 2)} USD (${coin.change24h > 0 ? '+' : ''}${formatNumber(coin.change24h, 2)}%)`)
      if (cryptoLines.length) {
        lines.push('암호화폐')
        lines.push(...cryptoLines)
      }
    }

    if (data.currency) {
      const { usdKrw, usdEur, usdJpy } = data.currency
      const fxLines = [usdKrw, usdEur, usdJpy].filter(Boolean).map(pair => `- ${pair.base}/${pair.target}: ${formatNumber(pair.rate, 4)}`)
      if (fxLines.length) {
        lines.push('환율')
        lines.push(...fxLines)
      }
    }

    return lines.join('\n')
  }

  const loadRealData = async () => {
    try {
      // Get real market data
      const market = await marketDataService.getAllMarketData()
      setMarketData(market)

      // Get portfolio data from localStorage (or could fetch from Portfolio component)
      const savedAssets = localStorage.getItem('portfolio_assets')
      if (savedAssets) {
        const assets = JSON.parse(savedAssets)
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
      }

      const savedGoals = localStorage.getItem('investment_goals')
      if (savedGoals) {
        try {
          const goals = JSON.parse(savedGoals)
          if (Array.isArray(goals) && goals.length > 0) {
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
        } catch (error) {
          console.error('Failed to parse goals:', error)
          setGoalsSummary(null)
        }
      } else {
        setGoalsSummary(null)
      }
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
      const highlights = buildMarketHighlights(marketData)
      const prompt = `다음 시장 데이터를 기반으로 Markdown 형식의 고급 투자 리포트를 작성해주세요.

데이터 스냅샷:
${JSON.stringify(marketData, null, 2)}

핵심 하이라이트:
${highlights || '- 제공된 하이라이트 없음'}

작성 가이드:
1. 반드시 섹션 제목을 사용하세요: "시장 개요", "섹터 및 자산별 분석", "리스크 요인과 기회", "전략 제안", "전망 및 체크포인트".
2. 필요한 경우 표나 불릿으로 핵심 수치를 제시하세요.
3. 최신 환율과 금리, 암호화폐 변동성 등 다양한 자산군을 모두 언급하세요.
4. 제공된 데이터의 시점과 한계를 명시하고, 추가 확인이 필요한 부분은 경고로 표시하세요.
5. 실행 가능한 투자 아이디어를 제안할 때는 위험도(저/중/고)와 예상 기간을 병기하세요.`

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
      const currencySummary = (portfolioData.totals.byCurrency || [])
        .map(item => `- ${item.currency}: 평가액 ${formatNumber(item.totalValue, 2)} (${formatNumber(item.totalValueKRW, 0)} KRW), 수익 ${formatNumber(item.totalProfit, 2)} (${formatNumber(item.totalProfitKRW, 0)} KRW), 수익률 ${formatNumber(item.profitPercent, 2)}%`)
        .join('\n')

      const assetSummary = portfolioData.assets
        .map(asset => `- ${asset.symbol} (${asset.type}, ${asset.currency}) | 수량 ${asset.quantity} | 평가액 ${formatNumber(asset.valueOriginal, 2)} ${asset.currency} / ${formatNumber(asset.valueKRW, 0)} KRW | 수익률 ${formatNumber(asset.profitPercent, 2)}%`)
        .join('\n')

      const prompt = `다음 포트폴리오를 ${portfolioData.baseCurrency} 기준으로 깊이 있게 분석하고 개선안을 제시해주세요.

총 평가액: ${formatNumber(portfolioData.totals.totalValueKRW, 0)} KRW (${formatNumber(portfolioData.totals.totalValueUSD, 2)} USD)
총 수익금: ${formatNumber(portfolioData.totals.totalProfitKRW, 0)} KRW (${formatNumber(portfolioData.totals.totalProfitUSD, 2)} USD)
평균 수익률: ${formatNumber(portfolioData.profitPercent, 2)}%

환율 정보:
- USD/KRW: ${portfolioData.exchangeRate.usdKrw ? formatNumber(portfolioData.exchangeRate.usdKrw, 4) : 'N/A'}
- 기준 통화: ${portfolioData.baseCurrency}

통화별 요약:
${currencySummary || '- 데이터 없음'}

자산 목록:
${assetSummary || '- 데이터 없음'}

사용자 목표 요약:
${goalsSummary
  ? `- 총 목표 수: ${goalsSummary.totalGoals}\n- 평균 진행률: ${goalsSummary.averageProgress ? formatNumber(goalsSummary.averageProgress, 1) : 'N/A'}%\n- 포트폴리오 연동 목표: ${goalsSummary.linkedGoals}개\n- 가장 임박한 목표: ${goalsSummary.upcomingGoal ? `${goalsSummary.upcomingGoal.name} (${goalsSummary.upcomingGoal.currency}, ${goalsSummary.upcomingGoal.targetDate})` : '없음'}`
  : '- 등록된 목표 없음'}

작성 가이드:
1. 섹션 제목은 "포트폴리오 개요", "통화 및 환율 영향", "목표 연계 분석", "리스크 및 수익성", "개선 제안", "실행 체크리스트" 순서를 따르세요.
2. 모든 금액은 가능하면 KRW와 USD를 함께 표기하고, 환율 변동이 성과에 미치는 영향을 설명하세요.
3. 목표가 없는 경우에도 어떤 목표를 설정하면 좋을지 제안하고, 목표가 있을 경우 달성 가능성을 평가하세요.
4. 개선 제안은 우선순위와 예상 영향(긍정/부정)을 명시한 불릿으로 작성하세요.
5. 제공된 데이터의 한계(실시간성, 환율 변동 가능성 등)를 마지막에 Disclaimer 섹션으로 정리하세요.`

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
      // Calculate risk metrics
      const profitPercentages = portfolioData.assets
        .map(a => a.profitPercent)
        .filter(p => Number.isFinite(p))
      const avgReturn = profitPercentages.length > 0
        ? profitPercentages.reduce((sum, p) => sum + p, 0) / profitPercentages.length
        : 0

      // Standard deviation (volatility)
      const variance = profitPercentages.length > 0
        ? profitPercentages.reduce((sum, p) => sum + Math.pow(p - avgReturn, 2), 0) / profitPercentages.length
        : 0
      const volatility = Math.sqrt(variance)

      // Sharpe ratio (simplified, assuming 0% risk-free rate)
      const sharpeRatio = volatility > 0 ? avgReturn / volatility : 0

      // Concentration risk (Herfindahl index)
      const totalValue = portfolioData.totalValue
      const concentrationIndex = totalValue > 0
        ? portfolioData.assets.reduce((sum, a) => {
            const weight = (a.valueKRW || 0) / totalValue
            return sum + (weight * weight)
          }, 0)
        : 0

      setRiskAnalysis({
        avgReturn: avgReturn.toFixed(2),
        volatility: volatility.toFixed(2),
        sharpeRatio: sharpeRatio.toFixed(2),
        concentrationIndex: concentrationIndex.toFixed(3),
        riskLevel: volatility > 15 ? 'High' : volatility > 8 ? 'Medium' : 'Low',
        diversificationScore: concentrationIndex < 0.25 ? 'Good' : concentrationIndex < 0.5 ? 'Fair' : 'Poor'
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
      const allocationSummary = Object.entries(portfolioData.allocation || {})
        .map(([type, percent]) => `- ${type}: ${formatNumber(percent, 2)}%`)
        .join('\n') || '- 데이터 없음'

      const assetLines = portfolioData.assets
        .map(a => `- ${a.symbol} (${a.type}, ${a.currency}) | 평가액 ${formatNumber(a.valueKRW, 0)} KRW (${formatNumber(a.valueUSD, 2)} USD) | 수익률 ${formatNumber(a.profitPercent, 2)}%`)
        .join('\n') || '- 데이터 없음'

      const prompt = `다음 포트폴리오의 리밸런싱 전략을 제안해주세요.

총 평가액: ${formatNumber(portfolioData.totals.totalValueKRW, 0)} KRW (${formatNumber(portfolioData.totals.totalValueUSD, 2)} USD)
총 수익금: ${formatNumber(portfolioData.totals.totalProfitKRW, 0)} KRW (${formatNumber(portfolioData.totals.totalProfitUSD, 2)} USD)
평균 수익률: ${formatNumber(portfolioData.profitPercent, 2)}%

현재 환율: USD/KRW = ${portfolioData.exchangeRate.usdKrw ? formatNumber(portfolioData.exchangeRate.usdKrw, 4) : 'N/A'}

현재 자산 배분:
${allocationSummary}

자산 목록(원화/달러 기준 병기):
${assetLines}

분석 지침:
1. 현재 배분과 통화별 비중을 평가하고, 리스크 요인을 짚어주세요.
2. 목표 위험 수준과 환율 변동 가능성을 고려한 최적 배분 비율을 제안해주세요.
3. 매수/매도 또는 환헤지 등 실행 가능한 리밸런싱 조치를 구체적으로 제안해주세요.
4. 리밸런싱 주기, 모니터링 포인트, 체크리스트를 알려주세요.
5. 실행 우선순위를 번호로 정렬하고, 각 조치별 예상 영향(긍정/부정)을 기재하세요.

원화와 달러 금액을 명확히 구분하고, 데이터의 한계나 추가 검증 필요사항은 Disclaimer로 정리해주세요.`

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
        goalsSummary
      }

      const prompt = `사용자 질문: ${userMessage}

컨텍스트 정보:
${JSON.stringify(context, null, 2)}

전문가 관점에서 상세하고 실용적인 답변을 제공해주세요.`

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
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('market')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'market'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          시장 리포트
        </button>
        <button
          onClick={() => setActiveTab('portfolio')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'portfolio'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          포트폴리오 진단
        </button>
        <button
          onClick={() => setActiveTab('risk')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'risk'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          리스크 진단
        </button>
        <button
          onClick={() => setActiveTab('rebalancing')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'rebalancing'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          리밸런싱 제안
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 font-medium transition-colors ${
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card">
                <h4 className="text-sm font-medium text-gray-600 mb-3">수익률 지표</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">평균 수익률</p>
                    <p className="text-2xl font-bold text-gray-900">{riskAnalysis.avgReturn}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">샤프 비율 (Sharpe Ratio)</p>
                    <p className="text-2xl font-bold text-primary-600">{riskAnalysis.sharpeRatio}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {parseFloat(riskAnalysis.sharpeRatio) > 1 ? '우수' : parseFloat(riskAnalysis.sharpeRatio) > 0.5 ? '양호' : '개선 필요'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <h4 className="text-sm font-medium text-gray-600 mb-3">리스크 지표</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">변동성 (Volatility)</p>
                    <p className={`text-2xl font-bold ${
                      riskAnalysis.riskLevel === 'High' ? 'text-danger' :
                      riskAnalysis.riskLevel === 'Medium' ? 'text-warning' : 'text-success'
                    }`}>
                      {riskAnalysis.volatility}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">위험도: {riskAnalysis.riskLevel}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">분산 점수</p>
                    <p className={`text-lg font-bold ${
                      riskAnalysis.diversificationScore === 'Good' ? 'text-success' :
                      riskAnalysis.diversificationScore === 'Fair' ? 'text-warning' : 'text-danger'
                    }`}>
                      {riskAnalysis.diversificationScore}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      집중도 지수: {riskAnalysis.concentrationIndex}
                    </p>
                  </div>
                </div>
              </div>
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
