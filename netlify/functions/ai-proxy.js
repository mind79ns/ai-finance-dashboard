// OpenAI / Gemini 호출을 서버 측에서 통합 처리하는 Netlify Function (AI API 키 클라이언트 노출 차단 + Tier 라우팅)

const axios = require('axios')

// 모델 ID — 환경변수로 오버라이드 가능
const MODELS = {
  GPT_4O: process.env.OPENAI_MODEL || 'gpt-4o',
  GEMINI_PRO: process.env.GEMINI_PRO_MODEL || 'gemini-2.5-pro',
  GEMINI_FLASH: process.env.GEMINI_FLASH_MODEL || 'gemini-2.5-flash'
}

// taskLevel 기본 max_tokens — 호출자가 명시한 값이 우선
const DEFAULT_MAX_TOKENS = {
  basic: 800,
  standard: 2000,
  advanced: 2000, // 호환용 별칭 (이전 ADVANCED 코드 경로)
  premium: 3000
}

// taskLevel + forceProvider → 실행 모델 결정
function pickModel(taskLevel, forceProvider) {
  if (forceProvider === 'gpt') return { provider: 'openai', model: MODELS.GPT_4O }
  if (forceProvider === 'gemini') return { provider: 'gemini', model: MODELS.GEMINI_PRO }

  // auto
  if (taskLevel === 'basic') return { provider: 'gemini', model: MODELS.GEMINI_FLASH }
  if (taskLevel === 'premium') return { provider: 'openai', model: MODELS.GPT_4O }
  // standard / advanced
  return { provider: 'gemini', model: MODELS.GEMINI_PRO }
}

async function callOpenAI({ model, systemPrompt, prompt, maxTokens, temperature }) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured')

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model,
      messages: [
        { role: 'system', content: systemPrompt || '당신은 전문 재무 상담사입니다.' },
        { role: 'user', content: prompt }
      ],
      temperature: temperature ?? 0.7,
      max_tokens: maxTokens
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 25000
    }
  )

  const text = response.data?.choices?.[0]?.message?.content || ''
  const tokensUsed = response.data?.usage?.total_tokens || 0
  return { text, provider: 'openai', model, tokensUsed }
}

async function callGemini({ model, systemPrompt, prompt, maxTokens, temperature }) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  // Gemini 는 system role 분리 미지원 — systemPrompt 를 user 콘텐츠 앞쪽에 합친다.
  const merged = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      contents: [{ parts: [{ text: merged }] }],
      generationConfig: {
        temperature: temperature ?? 0.7,
        maxOutputTokens: maxTokens
      }
    },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 25000
    }
  )

  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const tokensUsed = response.data?.usageMetadata?.totalTokenCount || 0
  return { text, provider: 'gemini', model, tokensUsed }
}

// 단일 시도 — 캐치되지 않은 에러는 그대로 throw
async function execute(provider, model, params) {
  if (provider === 'openai') return await callOpenAI({ model, ...params })
  return await callGemini({ model, ...params })
}

// fallback 정책 — Gemini 한도 초과/장애 시 Flash → GPT-4o 순으로 다운/업그레이드
async function executeWithFallback({ provider, model, taskLevel, params }) {
  const attempts = [{ provider, model }]

  if (provider === 'gemini' && model !== MODELS.GEMINI_FLASH) {
    attempts.push({ provider: 'gemini', model: MODELS.GEMINI_FLASH })
  }
  // 최후 fallback — OpenAI 키가 있으면 GPT-4o 로 승급
  if (process.env.OPENAI_API_KEY && provider !== 'openai') {
    attempts.push({ provider: 'openai', model: MODELS.GPT_4O })
  }
  // GPT-4o 가 실패하면 Gemini Pro 로 다운
  if (process.env.GEMINI_API_KEY && provider === 'openai') {
    attempts.push({ provider: 'gemini', model: MODELS.GEMINI_PRO })
  }

  let lastError = null
  const tried = []
  for (const attempt of attempts) {
    try {
      const result = await execute(attempt.provider, attempt.model, params)
      if (tried.length > 0) {
        // 최초 시도가 실패하고 fallback 으로 성공한 경우 알림 메타 첨부
        result.fallback = { tried, finalProvider: attempt.provider, finalModel: attempt.model }
      }
      return result
    } catch (error) {
      lastError = error
      tried.push({
        provider: attempt.provider,
        model: attempt.model,
        status: error.response?.status,
        message: error.response?.data?.error?.message || error.message
      })
      console.warn(`⚠️ AI provider failed (${attempt.provider}/${attempt.model}):`, tried[tried.length - 1].message)
    }
  }

  const err = new Error('All AI providers failed')
  err.attempts = tried
  err.cause = lastError
  throw err
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'POST only' })
    }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const {
      taskLevel = 'standard',
      forceProvider = 'auto',
      systemPrompt = '',
      prompt = '',
      maxTokens,
      temperature
    } = body

    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'prompt is required' })
      }
    }

    // 키 없는 provider 가 강제 지정되면 즉시 에러
    if (forceProvider === 'gpt' && !process.env.OPENAI_API_KEY) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ error: 'OPENAI_API_KEY not configured on server' })
      }
    }
    if (forceProvider === 'gemini' && !process.env.GEMINI_API_KEY) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ error: 'GEMINI_API_KEY not configured on server' })
      }
    }
    if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ error: 'No AI provider configured on server' })
      }
    }

    const { provider, model } = pickModel(taskLevel, forceProvider)
    const params = {
      systemPrompt,
      prompt,
      maxTokens: maxTokens || DEFAULT_MAX_TOKENS[taskLevel] || DEFAULT_MAX_TOKENS.standard,
      temperature
    }

    const result = await executeWithFallback({ provider, model, taskLevel, params })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    }
  } catch (error) {
    console.error('AI proxy error:', error.message, error.attempts || '')
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'AI request failed',
        message: error.message,
        attempts: error.attempts
      })
    }
  }
}
