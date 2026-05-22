// Yahoo Finance chart 엔드포인트 프록시 — 벤치마크(SPY/^KS11 등) 시계열 종가를 [{date, close}] 형태로 반환

const axios = require('axios')

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    const { symbol, range = '1y', interval = '1mo' } = event.queryStringParameters || {}

    if (!symbol) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'symbol parameter is required' })
      }
    }

    // 허용 범위 검증 — 무한 호출 방지
    const allowedRanges = ['1mo', '3mo', '6mo', '1y', '2y', '5y', 'max']
    const allowedIntervals = ['1d', '1wk', '1mo']
    if (!allowedRanges.includes(range) || !allowedIntervals.includes(interval)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'invalid range or interval' })
      }
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json'
      },
      timeout: 8000
    })

    const result = response.data?.chart?.result?.[0]
    if (!result) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: 'Yahoo returned empty chart', raw: response.data?.chart?.error })
      }
    }

    const timestamps = result.timestamp || []
    const closes = result.indicators?.quote?.[0]?.close || []
    const meta = result.meta || {}

    // 타임스탬프 + 종가 매칭, null 제외
    const series = timestamps
      .map((ts, idx) => {
        const close = closes[idx]
        if (ts == null || close == null) return null
        const d = new Date(ts * 1000)
        const year = d.getUTCFullYear()
        const month = String(d.getUTCMonth() + 1).padStart(2, '0')
        const day = String(d.getUTCDate()).padStart(2, '0')
        return { date: `${year}-${month}-${day}`, close: Number(close) }
      })
      .filter(Boolean)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        symbol: meta.symbol || symbol,
        currency: meta.currency,
        instrument: meta.instrumentType,
        range,
        interval,
        series
      })
    }
  } catch (error) {
    console.error('yahoo-historical error:', error.response?.data || error.message)
    return {
      statusCode: error.response?.status || 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch historical data',
        message: error.message
      })
    }
  }
}
