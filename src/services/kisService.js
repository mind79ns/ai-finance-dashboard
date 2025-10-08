/**
 * Korean Stock Price Service (Yahoo Finance Alternative)
 *
 * 한국투자증권 OpenAPI는 CORS 제한으로 브라우저에서 직접 호출 불가
 * 대신 Yahoo Finance API를 사용하여 한국 주식/ETF 실시간 시세 조회
 */

import axios from 'axios'

class KISService {
  constructor() {
    // Yahoo Finance API - No CORS restrictions, free to use
    this.baseURL = 'https://query1.finance.yahoo.com/v8/finance/chart'
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
   * 주식 현재가 조회 (Yahoo Finance)
   * @param {string} stockCode - 종목코드 (6자리, 예: "005930")
   */
  async getStockPrice(stockCode) {
    // Check cache
    const cached = this.getCached(stockCode)
    if (cached) return cached

    try {
      // Convert Korean stock code to Yahoo Finance format
      // 005930 -> 005930.KS (KOSPI) or 005930.KQ (KOSDAQ)
      const yahooSymbol = `${stockCode.padStart(6, '0')}.KS`

      const response = await axios.get(`${this.baseURL}/${yahooSymbol}`, {
        params: {
          interval: '1d',
          range: '1d'
        }
      })

      const result = response.data.chart.result[0]
      const quote = result.meta
      const regularMarketPrice = quote.regularMarketPrice

      if (!regularMarketPrice) {
        // Try KOSDAQ if KOSPI fails
        const kosdaqSymbol = `${stockCode.padStart(6, '0')}.KQ`
        const kosdaqResponse = await axios.get(`${this.baseURL}/${kosdaqSymbol}`, {
          params: {
            interval: '1d',
            range: '1d'
          }
        })

        const kosdaqResult = kosdaqResponse.data.chart.result[0]
        const kosdaqQuote = kosdaqResult.meta

        const priceData = {
          symbol: stockCode,
          price: kosdaqQuote.regularMarketPrice,
          change: kosdaqQuote.regularMarketPrice - kosdaqQuote.previousClose,
          changePercent: ((kosdaqQuote.regularMarketPrice - kosdaqQuote.previousClose) / kosdaqQuote.previousClose) * 100,
          high: kosdaqQuote.regularMarketDayHigh || kosdaqQuote.regularMarketPrice,
          low: kosdaqQuote.regularMarketDayLow || kosdaqQuote.regularMarketPrice,
          open: kosdaqQuote.regularMarketOpen || kosdaqQuote.regularMarketPrice,
          previousClose: kosdaqQuote.previousClose
        }

        this.setCache(stockCode, priceData)
        return priceData
      }

      const priceData = {
        symbol: stockCode,
        price: regularMarketPrice,
        change: regularMarketPrice - quote.previousClose,
        changePercent: ((regularMarketPrice - quote.previousClose) / quote.previousClose) * 100,
        high: quote.regularMarketDayHigh || regularMarketPrice,
        low: quote.regularMarketDayLow || regularMarketPrice,
        open: quote.regularMarketOpen || regularMarketPrice,
        previousClose: quote.previousClose
      }

      this.setCache(stockCode, priceData)
      return priceData
    } catch (error) {
      console.error(`❌ Yahoo Finance error for ${stockCode}:`, error.message)
      return null
    }
  }

  /**
   * ETF 현재가 조회 (Yahoo Finance)
   * @param {string} etfCode - ETF 종목코드 (6자리)
   */
  async getETFPrice(etfCode) {
    // ETF도 주식과 동일한 방식으로 조회
    return await this.getStockPrice(etfCode)
  }

  /**
   * 여러 종목 일괄 조회
   * @param {Array<string>} symbols - 종목코드 배열
   */
  async getMultiplePrices(symbols) {
    const prices = {}

    // Yahoo Finance는 rate limit이 관대하므로 병렬 처리 가능
    const promises = symbols.map(symbol => this.getStockPrice(symbol))
    const results = await Promise.all(promises)

    results.forEach((price, index) => {
      if (price) {
        prices[symbols[index]] = price
      }
    })

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
