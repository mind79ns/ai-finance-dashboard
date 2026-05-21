// 한국투자증권 KIS OpenAPI를 통해 여러 국내 종목 시세를 한 번의 함수 호출에서 병렬 조회하는 Netlify Function

const axios = require('axios')

// Lambda 메모리 토큰 캐시 (24h)
let cachedToken = null
let tokenExpiry = null

async function getAccessToken() {
  const now = Date.now()
  if (cachedToken && tokenExpiry && now < tokenExpiry) {
    return { token: cachedToken, reused: true }
  }

  const { KIS_APP_KEY, KIS_APP_SECRET } = process.env

  const response = await axios.post(
    'https://openapi.koreainvestment.com:9443/oauth2/tokenP',
    {
      grant_type: 'client_credentials',
      appkey: KIS_APP_KEY,
      appsecret: KIS_APP_SECRET
    },
    { headers: { 'Content-Type': 'application/json' } }
  )

  cachedToken = response.data.access_token
  tokenExpiry = now + 23 * 60 * 60 * 1000
  return { token: cachedToken, reused: false }
}

async function fetchSinglePrice({ token, stockCode, appKey, appSecret }) {
  try {
    const padded = stockCode.padStart(6, '0')
    const response = await axios.get(
      'https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/inquire-price',
      {
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
          appkey: appKey,
          appsecret: appSecret,
          tr_id: 'FHKST01010100'
        },
        params: {
          FID_COND_MRKT_DIV_CODE: 'J',
          FID_INPUT_ISCD: padded
        },
        timeout: 5000
      }
    )

    if (response.data?.rt_cd !== '0') {
      return { symbol: stockCode, ok: false, message: response.data?.msg1 || 'KIS API error' }
    }

    const output = response.data.output
    return {
      symbol: stockCode,
      ok: true,
      data: {
        symbol: stockCode,
        price: parseFloat(output.stck_prpr),
        change: parseFloat(output.prdy_vrss),
        changePercent: parseFloat(output.prdy_ctrt),
        volume: parseInt(output.acml_vol, 10),
        high: parseFloat(output.stck_hgpr),
        low: parseFloat(output.stck_lwpr),
        open: parseFloat(output.stck_oprc),
        previousClose: parseFloat(output.stck_sdpr)
      }
    }
  } catch (error) {
    return { symbol: stockCode, ok: false, message: error.response?.data?.msg1 || error.message }
  }
}

// 동시성 제한 병렬 실행 — KIS rate limit 20 calls/sec 대비 안전 마진 4배
async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length)
  let cursor = 0

  async function next() {
    while (true) {
      const idx = cursor++
      if (idx >= items.length) return
      results[idx] = await worker(items[idx], idx)
    }
  }

  const runners = Array.from({ length: Math.min(limit, items.length) }, () => next())
  await Promise.all(runners)
  return results
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const { codes } = event.queryStringParameters || {}
    if (!codes) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'codes parameter is required (comma-separated stock codes)' })
      }
    }

    const { KIS_APP_KEY, KIS_APP_SECRET } = process.env
    if (!KIS_APP_KEY || !KIS_APP_SECRET) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'KIS API credentials not configured' })
      }
    }

    const symbols = codes
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)

    if (symbols.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'no valid stock codes provided' })
      }
    }

    if (symbols.length > 50) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'too many codes (max 50 per call)' })
      }
    }

    const { token, reused } = await getAccessToken()

    const settled = await runWithConcurrency(symbols, 5, (stockCode) =>
      fetchSinglePrice({ token, stockCode, appKey: KIS_APP_KEY, appSecret: KIS_APP_SECRET })
    )

    const results = {}
    const failures = []
    for (const item of settled) {
      if (item.ok) {
        results[item.symbol] = item.data
      } else {
        results[item.symbol] = null
        failures.push({ symbol: item.symbol, message: item.message })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        results,
        failures,
        tokenReused: reused,
        fetchedAt: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('KIS batch error:', error.response?.data || error.message)
    return {
      statusCode: error.response?.status || 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to batch fetch KIS prices',
        message: error.response?.data?.msg1 || error.message
      })
    }
  }
}
