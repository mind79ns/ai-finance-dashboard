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
   * 여러 종목 일괄 조회 — Netlify `kis-batch` 함수로 단일 HTTP 호출 + 서버 측 병렬 처리
   * @param {Array<string>} symbols - 종목코드 배열
   */
  async getMultiplePrices(symbols) {
    if (!symbols || symbols.length === 0) return {}

    const prices = {}
    const missing = []

    // 캐시 우선 조회 — 외부 호출 대상만 추려낸다
    for (const symbol of symbols) {
      const cached = this.getCached(symbol)
      if (cached) {
        prices[symbol] = cached
      } else {
        missing.push(symbol)
      }
    }

    if (missing.length === 0) return prices

    try {
      const padded = missing.map(s => String(s).padStart(6, '0'))
      const response = await axios.get(`${this.baseURL}/kis-batch`, {
        params: { codes: padded.join(',') },
        timeout: 15000
      })

      const results = response.data?.results || {}

      // 응답을 원래 심볼 키로 매핑 (호출 측은 padding 안 한 심볼을 들고 있을 수 있음)
      missing.forEach((symbol, idx) => {
        const paddedSymbol = padded[idx]
        const data = results[paddedSymbol] ?? results[symbol]
        if (data) {
          prices[symbol] = data
          this.setCache(symbol, data)
        }
      })

      const failureCount = response.data?.failures?.length || 0
      console.log(`✅ KIS batch: ${missing.length - failureCount}/${missing.length} prices fetched (token ${response.data?.tokenReused ? 'reused' : 'new'})`)
    } catch (error) {
      console.error('❌ KIS batch error:', error.response?.data || error.message)
      // 배치 실패 시 종목별 폴백 — 단일 엔드포인트로 순차 호출
      for (const symbol of missing) {
        const price = await this.getStockPrice(symbol)
        if (price) prices[symbol] = price
        await new Promise(resolve => setTimeout(resolve, 50))
      }
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
