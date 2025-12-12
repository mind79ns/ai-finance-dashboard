import axios from 'axios'
import { API_CONFIG } from '../config/constants'

/**
 * AI Service with Dual Strategy:
 * - Gemini 2.5 Flash: 기본 데이터 수집/요약용 (무료/저비용)
 * - GPT-5: 핵심 투자전략·분석엔진용 (고급 분석)
 */
class AIService {
  constructor() {
    this.provider = API_CONFIG.AI_PROVIDER
    // Task complexity levels
    this.TASK_LEVEL = {
      BASIC: 'basic',      // Gemini Flash
      ADVANCED: 'advanced' // GPT-5
    }
  }

  /**
   * Route request to appropriate AI based on task complexity
   * @param {string} forceProvider - 'auto', 'gpt', or 'gemini' to force specific AI
   */
  async routeAIRequest(prompt, taskLevel = this.TASK_LEVEL.BASIC, systemPrompt = '', forceProvider = 'auto') {
    try {
      // Force GPT
      if (forceProvider === 'gpt') {
        if (!API_CONFIG.OPENAI_API_KEY) {
          throw new Error('GPT API key not configured')
        }
        console.log('🧠 Using GPT-5.2 (Latest Flagship)')
        return await this.callOpenAI(prompt, systemPrompt)
      }

      // Force Gemini
      if (forceProvider === 'gemini') {
        if (!API_CONFIG.GEMINI_API_KEY) {
          throw new Error('Gemini API key not configured')
        }
        console.log('⚡ Using Gemini 3 Pro Preview (Deep Think)')
        return await this.callGemini(prompt, systemPrompt)
      }

      // Auto selection (original logic)
      // Advanced tasks → GPT-5.2 (if available)
      if (taskLevel === this.TASK_LEVEL.ADVANCED && API_CONFIG.OPENAI_API_KEY) {
        console.log('🧠 Using GPT-5.2 for advanced analysis')
        return await this.callOpenAI(prompt, systemPrompt)
      }

      // Basic tasks → Gemini Flash (cost-effective)
      if (API_CONFIG.GEMINI_API_KEY) {
        console.log('⚡ Using Gemini Flash for basic task')
        return await this.callGemini(prompt, systemPrompt)
      }

      // Fallback to OpenAI if Gemini not available
      if (API_CONFIG.OPENAI_API_KEY) {
        console.log('🔄 Fallback to OpenAI')
        return await this.callOpenAI(prompt, systemPrompt)
      }

      throw new Error('No AI provider configured')
    } catch (error) {
      console.error('AI Request Error:', error)
      throw error
    }
  }

  /**
   * Generate market summary (BASIC task - uses Gemini)
   */
  async generateMarketSummary(marketData) {
    try {
      const prompt = `다음 시장 데이터를 간단히 요약해주세요 (3-5문장):

${JSON.stringify(marketData, null, 2)}

주요 지수 변화, 특이사항, 간단한 코멘트만 제공하세요.`

      return await this.routeAIRequest(
        prompt,
        this.TASK_LEVEL.BASIC,
        '당신은 시장 데이터를 요약하는 AI 어시스턴트입니다.'
      )
    } catch (error) {
      console.error('Market Summary Error:', error)
      return this.getFallbackMarketSummary()
    }
  }

