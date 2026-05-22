// 모든 AI 호출을 서버 측 프록시(/.netlify/functions/ai-proxy)로 통합하고, Tier 라우팅·응답 캐싱·심층모드 토글을 관장하는 클라이언트 서비스
import axios from 'axios'

const PROXY_URL = '/.netlify/functions/ai-proxy'

// 응답 캐시 (localStorage)
// CACHE_VERSION 을 올리면 기존 캐시가 자동으로 무효화된다.
// v2: 2026-05-21 — Gemini systemInstruction/generationConfig/safetySettings 강화로 응답 품질 개선
const CACHE_VERSION = 'v2'
const CACHE_KEY = 'ai_response_cache'
const CACHE_TTL_MS = 30 * 60 * 1000 // 30분

// 사용자가 켠 "심층모드 (GPT-4o)" 토글 — UI 가 localStorage 에 저장
const PREMIUM_KEY = 'ai_premium_mode'

const isPremiumMode = () => {
  try {
    return localStorage.getItem(PREMIUM_KEY) === 'true'
  } catch {
    return false
  }
}

// 단순 해시 — 캐시 키용 (충돌률 낮음, 보안용 아님)
const hashString = (str) => {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i)
  }
  return (h >>> 0).toString(36)
}

const readCache = () => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
  } catch {
    return {}
  }
}

const writeCache = (cache) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch (err) {
    console.warn('AI cache write failed:', err.message)
  }
}

const getCached = (key) => {
  const cache = readCache()
  const entry = cache[key]
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) {
    return entry
  }
  return null
}

const setCached = (key, payload) => {
  const cache = readCache()
  cache[key] = { ...payload, ts: Date.now() }
  // 최대 30개 항목 유지 (오래된 것부터 제거)
  const entries = Object.entries(cache)
  if (entries.length > 30) {
    entries
      .sort((a, b) => a[1].ts - b[1].ts)
      .slice(0, entries.length - 30)
      .forEach(([k]) => delete cache[k])
  }
  writeCache(cache)
}

class AIService {
  constructor() {
    this.TASK_LEVEL = {
      BASIC: 'basic',         // Gemini Flash — 요약, 간단 응답
      STANDARD: 'standard',   // Gemini 2.5 Pro — 리포트, 분석, 채팅
      ADVANCED: 'standard',   // 호환 별칭 — 기존 호출자 코드 무수정 유지
      PREMIUM: 'premium'      // GPT-4o — 사용자 명시 토글 시
    }
  }

  /**
   * 모든 AI 호출의 단일 진입점. 프록시 함수로 POST 하고 응답을 캐싱한다.
   * @param {string} prompt
   * @param {string} taskLevel BASIC / STANDARD / PREMIUM (또는 호환 ADVANCED)
   * @param {string} systemPrompt
   * @param {string} forceProvider 'auto' | 'gpt' | 'gemini'
   * @param {object} options { maxTokens, temperature, skipCache }
   * @returns {Promise<string>}
   */
  async routeAIRequest(prompt, taskLevel = this.TASK_LEVEL.BASIC, systemPrompt = '', forceProvider = 'auto', options = {}) {
    // 사용자가 심층모드 토글 켰고 forceProvider 가 auto 면 → GPT-4o 강제
    let resolvedProvider = forceProvider
    if (forceProvider === 'auto' && isPremiumMode()) {
      resolvedProvider = 'gpt'
      console.log('🚀 Premium mode ON — GPT-4o 강제 사용')
    }

    const cacheKey = hashString(`${CACHE_VERSION}|${resolvedProvider}|${taskLevel}|${systemPrompt}|${prompt}`)
    if (!options.skipCache) {
      const cached = getCached(cacheKey)
      if (cached) {
        console.log(`💾 AI cache hit (${cached.provider}/${cached.model})`)
        return cached.text
      }
    }

    try {
      const response = await axios.post(
        PROXY_URL,
        {
          taskLevel,
          forceProvider: resolvedProvider,
          systemPrompt,
          prompt,
          maxTokens: options.maxTokens,
          temperature: options.temperature
        },
        { timeout: 30000 }
      )

      const { text, provider, model, fallback } = response.data
      if (fallback) {
        console.warn(`⚠️ AI fallback used → ${fallback.finalProvider}/${fallback.finalModel}`)
      } else {
        console.log(`✅ AI response (${provider}/${model})`)
      }

      if (text) {
        setCached(cacheKey, { text, provider, model })
      }
      return text
    } catch (error) {
      console.error('AI proxy request failed:', error.response?.data || error.message)
      throw new Error(error.response?.data?.message || error.message || 'AI request failed')
    }
  }

