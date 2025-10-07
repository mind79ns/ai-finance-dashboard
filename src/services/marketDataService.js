import axios from 'axios'

/**
 * Real-time Market Data Service - CORS Safe Version
 * Uses CORS-friendly APIs
 */

class MarketDataService {
  constructor() {
    this.coingeckoBaseURL = 'https://api.coingecko.com/api/v3'
    this.cache = new Map()
    this.cacheTimeout = 60000 // 1 minute cache
  }

  /**
   * Get cached data or fetch new
   */
  async getCachedOrFetch(key, fetchFn) {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data
    }

    const data = await fetchFn()
    this.cache.set(key, { data, timestamp: Date.now() })
    return data
  }

  /**
   * Fetch cryptocurrency prices from CoinGecko (FREE, NO CORS ISSUES)
   */
  async getCryptoPrices() {
    try {
      const response = await axios.get(`${this.coingeckoBaseURL}/simple/price`, {
        params: {
          ids: 'bitcoin,ethereum,binancecoin,cardano,solana',
          vs_currencies: 'usd',
          include_24hr_change: true,
          include_market_cap: true,
          include_24hr_vol: true
        }
      })

      return {
        bitcoin: {
          name: 'Bitcoin',
          symbol: 'BTC',
          price: response.data.bitcoin.usd,
          change24h: response.data.bitcoin.usd_24h_change,
          marketCap: response.data.bitcoin.usd_market_cap,
          volume24h: response.data.bitcoin.usd_24h_vol,
          isPositive: response.data.bitcoin.usd_24h_change > 0
        },
        ethereum: {
          name: 'Ethereum',
          symbol: 'ETH',
          price: response.data.ethereum.usd,
          change24h: response.data.ethereum.usd_24h_change,
          marketCap: response.data.ethereum.usd_market_cap,
          volume24h: response.data.ethereum.usd_24h_vol,
          isPositive: response.data.ethereum.usd_24h_change > 0
        },
        binancecoin: {
          name: 'BNB',
          symbol: 'BNB',
          price: response.data.binancecoin?.usd || 0,
          change24h: response.data.binancecoin?.usd_24h_change || 0,
          marketCap: response.data.binancecoin?.usd_market_cap || 0,
          isPositive: (response.data.binancecoin?.usd_24h_change || 0) > 0
        },
        solana: {
          name: 'Solana',
          symbol: 'SOL',
          price: response.data.solana?.usd || 0,
          change24h: response.data.solana?.usd_24h_change || 0,
          marketCap: response.data.solana?.usd_market_cap || 0,
          isPositive: (response.data.solana?.usd_24h_change || 0) > 0
        }
      }
    } catch (error) {
      console.error('CoinGecko API Error:', error)
      return this.getFallbackCryptoData()
    }
  }

  /**
   * Fetch stock indices using Finnhub (FREE API with CORS support)
   * Register at: https://finnhub.io/register (free tier: 60 calls/min)
   */
  async getStockIndices() {
    try {
      // Using free public APIs with CORS support
      const [sp500Data, goldData] = await Promise.all([
        this.fetchFromFinancialModelingPrep(),
        this.fetchGoldPrice()
      ])

      return {
        sp500: sp500Data.sp500,
        nasdaq: sp500Data.nasdaq,
        dow: sp500Data.dow,
        gold: goldData
      }
    } catch (error) {
      console.error('Stock Indices API Error:', error)
      return this.getFallbackStockData()
    }
  }

  /**
   * Fetch from Financial Modeling Prep (FREE, CORS-enabled)
   */
  async fetchFromFinancialModelingPrep() {
    try {
      // Using demo API key (public, limited but works for demo)
      // For production, get free key at: https://site.financialmodelingprep.com/developer/docs/
      const symbols = ['SPY', 'QQQ', 'DIA'] // ETFs representing indices
      const apiKey = 'demo' // Public demo key

      const responses = await Promise.all(
        symbols.map(symbol =>
          axios.get(`https://financialmodelingprep.com/api/v3/quote/${symbol}`, {
            params: { apikey: apiKey }
          }).catch(() => null)
        )
      )

      const spyData = responses[0]?.data?.[0]
      const qqqData = responses[1]?.data?.[0]
      const diaData = responses[2]?.data?.[0]

      return {
        sp500: spyData ? {
          symbol: '^GSPC',
          price: spyData.price * 11.5, // Approximate conversion from SPY to S&P 500
          change: spyData.change * 11.5,
          changePercent: spyData.changesPercentage,
          isPositive: spyData.change > 0,
          volume: spyData.volume
        } : this.getFallbackStockData().sp500,

        nasdaq: qqqData ? {
          symbol: '^IXIC',
          price: qqqData.price * 42, // Approximate conversion from QQQ to Nasdaq
          change: qqqData.change * 42,
          changePercent: qqqData.changesPercentage,
          isPositive: qqqData.change > 0,
          volume: qqqData.volume
        } : this.getFallbackStockData().nasdaq,

        dow: diaData ? {
          symbol: '^DJI',
          price: diaData.price * 100, // Approximate conversion from DIA to Dow
          change: diaData.change * 100,
          changePercent: diaData.changesPercentage,
          isPositive: diaData.change > 0,
          volume: diaData.volume
        } : this.getFallbackStockData().dow
      }
    } catch (error) {
      console.error('Financial Modeling Prep error:', error)
      throw error
    }
  }

  /**
   * Fetch Gold price from alternative source (CORS-safe)
   */
  async fetchGoldPrice() {
    try {
      // Using GLD (Gold ETF) as proxy for gold price
      const response = await axios.get('https://financialmodelingprep.com/api/v3/quote/GLD', {
        params: { apikey: 'demo' }
      })

      const gldData = response.data?.[0]

      if (gldData) {
        return {
          symbol: 'GOLD',
          price: gldData.price * 10, // Approximate gold price (GLD is ~1/10 of gold price)
          change: gldData.change * 10,
          changePercent: gldData.changesPercentage,
          isPositive: gldData.change > 0
        }
      }

      throw new Error('No gold data')
    } catch (error) {
      console.error('Gold price fetch error:', error)
      return {
        symbol: 'GOLD',
        price: 2650.00,
        change: 5.50,
        changePercent: 0.21,
        isPositive: true,
        note: '추정가 (실시간 아님)'
      }
    }
  }

  /**
   * Fetch currency rates (CORS-safe)
   */
  async getCurrencyRates() {
    try {
      // Using exchangerate-api.com (FREE, CORS-enabled)
      const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD')

      const prevRates = this.cache.get('prevRates')?.data || {}

      const rates = {
        usdKrw: {
          rate: response.data.rates.KRW,
          symbol: 'USD/KRW',
          change: prevRates.KRW ? ((response.data.rates.KRW - prevRates.KRW) / prevRates.KRW * 100) : 0
        },
        eurUsd: {
          rate: 1 / response.data.rates.EUR,
          symbol: 'EUR/USD',
          change: prevRates.EUR ? ((1/response.data.rates.EUR - 1/prevRates.EUR) / (1/prevRates.EUR) * 100) : 0
        },
        usdJpy: {
          rate: response.data.rates.JPY,
          symbol: 'USD/JPY',
          change: prevRates.JPY ? ((response.data.rates.JPY - prevRates.JPY) / prevRates.JPY * 100) : 0
        }
      }

      // Store for next comparison
      this.cache.set('prevRates', { data: response.data.rates, timestamp: Date.now() })

      return rates
    } catch (error) {
      console.error('Currency rates error:', error)
      return this.getFallbackCurrencyData()
    }
  }

  /**
   * Fallback data when APIs fail
   */
  getFallbackCryptoData() {
    return {
      bitcoin: {
        name: 'Bitcoin',
        symbol: 'BTC',
        price: 0,
        change24h: 0,
        marketCap: 0,
        isPositive: false,
        error: 'Unable to fetch data'
      },
      ethereum: {
        name: 'Ethereum',
        symbol: 'ETH',
        price: 0,
        change24h: 0,
        marketCap: 0,
        isPositive: false,
        error: 'Unable to fetch data'
      }
    }
  }

  getFallbackStockData() {
    return {
      sp500: {
        symbol: '^GSPC',
        price: 5900.00,
        change: 15.50,
        changePercent: 0.26,
        isPositive: true,
        note: '추정가 (실시간 아님)'
      },
      nasdaq: {
        symbol: '^IXIC',
        price: 19500.00,
        change: 50.25,
        changePercent: 0.26,
        isPositive: true,
        note: '추정가 (실시간 아님)'
      },
      dow: {
        symbol: '^DJI',
        price: 43800.00,
        change: 120.00,
        changePercent: 0.27,
        isPositive: true,
        note: '추정가 (실시간 아님)'
      },
      gold: {
        symbol: 'GOLD',
        price: 2650.00,
        change: 8.50,
        changePercent: 0.32,
        isPositive: true,
        note: '추정가 (실시간 아님)'
      }
    }
  }

  getFallbackCurrencyData() {
    return {
      usdKrw: { rate: 1340.00, symbol: 'USD/KRW', change: 0 },
      eurUsd: { rate: 1.08, symbol: 'EUR/USD', change: 0 },
      usdJpy: { rate: 149.50, symbol: 'USD/JPY', change: 0 }
    }
  }

  /**
   * Format large numbers
   */
  formatMarketCap(value) {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
    return `$${value.toFixed(2)}`
  }

  /**
   * Get all market data
   */
  async getAllMarketData() {
    try {
      const [cryptoData, stockData, currencyData] = await Promise.all([
        this.getCachedOrFetch('crypto', () => this.getCryptoPrices()),
        this.getCachedOrFetch('stocks', () => this.getStockIndices()),
        this.getCachedOrFetch('currency', () => this.getCurrencyRates())
      ])

      return {
        crypto: cryptoData,
        stocks: stockData,
        currency: currencyData,
        lastUpdate: new Date()
      }
    } catch (error) {
      console.error('Market data fetch error:', error)
      throw error
    }
  }
}

export default new MarketDataService()
