import axios from 'axios'

// API Configuration
const API_CONFIG = {
  FINNHUB_API_KEY: import.meta.env.VITE_FINNHUB_API_KEY || '',
  FRED_API_KEY: import.meta.env.VITE_FRED_API_KEY || '',
}

/**
 * ✅ 완전히 재작성된 실시간 시장 데이터 서비스
 *
 * API 전략:
 * - 🇺🇸 미국 주식/지수: Finnhub (무료, 실시간, CORS 지원)
 * - 🪙 암호화폐: CoinGecko (무료, 실시간)
 * - 💵 환율: ExchangeRate-API (무료, 실시간)
 * - 🥇 금: Finnhub commodities
 */
class MarketDataService {
  constructor() {
    this.finnhubBaseURL = 'https://finnhub.io/api/v1'
    this.coingeckoBaseURL = 'https://api.coingecko.com/api/v3'
    this.exchangeRateBaseURL = 'https://api.exchangerate-api.com/v4/latest'
    this.fredBaseURL = 'https://api.stlouisfed.org/fred/series/observations'

    // Simple cache to avoid excessive API calls
    this.cache = {}
    this.cacheExpiry = 60000 // 1 minute
  }

  /**
   * Check if cached data is still valid
   */
  isCacheValid(key) {
    const cached = this.cache[key]
    if (!cached) return false
    return Date.now() - cached.timestamp < this.cacheExpiry
  }

  /**
   * Get cached data or null
   */
  getCached(key) {
    if (this.isCacheValid(key)) {
      return this.cache[key].data
    }
    return null
  }

  /**
   * Set cache
   */
  setCache(key, data) {
    this.cache[key] = {
      data,
      timestamp: Date.now()
    }
  }

  /**
   * ✅ Finnhub - 실시간 미국 주식 지수
   * S&P 500, Nasdaq, Dow Jones 직접 지수 데이터
   */
  async fetchStockIndices() {
    const cacheKey = 'stock_indices'
    const cached = this.getCached(cacheKey)
    if (cached) return cached

    try {
      if (!API_CONFIG.FINNHUB_API_KEY) {
        console.warn('⚠️ Finnhub API key not configured. Using fallback data.')
        return this.getFallbackStockData()
      }

      // Finnhub index symbols
      const indices = {
        sp500: '^GSPC',   // S&P 500
        nasdaq: '^IXIC',  // Nasdaq Composite
        dow: '^DJI'       // Dow Jones Industrial Average
      }

      const responses = await Promise.all([
        axios.get(`${this.finnhubBaseURL}/quote`, {
          params: {
            symbol: indices.sp500,
            token: API_CONFIG.FINNHUB_API_KEY
          }
        }),
        axios.get(`${this.finnhubBaseURL}/quote`, {
          params: {
            symbol: indices.nasdaq,
            token: API_CONFIG.FINNHUB_API_KEY
          }
        }),
        axios.get(`${this.finnhubBaseURL}/quote`, {
          params: {
            symbol: indices.dow,
            token: API_CONFIG.FINNHUB_API_KEY
          }
        })
      ])

      const sp500Data = responses[0].data
      const nasdaqData = responses[1].data
      const dowData = responses[2].data

      const result = {
        sp500: {
          symbol: '^GSPC',
          price: sp500Data.c, // Current price
          change: sp500Data.d, // Change
          changePercent: sp500Data.dp, // Percent change
          isPositive: sp500Data.d > 0,
          high: sp500Data.h,
          low: sp500Data.l,
          open: sp500Data.o,
          previousClose: sp500Data.pc
        },
        nasdaq: {
          symbol: '^IXIC',
          price: nasdaqData.c,
          change: nasdaqData.d,
          changePercent: nasdaqData.dp,
          isPositive: nasdaqData.d > 0,
          high: nasdaqData.h,
          low: nasdaqData.l,
          open: nasdaqData.o,
          previousClose: nasdaqData.pc
        },
        dow: {
          symbol: '^DJI',
          price: dowData.c,
          change: dowData.d,
          changePercent: dowData.dp,
          isPositive: dowData.d > 0,
          high: dowData.h,
          low: dowData.l,
          open: dowData.o,
          previousClose: dowData.pc
        }
      }

      this.setCache(cacheKey, result)
      console.log('✅ Finnhub: Real-time stock indices fetched', result)
      return result

    } catch (error) {
      console.error('❌ Finnhub stock indices error:', error.message)
      return this.getFallbackStockData()
    }
  }