  /**
   * 시장 데이터 한 줄 요약 (BASIC)
   */
  async generateMarketSummary(marketData) {
    try {
      const today = new Date().toLocaleDateString('ko-KR')
      const prompt = `[${today} 기준] 다음 시장 데이터를 간단히 요약해주세요 (3-5문장):

${JSON.stringify(marketData, null, 2)}

주요 지수 변화, 특이사항, 간단한 코멘트만 제공하세요.`
      return await this.routeAIRequest(prompt, this.TASK_LEVEL.BASIC, '당신은 시장 데이터 요약 어시스턴트입니다.')
    } catch (error) {
      console.error('Market Summary Error:', error)
      return this.getFallbackMarketSummary()
    }
  }

  /**
   * 시장 분석 리포트 (STANDARD)
   */
  async generateMarketReport(marketData) {
    try {
      const today = new Date().toLocaleDateString('ko-KR')
      const prompt = `[${today} 기준] 다음 시장 데이터를 기반으로 상세한 시장 분석 리포트를 작성해주세요:

${JSON.stringify(marketData, null, 2)}

다음 항목을 포함해주세요.
1. 시장 개요 및 주요 트렌드
2. 섹터별 분석
3. 리스크 요인
4. 투자 전략 제안
5. 단기/중기 전망

전문가 수준의 분석을 제공하되 일반 투자자도 이해하기 쉽게 작성해주세요.`
      return await this.routeAIRequest(
        prompt,
        this.TASK_LEVEL.STANDARD,
        '당신은 글로벌 시장 분석 전문가입니다. 객관적 데이터에 기반한 통찰력 있는 시장 분석을 제공합니다.'
      )
    } catch (error) {
      console.error('Market Report Error:', error)
      return this.getFallbackReport()
    }
  }

  /**
   * 포트폴리오 정밀 분석 (STANDARD)
   */
  async analyzePortfolio(portfolioData) {
    try {
      const today = new Date().toLocaleDateString('ko-KR')
      const slim = this.slimPortfolio(portfolioData)
      const prompt = `[${today} 기준] 다음 포트폴리오를 전문적으로 분석하고 상세한 개선 제안을 해주세요.

${JSON.stringify(slim, null, 2)}

다음 항목을 포함해주세요.
1. 자산 배분 분석 (Diversification)
2. 리스크 평가 (Risk Assessment)
3. 수익성 분석 (Performance Analysis)
4. 세부 개선 제안사항 (Actionable Recommendations)
5. 리밸런싱 전략
6. 목표 달성 가능성 평가

구체적이고 실행 가능한 조언을 제공하세요.`
      return await this.routeAIRequest(
        prompt,
        this.TASK_LEVEL.STANDARD,
        '당신은 자산관리 전문가(CFP)입니다. 포트폴리오를 정밀하게 분석하고 최적화 전략을 제시합니다.'
      )
    } catch (error) {
      console.error('Portfolio Analysis Error:', error)
      return this.getFallbackPortfolioAnalysis()
    }
  }

  /**
   * 포트폴리오 빠른 진단 (BASIC)
   */
  async quickPortfolioCheck(portfolioData) {
    try {
      const today = new Date().toLocaleDateString('ko-KR')
      const slim = this.slimPortfolio(portfolioData)
      const prompt = `[${today} 기준] 다음 포트폴리오의 간단한 건강도 체크를 해주세요 (5문장 이내):

${JSON.stringify(slim, null, 2)}

주요 강점과 개선이 필요한 1-2가지 포인트만 간단히 알려주세요.`
      return await this.routeAIRequest(
        prompt,
        this.TASK_LEVEL.BASIC,
        '당신은 포트폴리오 요약 어시스턴트입니다.'
      )
    } catch (error) {
      console.error('Quick Check Error:', error)
      return '포트폴리오 체크를 수행할 수 없습니다.'
    }
  }

  /**
   * 사용자 자유 질문 (STANDARD)
   */
  async generateInvestmentInsights(userQuestion, context = {}) {
    try {
      const today = new Date().toLocaleDateString('ko-KR')
      const slim = context.assets ? { ...context, assets: this.slimAssets(context.assets) } : context
      const prompt = `[${today} 기준] 사용자 질문: ${userQuestion}

컨텍스트 정보:
${JSON.stringify(slim, null, 2)}

전문가 관점에서 상세하고 실용적인 답변을 제공해주세요.`
      return await this.routeAIRequest(
        prompt,
        this.TASK_LEVEL.STANDARD,
        '당신은 투자 전문가입니다. 사용자의 질문에 전문적이고 실용적인 답변을 제공합니다.'
      )
    } catch (error) {
      console.error('Investment Insights Error:', error)
      return '죄송합니다. 답변을 생성할 수 없습니다. AI 서버 상태를 확인해주세요.'
    }
  }

