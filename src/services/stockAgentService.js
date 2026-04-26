/**
 * Stock Analysis Agent Service
 * 
 * Orchestrator that coordinates 6 specialized sub-agents for comprehensive
 * stock analysis following Anthropic's sub-agent architecture pattern.
 * 
 * Pipeline: 기업개요 → 재무분석 → 산업분석 → 모멘텀분석 → 리스크요인 → 종합의견
 */

import aiService from './aiService'

// Import agent system prompts as raw text
import orchestratorPrompt from '../agents/stock-analysis/orchestrator.md?raw'
import companyOverviewPrompt from '../agents/stock-analysis/agent_company_overview.md?raw'
import financialAnalysisPrompt from '../agents/stock-analysis/agent_financial_analysis.md?raw'
import industryAnalysisPrompt from '../agents/stock-analysis/agent_industry_analysis.md?raw'
import momentumAnalysisPrompt from '../agents/stock-analysis/agent_momentum_analysis.md?raw'
import riskAnalysisPrompt from '../agents/stock-analysis/agent_risk_analysis.md?raw'
import recommendationPrompt from '../agents/stock-analysis/agent_recommendation.md?raw'

/**
 * Extract the system prompt content from an MD file (strip YAML frontmatter)
 */
const extractSystemPrompt = (mdContent) => {
  const stripped = mdContent.replace(/^---[\s\S]*?---\s*/m, '')
  return stripped.trim()
}

/**
 * Build data context string from collected stock data
 */
const buildDataContext = ({ symbol, name, quote, profile, metrics, news, portfolioContext }) => {
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

  let ctx = `[${today} 기준 분석 대상]\n종목: ${name} (${symbol})\n\n`

  if (quote) {
    ctx += `[가격 데이터]\n`
    ctx += `현재가: $${quote.price?.toLocaleString()} | 전일대비: ${quote.change >= 0 ? '+' : ''}${quote.change?.toFixed(2)} (${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent?.toFixed(2)}%)\n`
    ctx += `당일 고가: $${quote.high} | 당일 저가: $${quote.low}\n\n`
  }

  if (profile) {
    ctx += `[기업 프로필]\n`
    ctx += `기업명: ${profile.name} | 산업: ${profile.industry} | 국가: ${profile.country}\n`
    ctx += `거래소: ${profile.exchange} | 시가총액: $${(profile.marketCap || 0).toLocaleString()}M | IPO: ${profile.ipo || 'N/A'}\n\n`
  }

  if (metrics) {
    ctx += `[재무 지표 - Finnhub 실시간]\n`
    ctx += `52주 고가: $${metrics['52WeekHigh']} (${metrics['52WeekHighDate'] || 'N/A'}) | 52주 저가: $${metrics['52WeekLow']} (${metrics['52WeekLowDate'] || 'N/A'})\n`
    ctx += `PER: ${metrics.peRatio?.toFixed(2) || 'N/A'} | PBR: ${metrics.pbRatio?.toFixed(2) || 'N/A'} | PSR: ${metrics.psRatio?.toFixed(2) || 'N/A'}\n`
    ctx += `ROE: ${metrics.roe?.toFixed(2) || 'N/A'}% | ROA: ${metrics.roa?.toFixed(2) || 'N/A'}%\n`
    ctx += `배당수익률: ${metrics.dividendYield?.toFixed(2) || 'N/A'}% | Beta: ${metrics.beta?.toFixed(2) || 'N/A'}\n`
    ctx += `EPS 성장률: ${metrics.epsGrowth?.toFixed(2) || 'N/A'}% | 매출 성장률: ${metrics.revenueGrowth?.toFixed(2) || 'N/A'}%\n`
    ctx += `유동비율: ${metrics.currentRatio?.toFixed(2) || 'N/A'} | 부채비율: ${metrics.debtToEquity?.toFixed(2) || 'N/A'}\n`
    ctx += `10일 평균 거래량: ${metrics.avgVolume10Day?.toFixed(2) || 'N/A'}M\n\n`
  }

  if (news && news.length > 0) {
    ctx += `[최근 뉴스 (${news.length}건)]\n`
    ctx += news.map((n, i) => `${i + 1}. [${n.datetime}] ${n.headline} (${n.source})`).join('\n')
    ctx += '\n\n'
  }

  if (portfolioContext) {
    ctx += `[투자자 보유 정보]\n${portfolioContext}\n\n`
  }

  return ctx
}

