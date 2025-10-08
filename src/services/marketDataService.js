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
   * ✅ Finnhub - 실시간 미국 주식 ETF (지수 추적)
   *
   * Finnhub 무료 플랜은 지수(^GSPC 등)를 지원하지 않음
   * 대신 ETF를 사용하여 실시간 시장 추세를 반영
   *
   * SPY = S&P 500 ETF (가장 인기 있는 S&P 500 추적 ETF)
   * QQQ = Nasdaq 100 ETF
   * DIA = Dow Jones ETF
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

      // Using ETFs that track major indices (Finnhub supports stocks/ETFs only)
      const responses = await Promise.all([
        axios.get(`${this.finnhubBaseURL}/quote`, {
          params: {
            symbol: 'SPY',  // SPDR S&P 500 ETF Trust
            token: API_CONFIG.FINNHUB_API_KEY
          }
        }),
        axios.get(`${this.finnhubBaseURL}/quote`, {
          params: {
            symbol: 'QQQ',  // Invesco QQQ (Nasdaq 100)
            token: API_CONFIG.FINNHUB_API_KEY
          }
        }),
        axios.get(`${this.finnhubBaseURL}/quote`, {
          params: {
            symbol: 'DIA',  // SPDR Dow Jones Industrial Average ETF
            token: API_CONFIG.FINNHUB_API_KEY
          }
        })
      ])

      const spyData = responses[0].data
      const qqqData = responses[1].data
      const diaData = responses[2].data

      console.log('📊 Finnhub Raw Data:', { spyData, qqqData, diaData })

      const result = {
        sp500: {
          symbol: 'SPY',
          name: 'S&P 500 (SPY ETF)',
          price: spyData.c, // Current price
          change: spyData.d, // Change
          changePercent: spyData.dp, // Percent change
          isPositive: spyData.d > 0,
          high: spyData.h,
          low: spyData.l,
          open: spyData.o,
          previousClose: spyData.pc
        },
        nasdaq: {
          symbol: 'QQQ',
          name: 'Nasdaq 100 (QQQ ETF)',
          price: qqqData.c,
          change: qqqData.d,
          changePercent: qqqData.dp,
          isPositive: qqqData.d > 0,
          high: qqqData.h,
          low: qqqData.l,
          open: qqqData.o,
          previousClose: qqqData.pc
        },
        dow: {
          symbol: 'DIA',
          name: 'Dow Jones (DIA ETF)',
          price: diaData.c,
          change: diaData.d,
          changePercent: diaData.dp,
          isPositive: diaData.d > 0,
          high: diaData.h,
          low: diaData.l,
          open: diaData.o,
          previousClose: diaData.pc
        }
      }

      this.setCache(cacheKey, result)
      console.log('✅ Finnhub: Real-time ETF data fetched', result)
      return result

    } catch (error) {
      console.error('❌ Finnhub stock indices error:', error.message)
      return this.getFallbackStockData()
    }
  }

  /**
   * ✅ Finnhub - 금 가격 (GLD ETF)
   * SPDR Gold Shares ETF - 금 가격 추적
   */
  async fetchGoldPrice() {
    const cacheKey = 'gold_price'
    const cached = this.getCached(cacheKey)
    if (cached) return cached

    try {
      if (!API_CONFIG.FINNHUB_API_KEY) {
        return this.getFallbackGoldData()
      }

      // GLD = SPDR Gold Shares ETF (tracks gold price)
      const response = await axios.get(`${this.finnhubBaseURL}/quote`, {
        params: {
          symbol: 'GLD',
          token: API_CONFIG.FINNHUB_API_KEY
        }
      })

      const data = response.data
      console.log('📊 Finnhub Gold (GLD) Data:', data)

      const result = {
        symbol: 'GLD',
        name: 'Gold (GLD ETF)',
        price: data.c,
        change: data.d,
        changePercent: data.dp,
        isPositive: data.d > 0
      }

      this.setCache(cacheKey, result)
      console.log('✅ Finnhub: Real-time gold ETF fetched', result)
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
   * ✅ Finnhub - 개별 주식/ETF 실시간 가격 조회
   * 포트폴리오에서 사용
   */
  async getStockPrice(symbol) {
    const cacheKey = `stock_${symbol}`
    const cached = this.getCached(cacheKey)
    if (cached) return cached

    try {
      if (!API_CONFIG.FINNHUB_API_KEY) {
        console.warn(`⚠️ Finnhub API key not configured for ${symbol}`)
        return null
      }

      const response = await axios.get(`${this.finnhubBaseURL}/quote`, {
        params: {
          symbol: symbol.toUpperCase(),
          token: API_CONFIG.FINNHUB_API_KEY
        }
      })

      const data = response.data

      // Finnhub returns c (current price)
      if (!data.c || data.c === 0) {
        console.warn(`⚠️ No price data for ${symbol}`)
        return null
      }

      const result = {
        symbol: symbol.toUpperCase(),
        price: data.c,
        change: data.d,
        changePercent: data.dp,
        isPositive: data.d > 0,
        high: data.h,
        low: data.l,
        open: data.o,
        previousClose: data.pc
      }

      this.setCache(cacheKey, result)
      console.log(`✅ Finnhub: ${symbol} price = $${result.price}`)
      return result

    } catch (error) {
      console.error(`❌ Finnhub error for ${symbol}:`, error.message)
      return null
    }
  }

  /**
   * ✅ 여러 종목 가격 한번에 조회
   */
  async getMultipleStockPrices(symbols) {
    try {
      const promises = symbols.map(symbol => this.getStockPrice(symbol))
      const results = await Promise.all(promises)

      // Convert to object with symbol as key
      const priceMap = {}
      results.forEach((result, index) => {
        if (result) {
          priceMap[symbols[index].toUpperCase()] = result
        }
      })

      return priceMap
    } catch (error) {
      console.error('❌ Failed to fetch multiple stock prices:', error)
      return {}
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