  /**
   * 포트폴리오 컨텍스트 슬리밍 — 토큰 절감용. 시세 히스토리/메타 제거하고 핵심만 추출.
   */
  slimPortfolio(data) {
    if (!data) return data
    const out = {}
    if (Array.isArray(data.assets)) out.assets = this.slimAssets(data.assets)
    if (data.totals) out.totals = data.totals
    if (data.exchangeRate) out.exchangeRate = data.exchangeRate
    if (Array.isArray(data.goals)) {
      out.goals = data.goals.map(g => ({
        title: g.title || g.name,
        target: g.target_amount || g.targetAmount,
        deadline: g.deadline
      }))
    }
    return out
  }

  slimAssets(assets) {
    if (!Array.isArray(assets)) return assets
    return assets.map(a => ({
      symbol: a.symbol,
      name: a.name,
      type: a.type,
      currency: a.currency,
      account: a.account,
      qty: Number(a.quantity) || 0,
      avg: Number(a.avgPrice) || 0,
      current: Number(a.currentPrice) || 0,
      profitPct: Number((a.profitPercent || 0).toFixed(2))
    }))
  }

  /**
   * 사용 가능한 provider 상태 — 서버 측 키 유무는 알 수 없으므로 항상 "configured" 로 간주
   * (이전엔 클라이언트에서 직접 키를 보고 판단했지만, 보안상 이제 서버에서만 보유)
   */
  getAvailableProviders() {
    return {
      openai: true,
      gemini: true,
      strategy: 'dual'
    }
  }

  /**
   * 현재 활성 모델 라우팅 정보 — UI 표시용
   */
  getActiveStrategy() {
    return {
      basic: 'Gemini 2.5 Flash',
      standard: 'Gemini 2.5 Pro',
      premium: 'GPT-4o',
      premiumMode: isPremiumMode()
    }
  }

  /**
   * 심층모드 토글 — UI 에서 호출
   */
  setPremiumMode(enabled) {
    try {
      localStorage.setItem(PREMIUM_KEY, enabled ? 'true' : 'false')
    } catch {
      // ignore
    }
  }

  isPremiumMode() {
    return isPremiumMode()
  }

  /**
   * Fallback 응답 — 네트워크 실패/서버 키 미설정 시 안내문
   */
  getFallbackMarketSummary() {
    return `
시장 데이터 요약을 생성할 수 없습니다.

주요 지수들이 혼조세를 보이고 있으며, 기술주 중심의 상승세가 관찰됩니다.
분산 투자를 통한 리스크 관리가 권장됩니다.

*AI 분석을 사용하려면 Netlify 환경변수 OPENAI_API_KEY 또는 GEMINI_API_KEY 를 설정하세요.*
    `
  }

  getFallbackReport() {
    return `
# 시장 분석 리포트

⚠️ AI 서버가 응답하지 않아 샘플 리포트를 표시합니다.

## 시장 개요
- 주요 지수들이 혼조세를 보이고 있습니다.
- 기술주 중심의 Nasdaq 은 상승세를 유지하고 있습니다.

## 투자 전략
1. 분산 투자를 통한 리스크 관리
2. 장기 투자 관점 유지
3. 정기적인 포트폴리오 리밸런싱

## 주의사항
- 단기 변동성에 일희일비하지 마세요.
- 자신의 투자 목표와 위험 감내 수준을 고려하세요.

*Netlify 환경변수 OPENAI_API_KEY 또는 GEMINI_API_KEY 를 설정해 실제 AI 분석을 사용할 수 있습니다.*
    `
  }

  getFallbackPortfolioAnalysis() {
    return `
# 포트폴리오 분석

⚠️ AI 서버가 응답하지 않아 일반 가이드를 표시합니다.

## 권장 사항
1. **자산 배분**: 주식 60%, 채권 30%, 현금 10% 등 균형 잡힌 배분
2. **분산 투자**: 다양한 섹터와 지역에 분산
3. **정기 리밸런싱**: 분기/반기마다 비중 조정
4. **장기 관점**: 단기 변동에 흔들리지 말고 장기 목표 유지

*Netlify 환경변수 OPENAI_API_KEY 또는 GEMINI_API_KEY 를 설정해 실제 AI 분석을 사용할 수 있습니다.*
    `
  }
}

export default new AIService()
