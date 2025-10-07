import React, { useState } from 'react'
import { Sparkles, FileText, Download, RefreshCw, Zap } from 'lucide-react'
import aiService from '../services/aiService'
import AIStrategyBadge from '../components/AIStrategyBadge'

const AIReport = () => {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('market')
  const [marketReport, setMarketReport] = useState('')
  const [portfolioAnalysis, setPortfolioAnalysis] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')

  // Mock data for AI analysis
  const mockMarketData = {
    indices: {
      sp500: { price: 5234.18, change: 0.87 },
      nasdaq: { price: 16341.24, change: 0.76 },
      dow: { price: 38789.34, change: -0.14 }
    },
    crypto: {
      bitcoin: { price: 67234.50, change: 1.87 },
      ethereum: { price: 3456.78, change: -1.29 }
    },
    date: new Date().toLocaleDateString('ko-KR')
  }

  const mockPortfolioData = {
    totalValue: 12500,
    assets: [
      { symbol: 'AAPL', value: 1852.30, profitPercent: 23.5 },
      { symbol: 'SPY', value: 2228.35, profitPercent: 6.1 },
      { symbol: 'BTC', value: 6723.40, profitPercent: 12.1 }
    ],
    allocation: {
      stocks: 45,
      etf: 30,
      crypto: 15,
      cash: 10
    }
  }

  const generateMarketReport = async () => {
    setLoading(true)
    try {
      const report = await aiService.generateMarketReport(mockMarketData)
      setMarketReport(report)
    } catch (error) {
      setMarketReport('리포트 생성 중 오류가 발생했습니다. API 키를 확인해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const generatePortfolioAnalysis = async () => {
    setLoading(true)
    try {
      const analysis = await aiService.analyzePortfolio(mockPortfolioData)
      setPortfolioAnalysis(analysis)
    } catch (error) {
      setPortfolioAnalysis('분석 생성 중 오류가 발생했습니다. API 키를 확인해주세요.')
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
      const response = await aiService.generateInvestmentInsights(userMessage, mockPortfolioData)
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