/**
 * Strip wrapping code blocks from AI response (e.g. ```markdown ... ```)
 * Some AI models wrap their markdown output in code fences which prevents proper rendering.
 * Handles multiple patterns: ```markdown, ```md, ```, with/without CRLF, nested blocks.
 */
const cleanAgentResponse = (response) => {
  if (!response || typeof response !== 'string') return response || ''
  let cleaned = response.trim()

  // Normalize line endings
  cleaned = cleaned.replace(/\r\n/g, '\n')

  // Pattern 1: Full wrap — ```markdown\n...\n```
  const fullWrapPattern = /^```(?:markdown|md|text)?\s*\n([\s\S]*?)\n```\s*$/i
  let match = cleaned.match(fullWrapPattern)
  if (match) {
    cleaned = match[1].trim()
  }

  // Pattern 2: Leading code fence only (no closing) — sometimes AI only opens but doesn't close
  if (/^```(?:markdown|md|text)?\s*\n/i.test(cleaned) && !cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/^```(?:markdown|md|text)?\s*\n/i, '').trim()
  }

  // Pattern 3: Multiple code blocks wrapping entire content (recursive strip)
  let prevLength = 0
  while (prevLength !== cleaned.length) {
    prevLength = cleaned.length
    const m = cleaned.match(/^```(?:markdown|md|text)?\s*\n([\s\S]*?)\n```\s*$/i)
    if (m) {
      cleaned = m[1].trim()
    }
  }

  return cleaned
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Run a single sub-agent with Retry logic for 429 Rate Limits
 */
const runSubAgent = async (agentPromptMd, userPrompt, aiProvider, maxRetries = 2) => {
  const systemPrompt = extractSystemPrompt(agentPromptMd)
  
  let lastError = null
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      if (attempt > 1) {
        console.warn(`⏳ [Retry ${attempt - 1}/${maxRetries}] Retrying AI Agent after rate limit...`)
        await delay(5000) // 5초 대기 후 재시도
      }

      const response = await aiService.routeAIRequest(
        userPrompt,
        aiService.TASK_LEVEL.ADVANCED,
        systemPrompt,
        aiProvider
      )
      return cleanAgentResponse(response)
      
    } catch (error) {
      lastError = error
      const status = error?.response?.status || error?.status || 0
      const isRateLimit = status === 429 || error.message?.includes('429') || error.message?.includes('Too Many Requests') || error.message?.includes('rate limit')
      const isServerOverload = status === 503 || error.message?.includes('503') || error.message?.includes('overloaded')

      if (!isRateLimit && !isServerOverload) {
        throw error // 429, 503이 아닌 타 에러는 즉시 예외 처리
      }
      
      if (attempt > maxRetries) {
        throw error // 최대 재시도 횟수 초과 시 예외 처리
      }
    }
  }
  throw lastError
}

/**
 * Main orchestrator pipeline
 * @param {Object} params - { symbol, name, quote, profile, metrics, news, portfolioContext }
 * @param {string} aiProvider - 'auto', 'gpt', 'gemini'
 * @param {Function} onProgress - callback(phase, agentName, status)
 * @returns {string} Final combined markdown report
 */
