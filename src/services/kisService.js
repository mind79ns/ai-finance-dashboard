/**
 * Korean Stock Price Service (via Netlify Functions)
 *
 * 한국투자증권 OpenAPI를 Netlify Functions를 통해 호출
 * CORS 문제를 서버리스 프록시로 해결
 */

import axios from 'axios'

class KISService {
  constructor() {
    // Netlify Functions endpoint (serverless proxy)
    this.baseURL = '/.netlify/functions'
    this.cache = {}
    this.cacheExpiry = {}
  }

  /**
   * 캐시 확인
   */
  getCached(symbol) {
    if (this.cache[symbol] && this.cacheExpiry[symbol] > Date.now()) {
      return this.cache[symbol]
    }
    return null
  }

  /**
   * 캐시 저장 (1분)
   */
  setCache(symbol, data) {
    this.cache[symbol] = data
    this.cacheExpiry[symbol] = Date.now() + 60000 // 1 minute
  }

  /**
   * 주식 현재가 조회 (via Netlify Functions)
   * @param {string} stockCode - 종목코드 (6자리, 예: "005930")
   */
  async getStockPrice(stockCode) {
    // Check cache
    const cached = this.getCached(stockCode)
    if (cached) return cached

    try {
      // Call Netlify Function (serverless proxy to KIS API)
      const response = await axios.get(`${this.baseURL}/kis-price`, {
        params: {
          stockCode: stockCode.padStart(6, '0')
        }
      })

      const priceData = response.data

      this.setCache(stockCode, priceData)
      console.log(`✅ KIS (via Netlify): ${stockCode} = ₩${priceData.price}`)
      return priceData
    } catch (error) {
      console.error(`❌ KIS API error for ${stockCode}:`, error.response?.data || error.message)
      return null
    }
  }

  /**
   * ETF 현재가 조회 (via Netlify Functions)
   * @param {string} etfCode - ETF 종목코드 (6자리)
   */
  async getETFPrice(etfCode) {
    // ETF도 주식과 동일한 KIS API 사용
    return await this.getStockPrice(etfCode)
  }

  /**
   * 여러 종목 일괄 조회
   * @param {Array<string>} symbols - 종목코드 배열
   */
  async getMultiplePrices(symbols) {
    const prices = {}

    // KIS API는 rate limit이 있으므로 순차 처리 (초당 20건)
    for (const symbol of symbols) {
      const price = await this.getStockPrice(symbol)
      if (price) {
        prices[symbol] = price
      }
      // 50ms delay to respect rate limit (20 calls/sec)
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

    // 평일 09:00 ~ 15:30 (한국 시간 기준)
    if (hour >= 9 && hour < 15) return true
    if (hour === 15 && now.getMinutes() <= 30) return true

    return false
  }
}

export default new KISService()
