/**
 * Netlify Function: KIS API 토큰 발급
 *
 * 브라우저에서 직접 KIS API를 호출하면 CORS 에러가 발생하므로
 * Netlify Functions를 프록시로 사용
 */

const axios = require('axios')

exports.handler = async (event, context) => {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }

  // Preflight 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  try {
    const { KIS_APP_KEY, KIS_APP_SECRET } = process.env

    if (!KIS_APP_KEY || !KIS_APP_SECRET) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'KIS API credentials not configured' })
      }
    }

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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        access_token: response.data.access_token,
        token_type: response.data.token_type,
        expires_in: response.data.expires_in
      })
    }
  } catch (error) {
    console.error('KIS Token Error:', error.response?.data || error.message)
    return {
      statusCode: error.response?.status || 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to get KIS token',
        message: error.response?.data?.msg1 || error.message
      })
    }
  }
}
