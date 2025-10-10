import React, { useState, useEffect } from 'react'
import { Sparkles, FileText, Download, RefreshCw, Zap, TrendingUp, AlertTriangle } from 'lucide-react'
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

  // Load real market and portfolio data
  useEffect(() => {
    loadRealData()
  }, [])

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
      const prompt = `다음 시장 데이터를 전문적으로 분석하여 상세 투자 리포트를 작성해주세요:

${JSON.stringify(marketData, null, 2)}

다음 항목을 포함하세요:
1. 시장 개요 및 주요 동향
2. 섹터별 분석
3. 리스크 요인 및 기회 요인
4. 투자 전략 제안
5. 향후 전망

전문 애널리스트 수준의 깊이 있는 분석을 제공하세요.`

      const report = await aiService.routeAIRequest(
        prompt,
        aiService.TASK_LEVEL.ADVANCED,
        '당신은 20년 경력의 전문 투자 애널리스트입니다. 시장 데이터를 깊이 있게 분석하여 실용적인 투자 리포트를 작성합니다.',
        selectedAI
      )
      setMarketReport(report)
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

분석 항목:
1. 자산 배분 분석 (Diversification)
2. 통화별 리스크 및 환율 영향 평가
3. 수익성 분석 (Performance Analysis)
4. 세부 개선 제안 (Actionable Recommendations)
5. 리밸런싱 전략
6. 목표 달성 가능성 평가

통화 단위를 명확히 구분해 설명하고, 필요 시 USD와 KRW 기준을 모두 제시해주세요.`

      const analysis = await aiService.routeAIRequest(
        prompt,
        aiService.TASK_LEVEL.ADVANCED,
        '당신은 자산관리 전문가(CFP)입니다. 포트폴리오를 정밀하게 분석하고 최적화 전략을 제시합니다.',
        selectedAI
      )
      setPortfolioAnalysis(analysis)
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

원화와 달러 금액을 명확히 구분하여 설명해주세요.`

      const suggestion = await aiService.routeAIRequest(
        prompt,
        aiService.TASK_LEVEL.ADVANCED,
        '당신은 자산배분 전문가입니다. 포트폴리오 리밸런싱 전략을 제시합니다.',
        selectedAI
      )
      setRebalancingSuggestion(suggestion)
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
        market: marketData
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
              <button className="btn-secondary flex items-center gap-2">
                <Download className="w-5 h-5" />
                다운로드
              </button>
            )}
          </div>

          {marketReport && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-semibold">시장 분석 리포트</h3>
              </div>
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                  {marketReport}
                </pre>
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
              <button className="btn-secondary flex items-center gap-2">
                <Download className="w-5 h-5" />
                다운로드
              </button>
            )}
          </div>

          {portfolioAnalysis && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-semibold">포트폴리오 진단 결과</h3>
              </div>
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                  {portfolioAnalysis}
                </pre>
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
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-semibold">리밸런싱 전략 제안</h3>
              </div>
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                  {rebalancingSuggestion}
                </pre>
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
                    <p className="text-sm text-gray-500 mt-2">예: "지금 S&P 500에 투자하는 것이 좋을까요?"</p>
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
