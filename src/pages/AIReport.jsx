import React, { useState, useEffect } from 'react'
import { Sparkles, FileText, Download, RefreshCw, Zap, TrendingUp, AlertTriangle } from 'lucide-react'
import aiService from '../services/aiService'
import marketDataService from '../services/marketDataService'
import AIStrategyBadge from '../components/AIStrategyBadge'

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
        const totalValue = assets.reduce((sum, a) => sum + a.totalValue, 0)
        const totalProfit = assets.reduce((sum, a) => sum + a.profit, 0)

        // Calculate allocation
        const typeGroups = assets.reduce((groups, asset) => {
          const type = asset.type
          if (!groups[type]) groups[type] = 0
          groups[type] += asset.totalValue
          return groups
        }, {})

        const allocation = {}
        Object.keys(typeGroups).forEach(type => {
          allocation[type] = ((typeGroups[type] / totalValue) * 100).toFixed(1)
        })

        setPortfolioData({
          totalValue,
          totalProfit,
          profitPercent: totalValue > 0 ? ((totalProfit / (totalValue - totalProfit)) * 100) : 0,
          assets: assets.map(a => ({
            symbol: a.symbol,
            name: a.name,
            type: a.type,
            value: a.totalValue,
            quantity: a.quantity,
            avgPrice: a.avgPrice,
            currentPrice: a.currentPrice,
            profit: a.profit,
            profitPercent: a.profitPercent
          })),
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
      const report = await aiService.generateMarketReport(marketData)
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
      const analysis = await aiService.analyzePortfolio(portfolioData)
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
      const profitPercentages = portfolioData.assets.map(a => a.profitPercent)
      const avgReturn = profitPercentages.reduce((sum, p) => sum + p, 0) / profitPercentages.length

      // Standard deviation (volatility)
      const variance = profitPercentages.reduce((sum, p) => sum + Math.pow(p - avgReturn, 2), 0) / profitPercentages.length
      const volatility = Math.sqrt(variance)

      // Sharpe ratio (simplified, assuming 0% risk-free rate)
      const sharpeRatio = avgReturn / volatility

      // Concentration risk (Herfindahl index)
      const totalValue = portfolioData.totalValue
      const concentrationIndex = portfolioData.assets.reduce((sum, a) => {
        const weight = a.value / totalValue
        return sum + (weight * weight)
      }, 0)

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
      const prompt = `다음 포트폴리오의 리밸런싱 전략을 제안해주세요:

현재 자산 배분:
${JSON.stringify(portfolioData.allocation, null, 2)}

자산 목록:
${portfolioData.assets.map(a => `- ${a.symbol} (${a.type}): $${a.value.toFixed(2)} (${a.profitPercent.toFixed(2)}%)`).join('\n')}

총 평가액: $${portfolioData.totalValue.toFixed(2)}
총 수익률: ${portfolioData.profitPercent.toFixed(2)}%

다음 항목을 포함해주세요:
1. 현재 포트폴리오 배분 평가
2. 최적 배분 비율 제안 (위험도 고려)
3. 구체적인 매수/매도 제안
4. 리밸런싱 시기 및 방법`

      const suggestion = await aiService.routeAIRequest(
        prompt,
        aiService.TASK_LEVEL.ADVANCED,
        '당신은 자산배분 전문가입니다. 포트폴리오 리밸런싱 전략을 제시합니다.'
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
      const response = await aiService.generateInvestmentInsights(userMessage, context)
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

      {/* AI Strategy Info Card */}
      <div className="card bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-white rounded-lg">
            <Zap className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-2">💡 이중 AI 전략 활용</h3>
            <div className="space-y-1 text-sm text-gray-700">
              <p>• <strong>Gemini 2.5 Flash</strong> (무료/저비용): 빠른 요약, 기본 데이터 수집</p>
              <p>• <strong>GPT-5</strong> (유료): 심층 투자 분석, 전략 수립, 포트폴리오 최적화</p>
              <p className="text-xs text-gray-600 mt-2">
                💰 비용 절감: 간단한 작업은 Gemini로, 중요한 분석은 GPT-5로 자동 라우팅됩니다.
              </p>
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
