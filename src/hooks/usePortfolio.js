import { useState, useEffect } from 'react'

/**
 * Hook for managing portfolio data
 * In production, this would connect to a backend API or local storage
 */
export const usePortfolio = () => {
  const [portfolio, setPortfolio] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load portfolio from localStorage
  useEffect(() => {
    const loadPortfolio = () => {
      setLoading(true)
      try {
        const saved = localStorage.getItem('portfolio')
        if (saved) {
          setPortfolio(JSON.parse(saved))
        } else {
          // Initialize with sample data
          const samplePortfolio = [
            {
              id: 1,
              symbol: 'AAPL',
              name: 'Apple Inc.',
              quantity: 10,
              avgPrice: 150.00,
              currentPrice: 185.23,
              type: '주식'
            },
            {
              id: 2,
              symbol: 'SPY',
              name: 'S&P 500 ETF',
              quantity: 5,
              avgPrice: 420.00,
              currentPrice: 445.67,
              type: 'ETF'
            },
          ]
          setPortfolio(samplePortfolio)
          localStorage.setItem('portfolio', JSON.stringify(samplePortfolio))
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadPortfolio()
  }, [])

  // Save portfolio to localStorage whenever it changes
  useEffect(() => {
    if (portfolio.length > 0) {
      localStorage.setItem('portfolio', JSON.stringify(portfolio))
    }
  }, [portfolio])

  const addAsset = (asset) => {
    const newAsset = {
      ...asset,
      id: Date.now(),
      totalValue: asset.quantity * asset.currentPrice,
      profit: (asset.currentPrice - asset.avgPrice) * asset.quantity,
      profitPercent: ((asset.currentPrice - asset.avgPrice) / asset.avgPrice) * 100
    }
    setPortfolio(prev => [...prev, newAsset])
  }

  const updateAsset = (id, updates) => {
    setPortfolio(prev =>
      prev.map(asset =>
        asset.id === id
          ? {
              ...asset,
              ...updates,
              totalValue: (updates.quantity || asset.quantity) * (updates.currentPrice || asset.currentPrice),
              profit: ((updates.currentPrice || asset.currentPrice) - (updates.avgPrice || asset.avgPrice)) * (updates.quantity || asset.quantity),
              profitPercent: (((updates.currentPrice || asset.currentPrice) - (updates.avgPrice || asset.avgPrice)) / (updates.avgPrice || asset.avgPrice)) * 100
            }
          : asset
      )
    )
  }

  const deleteAsset = (id) => {
    setPortfolio(prev => prev.filter(asset => asset.id !== id))
  }

  const getTotalValue = () => {
    return portfolio.reduce((sum, asset) => sum + (asset.totalValue || 0), 0)
  }

  const getTotalProfit = () => {
    return portfolio.reduce((sum, asset) => sum + (asset.profit || 0), 0)
  }

  const getAssetAllocation = () => {
    const total = getTotalValue()
    const allocation = {}

    portfolio.forEach(asset => {
      if (!allocation[asset.type]) {
        allocation[asset.type] = 0
      }
      allocation[asset.type] += (asset.totalValue / total) * 100
    })

    return allocation
  }

  return {
    portfolio,
    loading,
    error,
    addAsset,
    updateAsset,
    deleteAsset,
    getTotalValue,
    getTotalProfit,
    getAssetAllocation
  }
}