  /**
   * ✅ Finnhub - 금 가격 (Commodities)
   */
  async fetchGoldPrice() {
    const cacheKey = 'gold_price'
    const cached = this.getCached(cacheKey)
    if (cached) return cached

    try {
      if (!API_CONFIG.FINNHUB_API_KEY) {
        return this.getFallbackGoldData()
      }

      // GC=F is Gold Futures symbol
      const response = await axios.get(`${this.finnhubBaseURL}/quote`, {
        params: {
          symbol: 'GC=F',
          token: API_CONFIG.FINNHUB_API_KEY
        }
      })

      const data = response.data
      const result = {
        symbol: 'GOLD',
        price: data.c,
        change: data.d,
        changePercent: data.dp,
        isPositive: data.d > 0
      }

      this.setCache(cacheKey, result)
      console.log('✅ Finnhub: Real-time gold price fetched', result)
      return result

    } catch (error) {
      console.error('❌ Finnhub gold price error:', error.message)
      return this.getFallbackGoldData()
    }
  }

  /**
   * ✅ CoinGecko - 실시간 암호화폐 가격
   * 100% 무료, API 키 불필요
   */
  async getCryptoPrices() {
    const cacheKey = 'crypto_prices'
    const cached = this.getCached(cacheKey)
    if (cached) return cached

    try {
      const response = await axios.get(`${this.coingeckoBaseURL}/simple/price`, {
        params: {
          ids: 'bitcoin,ethereum,binancecoin,solana',
          vs_currencies: 'usd',
          include_24hr_change: true,
          include_24hr_vol: true,
          include_market_cap: true
        }
      })

      const data = response.data
      const result = {
        bitcoin: {
          name: 'Bitcoin',
          symbol: 'BTC',
          price: data.bitcoin.usd,
          change24h: data.bitcoin.usd_24h_change,
          isPositive: data.bitcoin.usd_24h_change > 0,
          volume: data.bitcoin.usd_24h_vol,
          marketCap: data.bitcoin.usd_market_cap
        },
        ethereum: {
          name: 'Ethereum',
          symbol: 'ETH',
          price: data.ethereum.usd,
          change24h: data.ethereum.usd_24h_change,
          isPositive: data.ethereum.usd_24h_change > 0,
          volume: data.ethereum.usd_24h_vol,
          marketCap: data.ethereum.usd_market_cap
        },
        binancecoin: {
          name: 'Binance Coin',
          symbol: 'BNB',
          price: data.binancecoin.usd,
          change24h: data.binancecoin.usd_24h_change,
          isPositive: data.binancecoin.usd_24h_change > 0,
          volume: data.binancecoin.usd_24h_vol,
          marketCap: data.binancecoin.usd_market_cap
        },
        solana: {
          name: 'Solana',
          symbol: 'SOL',
          price: data.solana.usd,
          change24h: data.solana.usd_24h_change,
          isPositive: data.solana.usd_24h_change > 0,
          volume: data.solana.usd_24h_vol,
          marketCap: data.solana.usd_market_cap
        }
      }

      this.setCache(cacheKey, result)
      console.log('✅ CoinGecko: Real-time crypto prices fetched', result)
      return result

    } catch (error) {
      console.error('❌ CoinGecko crypto error:', error.message)
      return this.getFallbackCryptoData()
    }
  }

