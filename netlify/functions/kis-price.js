/**
 * Netlify Function: KIS API 주가 조회
 *
 * 한국투자증권 API를 통해 국내 주식/ETF 실시간 시세 조회
 */

const axios = require('axios')

// 토큰 캐시 (24시간 유효)
let cachedToken = null
let tokenExpiry = null

// 토큰 발급 함수
async function getAccessToken() {
  const now = Date.now()

  // 캐시된 토큰이 유효하면 재사용
  if (cachedToken && tokenExpiry && now < tokenExpiry) {
    return cachedToken
  }

  const { KIS_APP_KEY, KIS_APP_SECRET } = process.env

  try {
    const response = await axios.post(
      'https://openapi.koreainvestment.com:9443/oauth2/tokenP',
      {
        grant_type: 'client_credentials',
        appkey: KIS_APP_KEY,
        appsecret: KIS_APP_SECRET
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    cachedToken = response.data.access_token
    // 23시간 후 만료 (24시간 - 1시간 여유)
    tokenExpiry = now + 23 * 60 * 60 * 1000

    console.log('✅ KIS Token obtained')
    return cachedToken
  } catch (error) {
    console.error('❌ KIS Token Error:', error.response?.data || error.message)
    throw error
  }
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  try {
    const { stockCode } = event.queryStringParameters || {}

    if (!stockCode) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'stockCode parameter is required' })
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

    // 토큰 발급
    const token = await getAccessToken()

    // 주가 조회
    const response = await axios.get(
      'https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/inquire-price',
      {
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`,
          'appkey': KIS_APP_KEY,
          'appsecret': KIS_APP_SECRET,
          'tr_id': 'FHKST01010100'
        },
        params: {
          FID_COND_MRKT_DIV_CODE: 'J',
          FID_INPUT_ISCD: stockCode.padStart(6, '0')
        }
      }
    )

    if (response.data.rt_cd === '0') {
      const output = response.data.output

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          symbol: stockCode,
          price: parseFloat(output.stck_prpr),
          change: parseFloat(output.prdy_vrss),
          changePercent: parseFloat(output.prdy_ctrt),
          volume: parseInt(output.acml_vol),
          high: parseFloat(output.stck_hgpr),
          low: parseFloat(output.stck_lwpr),
          open: parseFloat(output.stck_oprc),
          previousClose: parseFloat(output.stck_sdpr)
        })
      }
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'KIS API Error',
          message: response.data.msg1
        })
      }
    }
  } catch (error) {
    console.error('KIS Price Error:', error.response?.data || error.message)
    return {
      statusCode: error.response?.status || 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to get stock price',
        message: error.response?.data?.msg1 || error.message
      })
    }
  }
}