  /**
   * Generate detailed market report (ADVANCED task - uses GPT-5)
   */
  async generateMarketReport(marketData) {
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

      return await this.routeAIRequest(
        prompt,
        this.TASK_LEVEL.ADVANCED,
        '당신은 20년 경력의 전문 투자 애널리스트입니다. 시장 데이터를 깊이 있게 분석하여 실용적인 투자 리포트를 작성합니다.'
      )
    } catch (error) {
      console.error('Market Report Error:', error)
      return this.getFallbackReport()
    }
  }

  /**
   * Analyze portfolio (ADVANCED task - uses GPT-5)
   */
  async analyzePortfolio(portfolioData) {
    try {
      const prompt = `다음 포트폴리오를 전문적으로 분석하고 상세한 개선 제안을 해주세요:

${JSON.stringify(portfolioData, null, 2)}

다음 항목을 포함해주세요:
1. 자산 배분 분석 (Diversification)
2. 리스크 평가 (Risk Assessment)
3. 수익성 분석 (Performance Analysis)
4. 세부 개선 제안사항 (Actionable Recommendations)
5. 리밸런싱 전략
6. 목표 달성 가능성 평가

구체적이고 실행 가능한 조언을 제공하세요.`

      return await this.routeAIRequest(
        prompt,
        this.TASK_LEVEL.ADVANCED,
        '당신은 자산관리 전문가(CFP)입니다. 포트폴리오를 정밀하게 분석하고 최적화 전략을 제시합니다.'
      )
    } catch (error) {
      console.error('Portfolio Analysis Error:', error)
      return this.getFallbackPortfolioAnalysis()
    }
  }

  /**
   * Quick portfolio health check (BASIC task - uses Gemini)
   */
  async quickPortfolioCheck(portfolioData) {
    try {
      const prompt = `다음 포트폴리오의 간단한 건강도 체크를 해주세요 (5문장 이내):

${JSON.stringify(portfolioData, null, 2)}

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
   * Generate investment insights (ADVANCED task - uses GPT-5)
   */
  async generateInvestmentInsights(userQuestion, context = {}) {
    try {
      const prompt = `사용자 질문: ${userQuestion}

컨텍스트 정보:
${JSON.stringify(context, null, 2)}

전문가 관점에서 상세하고 실용적인 답변을 제공해주세요.`

      return await this.routeAIRequest(
        prompt,
        this.TASK_LEVEL.ADVANCED,
        '당신은 투자 전문가입니다. 사용자의 질문에 전문적이고 실용적인 답변을 제공합니다.'
      )
    } catch (error) {
      console.error('Investment Insights Error:', error)
      return '죄송합니다. 답변을 생성할 수 없습니다. API 키를 확인해주세요.'
    }
  }

  /**
   * OpenAI API Call (GPT-5)
   */
  async callOpenAI(prompt, systemPrompt = '당신은 전문 재무 상담사입니다.') {
    if (!API_CONFIG.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured')
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: API_CONFIG.OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${API_CONFIG.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    return response.data.choices[0].message.content
  }

  /**
   * Gemini API Call (2.5 Flash)
   */
  async callGemini(prompt, systemPrompt = '') {
    if (!API_CONFIG.GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured')
    }

    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${API_CONFIG.GEMINI_MODEL}:generateContent?key=${API_CONFIG.GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{ text: fullPrompt }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    return response.data.candidates[0].content.parts[0].text
  }

  /**
   * Check which AI providers are available
   */
  getAvailableProviders() {
    return {
      openai: !!API_CONFIG.OPENAI_API_KEY,
      gemini: !!API_CONFIG.GEMINI_API_KEY,
      strategy: API_CONFIG.GEMINI_API_KEY && API_CONFIG.OPENAI_API_KEY
        ? 'dual' // Both available - optimal
        : API_CONFIG.GEMINI_API_KEY
          ? 'gemini-only'
          : API_CONFIG.OPENAI_API_KEY
            ? 'openai-only'
            : 'none'
    }
  }

  /**
   * Fallback responses
   */
  getFallbackMarketSummary() {
    return `
시장 데이터 요약을 생성할 수 없습니다.

주요 지수들이 혼조세를 보이고 있으며, 기술주 중심의 상승세가 관찰됩니다.
분산 투자를 통한 리스크 관리가 권장됩니다.

*AI 분석을 사용하려면 .env 파일에 API 키를 설정하세요.*
    `
  }

  getFallbackReport() {
    return `
# 시장 분석 리포트

⚠️ AI API가 설정되지 않아 샘플 리포트를 표시합니다.

## 시장 개요
- 주요 지수들이 혼조세를 보이고 있습니다.
- 기술주 중심의 Nasdaq은 상승세를 유지하고 있습니다.

## 투자 전략
1. 분산 투자를 통한 리스크 관리
2. 장기 투자 관점 유지
3. 정기적인 포트폴리오 리밸런싱

## 주의사항
- 환율 변동성 모니터링 필요
- 글로벌 경제 지표 확인

---
**💡 AI 분석 활성화 방법:**
- Gemini 2.5 Flash (무료): 기본 요약 및 데이터 수집용
- GPT-5 (유료): 고급 투자 분석 및 전략 수립용

.env 파일에 API 키를 설정하세요.
    `
  }

  getFallbackPortfolioAnalysis() {
    return `
# 포트폴리오 분석

⚠️ AI API가 설정되지 않아 샘플 분석을 표시합니다.

## 자산 배분
- 현재 포트폴리오는 적절한 분산이 이루어져 있습니다.

## 리스크 평가
- 중위험 수준의 포트폴리오로 평가됩니다.

## 개선 제안
1. 채권 비중 확대 검토
2. 정기적인 리밸런싱 실시
3. 장기 투자 전략 유지

---
**💡 이중 AI 전략:**
- Gemini 2.5 Flash: 빠른 포트폴리오 체크
- GPT-5: 심층 포트폴리오 분석 및 최적화

.env 파일에 API 키를 설정하세요.
    `
  }
}

export default new AIService()