const runAgentPipeline = async (params, aiProvider = 'auto', onProgress = () => {}) => {
  const dataContext = buildDataContext(params)
  const sections = []

  try {
    // ═══════════════════════════════════════════
    // Phase 1: 기초 분석 (안전성을 위해 직렬 순차 실행)
    // 멀티 에이전트 다중 접속 시 429 Rate Limit 방지
    // ═══════════════════════════════════════════
    onProgress(1, 'Phase 1', '기업개요 분석 실행 중...')
    let companyAnalysis, financialAnalysis, industryAnalysis
    
    try {
      companyAnalysis = await runSubAgent(
        companyOverviewPrompt,
        `아래 데이터를 기반으로 기업개요를 분석해주세요.\n\n${dataContext}`,
        aiProvider
      )
    } catch (e) {
      companyAnalysis = '⚠️ 기업개요 분석 실패: ' + e.message
    }

    onProgress(1, 'Phase 1', '재무분석 실행 중...')
    await delay(1000) // 에이전트 간 최소 1초 간격 보장
    try {
      financialAnalysis = await runSubAgent(
        financialAnalysisPrompt,
        `아래 데이터를 기반으로 재무 심층 분석을 수행해주세요.\n\n${dataContext}`,
        aiProvider
      )
    } catch (e) {
      financialAnalysis = '⚠️ 재무분석 실패: ' + e.message
    }

    onProgress(1, 'Phase 1', '산업분석 실행 중...')
    await delay(1000)
    try {
      industryAnalysis = await runSubAgent(
        industryAnalysisPrompt,
        `아래 데이터를 기반으로 산업 분석을 수행해주세요.\n\n${dataContext}`,
        aiProvider
      )
    } catch (e) {
      industryAnalysis = '⚠️ 산업분석 실패: ' + e.message
    }

    sections.push(companyAnalysis)
    sections.push(financialAnalysis)
    sections.push(industryAnalysis)

    // ═══════════════════════════════════════════
    // Phase 2: 모멘텀 분석 (Phase 1 결과 참조)
    // ═══════════════════════════════════════════
    onProgress(2, 'Phase 2', '모멘텀분석 실행 중...')
    await delay(1000)
    const phase1Summary = `[이전 분석 결과 요약]\n\n--- 기업개요 ---\n${companyAnalysis}\n\n--- 재무분석 ---\n${financialAnalysis}\n\n--- 산업분석 ---\n${industryAnalysis}`

    const momentumAnalysis = await runSubAgent(
      momentumAnalysisPrompt,
      `아래 데이터와 이전 분석 결과를 참조하여 모멘텀 분석을 수행해주세요.\n\n${dataContext}\n\n${phase1Summary}`,
      aiProvider
    )
    sections.push(momentumAnalysis)

    // ═══════════════════════════════════════════
    // Phase 3: 리스크 요인 (Phase 1+2 결과 참조)
    // ═══════════════════════════════════════════
    onProgress(3, 'Phase 3', '리스크 요인 분석 실행 중...')
    await delay(1000)
    const phase2Summary = `${phase1Summary}\n\n--- 모멘텀분석 ---\n${momentumAnalysis}`

    const riskAnalysis = await runSubAgent(
      riskAnalysisPrompt,
      `아래 데이터와 이전 분석 결과를 참조하여 종합 리스크 평가를 수행해주세요.\n\n${dataContext}\n\n${phase2Summary}`,
      aiProvider
    )
    sections.push(riskAnalysis)

    // ═══════════════════════════════════════════
    // Phase 4: 종합의견 + 추천 (전 단계 통합)
    // ═══════════════════════════════════════════
    onProgress(4, 'Phase 4', '종합의견 및 추천 픽 도출 중...')
    await delay(1000)
    const allPriorAnalysis = `${phase2Summary}\n\n--- 리스크요인 ---\n${riskAnalysis}`

    const recommendation = await runSubAgent(
      recommendationPrompt,
      `아래 데이터와 모든 이전 분석 결과를 종합하여 최종 투자 의견, 추천 픽, 매매 전략을 도출해주세요.\n\n${dataContext}\n\n${allPriorAnalysis}`,
      aiProvider
    )
    sections.push(recommendation)

    onProgress(4, 'Complete', '분석 완료!')

  } catch (error) {
    console.error('Agent Pipeline Error:', error)
    sections.push(`\n\n⚠️ 에이전트 파이프라인 실행 중 오류가 발생했습니다: ${error.message}`)
  }

  // Combine all sections with dividers
  return sections.join('\n\n---\n\n')
}

const stockAgentService = {
  runAgentPipeline,
  extractSystemPrompt,
  buildDataContext
}

export default stockAgentService
