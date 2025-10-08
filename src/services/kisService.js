/**
 * 한국투자증권 OpenAPI Service
 *
 * 한국 주식/ETF 실시간 시세 조회
 * API 문서: https://apiportal.koreainvestment.com/
 */

import axios from 'axios'
import { API_CONFIG } from '../config/constants'

class KISService {
  constructor() {
    this.baseURL = 'https://openapi.koreainvestment.com:9443'
    this.accessToken = null
    this.tokenExpiry = null
  }

  /**
   * OAuth 토큰 발급
   */
  async getAccessToken() {
    // Check if token is still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken
    }

    try {
      const response = await axios.post(`${this.baseURL}/oauth2/tokenP`, {
        grant_type: 'client_credentials',
        appkey: API_CONFIG.KIS_APP_KEY,
        appsecret: API_CONFIG.KIS_APP_SECRET
      })

      this.accessToken = response.data.access_token
      // Token expires in 24 hours, set expiry to 23 hours from now
      this.tokenExpiry = new Date(Date.now() + 23 * 60 * 60 * 1000)

      console.log('✅ KIS Access Token obtained')
      return this.accessToken
    } catch (error) {
      console.error('❌ Failed to get KIS access token:', error)
      throw error
    }
  }

  /**
   * 주식 현재가 조회 (국내주식시세)
   * @param {string} stockCode - 종목코드 (6자리, 예: "005930")
   */
  async getStockPrice(stockCode) {
    try {
      const token = await this.getAccessToken()

      const response = await axios.get(`${this.baseURL}/uapi/domestic-stock/v1/quotations/inquire-price`, {
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`,
          'appkey': API_CONFIG.KIS_APP_KEY,
          'appsecret': API_CONFIG.KIS_APP_SECRET,
          'tr_id': 'FHKST01010100' // 실시간 시세 조회 TR
        },
        params: {
          FID_COND_MRKT_DIV_CODE: 'J', // 주식
          FID_INPUT_ISCD: stockCode.padStart(6, '0') // 6자리 종목코드
        }
      })

      if (response.data.rt_cd === '0') {
        const output = response.data.output
        return {
          symbol: stockCode,
          price: parseFloat(output.stck_prpr), // 현재가
          change: parseFloat(output.prdy_vrss), // 전일대비
          changePercent: parseFloat(output.prdy_ctrt), // 등락률
          volume: parseInt(output.acml_vol), // 누적거래량
          high: parseFloat(output.stck_hgpr), // 최고가
          low: parseFloat(output.stck_lwpr), // 최저가
          open: parseFloat(output.stck_oprc) // 시가
        }
      } else {
        console.warn(`⚠️ KIS API error for ${stockCode}:`, response.data.msg1)
        return null
      }
    } catch (error) {
      console.error(`❌ KIS API error for ${stockCode}:`, error.message)
      return null
    }
  }

  /**
   * ETF 현재가 조회
   * @param {string} etfCode - ETF 종목코드 (6자리)
   */
  async getETFPrice(etfCode) {
    try {
      const token = await this.getAccessToken()

      const response = await axios.get(`${this.baseURL}/uapi/domestic-stock/v1/quotations/inquire-price`, {
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${token}`,
          'appkey': API_CONFIG.KIS_APP_KEY,
          'appsecret': API_CONFIG.KIS_APP_SECRET,
          'tr_id': 'FHKST01010100' // ETF도 동일한 TR 사용
        },
        params: {
          FID_COND_MRKT_DIV_CODE: 'J',
          FID_INPUT_ISCD: etfCode.padStart(6, '0')
        }
      })

      if (response.data.rt_cd === '0') {
        const output = response.data.output
        return {
          symbol: etfCode,
          price: parseFloat(output.stck_prpr),
          change: parseFloat(output.prdy_vrss),
          changePercent: parseFloat(output.prdy_ctrt),
          volume: parseInt(output.acml_vol),
          high: parseFloat(output.stck_hgpr),
          low: parseFloat(output.stck_lwpr),
          open: parseFloat(output.stck_oprc)
        }
      } else {
        console.warn(`⚠️ KIS API error for ETF ${etfCode}:`, response.data.msg1)
        return null
      }
    } catch (error) {
      console.error(`❌ KIS API error for ETF ${etfCode}:`, error.message)
      return null
    }
  }

  /**
   * 여러 종목 일괄 조회
   * @param {Array<string>} symbols - 종목코드 배열
   */
  async getMultiplePrices(symbols) {
    const prices = {}

    // API 호출 제한을 고려하여 순차 처리 (초당 20건 제한)
    for (const symbol of symbols) {
      const price = await this.getStockPrice(symbol)
      if (price) {
        prices[symbol] = price
      }
      // Rate limit: 50ms delay between calls (20 calls per second)
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    return prices
  }

  /**
   * 장 운영 시간 체크
   */
  isMarketOpen() {
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDay()

    // 주말 제외
    if (day === 0 || day === 6) return false

    // 평일 09:00 ~ 15:30
    if (hour >= 9 && hour < 15) return true
    if (hour === 15 && now.getMinutes() <= 30) return true

    return false
  }
}

export default new KISService()
