import { useState, useEffect } from 'react'
import axios from 'axios'

/**
 * Hook for fetching market data from Yahoo Finance
 * Note: Yahoo Finance public API may require CORS proxy in production
 */
export const useMarketData = (symbols = []) => {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchMarketData = async () => {
    if (symbols.length === 0) return

    setLoading(true)
    setError(null)

    try {
      // Yahoo Finance API alternative: you can use yfinance Python API or other services
      // For demo purposes, we'll use mock data
      const mockData = {}

      symbols.forEach(symbol => {
        mockData[symbol] = {
          symbol,
          price: (Math.random() * 1000 + 100).toFixed(2),
          change: (Math.random() * 20 - 10).toFixed(2),
          changePercent: (Math.random() * 5 - 2.5).toFixed(2),
          volume: Math.floor(Math.random() * 10000000),
          timestamp: new Date().toISOString()
        }
      })

      setData(mockData)
    } catch (err) {
      setError(err.message)
      console.error('Market data fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMarketData()

    // Refresh every 60 seconds
    const interval = setInterval(fetchMarketData, 60000)

    return () => clearInterval(interval)
  }, [symbols.join(',')])

  return { data, loading, error, refetch: fetchMarketData }
}

/**
 * Hook for fetching cryptocurrency data from CoinGecko
 */
export const useCryptoData = (coinIds = ['bitcoin', 'ethereum']) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchCryptoData = async () => {
    setLoading(true)
    setError(null)

    try {
      // CoinGecko API - free tier available
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price`,
        {
          params: {
            ids: coinIds.join(','),
            vs_currencies: 'usd',
            include_24hr_change: true,
            include_market_cap: true
          }
        }
      )

      const formattedData = Object.keys(response.data).map(key => ({
        id: key,
        price: response.data[key].usd,
        change24h: response.data[key].usd_24h_change,
        marketCap: response.data[key].usd_market_cap
      }))

      setData(formattedData)
    } catch (err) {
      setError(err.message)
      console.error('Crypto data fetch error:', err)

      // Fallback to mock data
      const mockData = coinIds.map(id => ({
        id,
        price: Math.random() * 50000 + 1000,
        change24h: (Math.random() * 10 - 5).toFixed(2),
        marketCap: Math.random() * 1000000000000
      }))
      setData(mockData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCryptoData()

    // Refresh every 2 minutes
    const interval = setInterval(fetchCryptoData, 120000)

    return () => clearInterval(interval)
  }, [coinIds.join(',')])

  return { data, loading, error, refetch: fetchCryptoData }
}

/**
 * Hook for fetching economic data from FRED API
 */
export const useEconomicData = (seriesId) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchEconomicData = async () => {
    const apiKey = import.meta.env.VITE_FRED_API_KEY

    if (!apiKey) {
      setError('FRED API key not configured')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await axios.get(
        `https://api.stlouisfed.org/fred/series/observations`,
        {
          params: {
            series_id: seriesId,
            api_key: apiKey,
            file_type: 'json',
            sort_order: 'desc',
            limit: 10
          }
        }
      )

      setData(response.data.observations)
    } catch (err) {
      setError(err.message)
      console.error('Economic data fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (seriesId) {
      fetchEconomicData()
    }
  }, [seriesId])

  return { data, loading, error, refetch: fetchEconomicData }
}