  /**
   * ✅ ExchangeRate-API - 실시간 환율
   * 100% 무료, API 키 불필요
   */
  async getExchangeRates() {
    const cacheKey = 'exchange_rates'
    const cached = this.getCached(cacheKey)
    if (cached) return cached

    try {
      const response = await axios.get(`${this.exchangeRateBaseURL}/USD`)
      const rates = response.data.rates

      const result = {
        usdKrw: {
          base: 'USD',
          target: 'KRW',
          rate: rates.KRW,
          name: 'US Dollar to Korean Won'
        },
        usdEur: {
          base: 'USD',
          target: 'EUR',
          rate: rates.EUR,
          name: 'US Dollar to Euro'
        },
        usdJpy: {
          base: 'USD',
          target: 'JPY',
          rate: rates.JPY,
          name: 'US Dollar to Japanese Yen'
        },
        usdGbp: {
          base: 'USD',
          target: 'GBP',
          rate: rates.GBP,
          name: 'US Dollar to British Pound'
        }
      }

      this.setCache(cacheKey, result)
      console.log('✅ ExchangeRate: Real-time exchange rates fetched', result)
      return result

    } catch (error) {
      console.error('❌ ExchangeRate error:', error.message)
      return this.getFallbackCurrencyData()
    }
  }

  /**
   * ✅ 모든 시장 데이터 한번에 가져오기
   */
  async getAllMarketData() {
    try {
      const [stocks, gold, crypto, currency] = await Promise.all([
        this.fetchStockIndices(),
        this.fetchGoldPrice(),
        this.getCryptoPrices(),
        this.getExchangeRates()
      ])

      return {
        stocks,
        gold,
        crypto,
        currency,
        lastUpdated: new Date().toISOString()
      }
    } catch (error) {
      console.error('❌ Failed to fetch market data:', error)
      throw error
    }
  }

  /**
   * Fallback data - Only used when APIs are unavailable
   */
  getFallbackStockData() {
    console.warn('⚠️ Using fallback stock data - please configure Finnhub API key')
    return {
      sp500: {
        symbol: '^GSPC',
        price: 0,
        change: 0,
        changePercent: 0,
        isPositive: true,
        error: 'API key not configured'
      },
      nasdaq: {
        symbol: '^IXIC',
        price: 0,
        change: 0,
        changePercent: 0,
        isPositive: true,
        error: 'API key not configured'
      },
      dow: {
        symbol: '^DJI',
        price: 0,
        change: 0,
        changePercent: 0,
        isPositive: true,
        error: 'API key not configured'
      }
    }
  }

  getFallbackGoldData() {
    return {
      symbol: 'GOLD',
      price: 0,
      change: 0,
      changePercent: 0,
      isPositive: true,
      error: 'API key not configured'
    }
  }

  getFallbackCryptoData() {
    console.warn('⚠️ Using fallback crypto data - CoinGecko API unavailable')
    return {
      bitcoin: {
        name: 'Bitcoin',
        symbol: 'BTC',
        price: 0,
        change24h: 0,
        isPositive: true,
        error: 'API unavailable'
      },
      ethereum: {
        name: 'Ethereum',
        symbol: 'ETH',
        price: 0,
        change24h: 0,
        isPositive: true,
        error: 'API unavailable'
      },
      binancecoin: {
        name: 'Binance Coin',
        symbol: 'BNB',
        price: 0,
        change24h: 0,
        isPositive: true,
        error: 'API unavailable'
      },
      solana: {
        name: 'Solana',
        symbol: 'SOL',
        price: 0,
        change24h: 0,
        isPositive: true,
        error: 'API unavailable'
      }
    }
  }

  getFallbackCurrencyData() {
    console.warn('⚠️ Using fallback currency data - ExchangeRate API unavailable')
    return {
      usdKrw: {
        base: 'USD',
        target: 'KRW',
        rate: 1340,
        name: 'US Dollar to Korean Won',
        error: 'API unavailable'
      },
      usdEur: {
        base: 'USD',
        target: 'EUR',
        rate: 0.92,
        name: 'US Dollar to Euro',
        error: 'API unavailable'
      },
      usdJpy: {
        base: 'USD',
        target: 'JPY',
        rate: 149.50,
        name: 'US Dollar to Japanese Yen',
        error: 'API unavailable'
      },
      usdGbp: {
        base: 'USD',
        target: 'GBP',
        rate: 0.79,
        name: 'US Dollar to British Pound',
        error: 'API unavailable'
      }
    }
  }
}

// Export singleton instance
const marketDataService = new MarketDataService()
export default marketDataService
