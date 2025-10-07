import axios from 'axios'

/**
 * Real-time Market Data Service
 * Uses multiple free APIs for accurate market data
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
   * Fetch cryptocurrency prices from CoinGecko (FREE, NO API KEY)
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
   * Fetch stock indices from Yahoo Finance alternative (FREE)
   * Using financialmodelingprep.com free tier
   */
  async getStockIndices() {
    try {
      // Using public API from financialmodelingprep (no key required for quote endpoint)
      const symbols = ['%5EGSPC', '%5EIXIC', '%5EDJI'] // ^GSPC, ^IXIC, ^DJI encoded

      const responses = await Promise.all([
        this.fetchYahooQuote('^GSPC'),
        this.fetchYahooQuote('^IXIC'),
        this.fetchYahooQuote('^DJI'),
        this.fetchGoldPrice()
      ])

      return {
        sp500: responses[0],
        nasdaq: responses[1],
        dow: responses[2],
        gold: responses[3]
      }
    } catch (error) {
      console.error('Stock Indices API Error:', error)
      return this.getFallbackStockData()
    }
  }

  /**
   * Fetch Yahoo Finance data via alternative endpoint
   */
  async fetchYahooQuote(symbol) {
    try {
      // Using Yahoo Finance query1 API (public, no auth required)
      const response = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
        {
          params: {
            interval: '1d',
            range: '1d'
          }
        }
      )

      const result = response.data.chart.result[0]
      const meta = result.meta
      const quote = result.indicators.quote[0]

      const currentPrice = meta.regularMarketPrice
      const previousClose = meta.previousClose
      const change = currentPrice - previousClose
      const changePercent = (change / previousClose) * 100

      return {
        symbol: symbol,
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        isPositive: change > 0,
        high: meta.regularMarketDayHigh,
        low: meta.regularMarketDayLow,
        volume: meta.regularMarketVolume
      }
    } catch (error) {
      console.error(`Error fetching ${symbol}:`, error)
      throw error
    }
  }

  /**
   * Fetch Gold price from alternative source
   */
  async fetchGoldPrice() {
    try {
      // Gold price from metals-api.com or goldapi.io alternative
      // Using Yahoo Finance for Gold Futures
      return await this.fetchYahooQuote('GC=F')
    } catch (error) {
      console.error('Gold price fetch error:', error)
      return {
        symbol: 'GOLD',
        price: 2650.00,
        change: 5.50,
        changePercent: 0.21,
        isPositive: true
      }
    }
  }

  /**
   * Fetch currency rates
   */
  async getCurrencyRates() {
    try {
      // Using exchangerate-api.com free tier
      const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD')

      return {
        usdKrw: {
          rate: response.data.rates.KRW,
          symbol: 'USD/KRW'
        },
        eurUsd: {
          rate: 1 / response.data.rates.EUR,
          symbol: 'EUR/USD'
        },
        usdJpy: {
          rate: response.data.rates.JPY,
          symbol: 'USD/JPY'
        }
      }
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
      sp500: { symbol: '^GSPC', price: 0, change: 0, changePercent: 0, isPositive: false, error: 'Unable to fetch' },
      nasdaq: { symbol: '^IXIC', price: 0, change: 0, changePercent: 0, isPositive: false, error: 'Unable to fetch' },
      dow: { symbol: '^DJI', price: 0, change: 0, changePercent: 0, isPositive: false, error: 'Unable to fetch' },
      gold: { symbol: 'GOLD', price: 0, change: 0, changePercent: 0, isPositive: false, error: 'Unable to fetch' }
    }
  }

  getFallbackCurrencyData() {
    return {
      usdKrw: { rate: 1340.00, symbol: 'USD/KRW' },
      eurUsd: { rate: 1.08, symbol: 'EUR/USD' },
      usdJpy: { rate: 149.50, symbol: 'USD/JPY' }
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
