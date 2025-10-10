import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { PlusCircle, Edit2, Trash2, X, RefreshCw, Eye, Search, Filter, SortAsc, Upload, Download, FileText } from 'lucide-react'
import ChartCard from '../components/ChartCard'
import SlidePanel from '../components/SlidePanel'
import AssetDetailView from '../components/AssetDetailView'
import marketDataService from '../services/marketDataService'
import kisService from '../services/kisService'

const Portfolio = () => {
  const [assets, setAssets] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showDetailPanel, setShowDetailPanel] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    type: '주식',
    quantity: '',
    avgPrice: '',
    currency: 'USD',
    account: '기본계좌',
    category: '해외주식'
  })
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [exchangeRate, setExchangeRate] = useState(1340) // USD/KRW rate
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('전체')
  const [sortBy, setSortBy] = useState('default') // default, profit, profitPercent, value
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedAssets, setSelectedAssets] = useState([]) // For bulk delete
  const [selectionMode, setSelectionMode] = useState(false) // Toggle selection mode

  // Investment Management Table state
  const [investmentRecords, setInvestmentRecords] = useState([])
  const [showInvestmentModal, setShowInvestmentModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)

  // Load assets from localStorage on mount
  useEffect(() => {
    const savedAssets = localStorage.getItem('portfolio_assets')
    if (savedAssets) {
      try {
        setAssets(JSON.parse(savedAssets))
      } catch (error) {
        console.error('Failed to load assets from localStorage:', error)
      }
    }

    // Load investment records
    const savedRecords = localStorage.getItem('investment_records')
    if (savedRecords) {
      try {
        setInvestmentRecords(JSON.parse(savedRecords))
      } catch (error) {
        console.error('Failed to load investment records:', error)
      }
    }
  }, [])

  // Save investment records to localStorage
  useEffect(() => {
    if (investmentRecords.length >= 0) {
      localStorage.setItem('investment_records', JSON.stringify(investmentRecords))
    }
  }, [investmentRecords])

  // Fetch real-time prices for ALL assets (stocks, ETFs, crypto)
  useEffect(() => {
    const updatePrices = async () => {
      // Skip if no assets loaded yet
      if (assets.length === 0) {
        return
      }

      try {
        setLoading(true)
        const marketData = await marketDataService.getAllMarketData()

        // Update exchange rate
        if (marketData.currency?.usdKrw) {
          setExchangeRate(marketData.currency.usdKrw.rate)
        }

        // Get list of USD stock/ETF symbols to fetch
        const usdStockSymbols = assets
          .filter(asset =>
            (asset.type === '주식' || asset.type === 'ETF') &&
            asset.currency === 'USD'
          )
          .map(asset => asset.symbol)

        // Get list of KRW stock/ETF symbols to fetch
        const krwStockSymbols = assets
          .filter(asset =>
            (asset.type === '주식' || asset.type === 'ETF') &&
            asset.currency === 'KRW'
          )
          .map(asset => asset.symbol)

        // Fetch USD stock prices from Finnhub
        let usdStockPrices = {}
        if (usdStockSymbols.length > 0) {
          usdStockPrices = await marketDataService.getMultipleStockPrices(usdStockSymbols)
        }

        // Fetch KRW stock prices from 한국투자증권
        let krwStockPrices = {}
        if (krwStockSymbols.length > 0) {
          krwStockPrices = await kisService.getMultiplePrices(krwStockSymbols)
          console.log(`📊 KIS: Fetched ${Object.keys(krwStockPrices).length} KRW stock prices`)
        }

        // Update all asset prices
        const updatedAssets = assets.map(asset => {
          let currentPrice = asset.currentPrice

          // Update USD stock/ETF prices from Finnhub
          if ((asset.type === '주식' || asset.type === 'ETF') &&
              asset.currency === 'USD' &&
              usdStockPrices[asset.symbol]) {
            currentPrice = usdStockPrices[asset.symbol].price
            console.log(`📊 Finnhub: ${asset.symbol} = $${currentPrice}`)
          }
          // Update KRW stock/ETF prices from 한국투자증권
          else if ((asset.type === '주식' || asset.type === 'ETF') &&
                   asset.currency === 'KRW' &&
                   krwStockPrices[asset.symbol]) {
            currentPrice = krwStockPrices[asset.symbol].price
            console.log(`📊 KIS: ${asset.symbol} = ₩${currentPrice}`)
          }
          // Update crypto prices from CoinGecko
          else if (asset.symbol === 'BTC' && marketData.crypto?.bitcoin) {
            currentPrice = marketData.crypto.bitcoin.price
          }
          else if (asset.symbol === 'ETH' && marketData.crypto?.ethereum) {
            currentPrice = marketData.crypto.ethereum.price
          }
          else if (asset.symbol === 'BNB' && marketData.crypto?.binancecoin) {
            currentPrice = marketData.crypto.binancecoin.price
          }
          else if (asset.symbol === 'SOL' && marketData.crypto?.solana) {
            currentPrice = marketData.crypto.solana.price
          }

          // Recalculate values based on real-time current price
          const totalValue = asset.quantity * currentPrice
          const profit = totalValue - (asset.quantity * asset.avgPrice)
          const profitPercent = ((currentPrice - asset.avgPrice) / asset.avgPrice) * 100

          return {
            ...asset,
            currentPrice,
            totalValue,
            profit,
            profitPercent
          }
        })

        setAssets(updatedAssets)
        localStorage.setItem('portfolio_assets', JSON.stringify(updatedAssets))
        setLastUpdate(new Date())
      } catch (error) {
        console.error('Price update error:', error)
      } finally {
        setLoading(false)
      }
    }

    updatePrices()
    // Auto-refresh every 2 minutes
    const interval = setInterval(updatePrices, 120000)
    return () => clearInterval(interval)
  }, [assets.length]) // Re-run when assets are added/removed

  const performanceData = assets.map(asset => ({
    name: asset.symbol,
    fullName: asset.name,
    수익률: parseFloat((asset.profitPercent || 0).toFixed(2))
  }))

  // USD 자산 계산
  const usdAssets = assets.filter(a => a.currency === 'USD')
  const usdTotalValue = usdAssets.reduce((sum, asset) => sum + asset.totalValue, 0)
  const usdTotalProfit = usdAssets.reduce((sum, asset) => sum + asset.profit, 0)
  const usdAvgProfitPercent = usdTotalValue > usdTotalProfit ? (usdTotalProfit / (usdTotalValue - usdTotalProfit)) * 100 : 0

  // KRW 자산 계산
  const krwAssets = assets.filter(a => a.currency === 'KRW')
  const krwTotalValue = krwAssets.reduce((sum, asset) => sum + asset.totalValue, 0)
  const krwTotalProfit = krwAssets.reduce((sum, asset) => sum + asset.profit, 0)
  const krwAvgProfitPercent = krwTotalValue > krwTotalProfit ? (krwTotalProfit / (krwTotalValue - krwTotalProfit)) * 100 : 0

  // 총 평가액 (원화 기준 통합)
  const totalValueKRW = krwTotalValue + (usdTotalValue * exchangeRate)
  const totalProfitKRW = krwTotalProfit + (usdTotalProfit * exchangeRate)
  const totalAvgProfitPercent = totalValueKRW > totalProfitKRW ? (totalProfitKRW / (totalValueKRW - totalProfitKRW)) * 100 : 0

  // 계좌별 통계 계산 (USD/KRW 분리)
  const accountStats = assets.reduce((acc, asset) => {
    const account = asset.account || '기본계좌'
    if (!acc[account]) {
      acc[account] = {
        account,
        usdTotalValue: 0,
        usdTotalProfit: 0,
        krwTotalValue: 0,
        krwTotalProfit: 0,
        assets: []
      }
    }

    if (asset.currency === 'USD') {
      acc[account].usdTotalValue += asset.totalValue
      acc[account].usdTotalProfit += asset.profit
    } else if (asset.currency === 'KRW') {
      acc[account].krwTotalValue += asset.totalValue
      acc[account].krwTotalProfit += asset.profit
    }

    acc[account].assets.push(asset)
    return acc
  }, {})

  const accountSummary = Object.values(accountStats).map(stat => {
    const usdProfitPercent = stat.usdTotalValue > stat.usdTotalProfit
      ? (stat.usdTotalProfit / (stat.usdTotalValue - stat.usdTotalProfit)) * 100
      : 0
    const krwProfitPercent = stat.krwTotalValue > stat.krwTotalProfit
      ? (stat.krwTotalProfit / (stat.krwTotalValue - stat.krwTotalProfit)) * 100
      : 0

    return {
      ...stat,
      usdProfitPercent,
      krwProfitPercent
    }
  })

  const handleAddAsset = () => {
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setFormData({
      symbol: '',
      name: '',
      type: '주식',
      quantity: '',
      avgPrice: '',
      currency: 'USD',
      account: '기본계좌',
      category: '해외주식'
    })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const quantity = parseFloat(formData.quantity)
    const avgPrice = parseFloat(formData.avgPrice)
    const totalValue = quantity * avgPrice

    const newAsset = {
      id: Date.now(),
      symbol: formData.symbol.toUpperCase(),
      name: formData.name,
      type: formData.type,
      quantity,
      avgPrice,
      currentPrice: avgPrice, // Initial price, will be updated by real-time data
      totalValue,
      profit: 0,
      profitPercent: 0,
      currency: formData.currency,
      account: formData.account,
      category: formData.category
    }

    const updatedAssets = [...assets, newAsset]
    setAssets(updatedAssets)
    localStorage.setItem('portfolio_assets', JSON.stringify(updatedAssets))
    handleCloseModal()
  }

  const handleDeleteAsset = (id) => {
    if (window.confirm('이 자산을 삭제하시겠습니까?')) {
      const updatedAssets = assets.filter(asset => asset.id !== id)
      setAssets(updatedAssets)
      localStorage.setItem('portfolio_assets', JSON.stringify(updatedAssets))
    }
  }

  // Toggle selection mode
  const handleToggleSelectionMode = () => {
    setSelectionMode(!selectionMode)
    setSelectedAssets([]) // Clear selection when toggling
  }

  // Toggle individual asset selection
  const handleToggleAssetSelection = (assetId) => {
    setSelectedAssets(prev => {
      if (prev.includes(assetId)) {
        return prev.filter(id => id !== assetId)
      } else {
        return [...prev, assetId]
      }
    })
  }

  // Select all assets
  const handleSelectAll = () => {
    if (selectedAssets.length === filteredAssets.length) {
      setSelectedAssets([])
    } else {
      setSelectedAssets(filteredAssets.map(asset => asset.id))
    }
  }

  // Bulk delete selected assets
  const handleBulkDelete = () => {
    if (selectedAssets.length === 0) {
      alert('삭제할 자산을 선택해주세요.')
      return
    }

    if (window.confirm(`선택한 ${selectedAssets.length}개의 자산을 삭제하시겠습니까?`)) {
      const updatedAssets = assets.filter(asset => !selectedAssets.includes(asset.id))
      setAssets(updatedAssets)
      localStorage.setItem('portfolio_assets', JSON.stringify(updatedAssets))
      setSelectedAssets([])
      setSelectionMode(false)
      alert(`${selectedAssets.length}개의 자산이 삭제되었습니다.`)
    }
  }

  const handleViewDetail = (asset) => {
    setSelectedAsset(asset)
    setShowDetailPanel(true)
  }

  const formatCurrency = (value, currency) => {
    if (currency === 'KRW') {
      return `₩${Math.round(value).toLocaleString('ko-KR')}`
    }
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  }

  // Symbol mapping for Korean stocks (A379780 → 379780.KS format)
  const mapSymbolToFinnhub = (symbol, currency) => {
    // Remove 'A' prefix from Korean stock symbols
    if (currency === 'KRW' && symbol.startsWith('A')) {
      return symbol.substring(1) // A379780 → 379780
    }
    return symbol
  }

  // CSV Import Handler - Support brokerage CSV format
  const handleCSVImport = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()

    // First, try reading as ArrayBuffer to detect encoding
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target.result
        let text

        // Try UTF-8 first
        try {
          const decoder = new TextDecoder('utf-8', { fatal: true })
          text = decoder.decode(arrayBuffer)
        } catch (utfError) {
          // If UTF-8 fails, try EUC-KR
          console.log('UTF-8 decoding failed, trying EUC-KR...')
          try {
            const decoder = new TextDecoder('euc-kr')
            text = decoder.decode(arrayBuffer)
          } catch (eucError) {
            // Fallback to default
            const decoder = new TextDecoder()
            text = decoder.decode(arrayBuffer)
          }
        }

        const lines = text.split('\n').filter(line => line.trim())

        if (lines.length < 2) {
          alert('⚠️ CSV 파일이 비어있거나 형식이 올바르지 않습니다.')
          return
        }

        // Detect CSV format by checking header
        const header = lines[0].toLowerCase()
        const dataLines = lines.slice(1)
        const importedAssets = []

        dataLines.forEach((line, index) => {
          try {
            // Parse CSV with proper handling of quoted values
            const columns = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)?.map(col =>
              col.replace(/^"|"$/g, '').trim()
            ) || []

            let accountNumber, accountType, symbol, name, type, quantity, avgPrice, currency

            // Brokerage format: Account Number,Account Type,Symbol,Name,Type,Quantity,AvgPrice,Type
            if (header.includes('account number')) {
              [accountNumber, accountType, symbol, name, type, quantity, avgPrice, currency] = columns
            }
            // Simple format: Symbol,Name,Type,Quantity,AvgPrice,Currency,Account,Category
            else {
              const [sym, nm, tp, qty, price, curr, acc, cat] = columns
              symbol = sym
              name = nm
              type = tp
              quantity = qty
              avgPrice = price
              currency = curr
              accountType = acc
            }

            // Clean and validate data
            if (!symbol || !quantity || !avgPrice) {
              console.warn(`Skipping row ${index + 2}: Missing required fields`)
              return
            }

            // Parse quantity: handle different formats
            const qty = parseFloat(quantity.replace(/,/g, ''))

            // Parse price: remove quotes and commas (e.g., "20,220" → 20220)
            const price = parseFloat(avgPrice.replace(/[",]/g, ''))

            // Determine currency
            const curr = (currency || 'USD').toUpperCase().trim()

            // Clean symbol (remove A prefix for Korean stocks)
            const cleanSymbol = mapSymbolToFinnhub(symbol.trim().toUpperCase(), curr)

            // Determine account and category from account type
            const acc = accountType || '기본계좌'
            const cat = curr === 'KRW' ? '국내주식' : '해외주식'

            if (isNaN(qty) || isNaN(price)) {
              console.warn(`Skipping row ${index + 2}: Invalid number format (qty=${quantity}, price=${avgPrice})`)
              return
            }

            importedAssets.push({
              id: Date.now() + Math.random() + index,
              symbol: cleanSymbol,
              name: name || symbol,
              type: type || (curr === 'KRW' ? 'ETF' : '주식'),
              quantity: qty,
              avgPrice: price,
              currentPrice: price,
              totalValue: qty * price,
              profit: 0,
              profitPercent: 0,
              currency: curr,
              account: acc,
              category: cat
            })
          } catch (rowError) {
            console.error(`Error parsing row ${index + 2}:`, rowError)
          }
        })

        if (importedAssets.length > 0) {
          const updatedAssets = [...assets, ...importedAssets]
          setAssets(updatedAssets)
          localStorage.setItem('portfolio_assets', JSON.stringify(updatedAssets))
          alert(`✅ ${importedAssets.length}개 자산을 성공적으로 가져왔습니다!`)
          setShowImportModal(false)
        } else {
          alert('⚠️ CSV 파일에서 유효한 데이터를 찾을 수 없습니다.\n\n파일 형식을 확인해주세요.')
        }
      } catch (error) {
        console.error('CSV Import Error:', error)
        alert(`❌ CSV 파일을 읽는 중 오류가 발생했습니다.\n\n${error.message}`)
      }
    }

    // Read as ArrayBuffer to support multiple encodings
    reader.readAsArrayBuffer(file)
  }

  // CSV Export Handler
  const handleCSVExport = () => {
    const headers = ['Symbol', 'Name', 'Type', 'Quantity', 'AvgPrice', 'Currency', 'Account', 'Category']
    const csvData = assets.map(asset => [
      asset.symbol,
      asset.name,
      asset.type,
      asset.quantity,
      asset.avgPrice,
      asset.currency || 'USD',
      asset.account || '기본계좌',
      asset.category || '해외주식'
    ])

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n')

    // Add UTF-8 BOM for Excel Korean support
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `portfolio_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // JSON Export Handler
  const handleJSONExport = () => {
    const jsonData = JSON.stringify(assets, null, 2)
    const blob = new Blob([jsonData], { type: 'application/json' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `portfolio_${new Date().toISOString().split('T')[0]}.json`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Filter and search logic
  const filteredAssets = assets
    .filter(asset => {
      // Type filter
      if (filterType !== '전체' && asset.type !== filterType) {
        return false
      }
      // Search filter (symbol or name)
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase()
        return asset.symbol.toLowerCase().includes(query) ||
               asset.name.toLowerCase().includes(query)
      }
      return true
    })
    .sort((a, b) => {
      // Sort logic
      switch (sortBy) {
        case 'profit':
          return b.profit - a.profit
        case 'profitPercent':
          return b.profitPercent - a.profitPercent
        case 'value':
          return b.totalValue - a.totalValue
        case 'default':
        default:
          return 0
      }
    })

  // Get unique asset types for filter
  const assetTypes = ['전체', ...new Set(assets.map(a => a.type))]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">포트폴리오</h2>
          {lastUpdate && (
            <p className="text-sm text-gray-600 mt-1">
              마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right mr-3">
            <p className="text-xs text-gray-600">환율 (USD/KRW)</p>
            <p className="text-sm font-medium text-gray-900">₩{exchangeRate.toLocaleString()}</p>
          </div>
          {loading && <RefreshCw className="w-5 h-5 text-primary-600 animate-spin" />}
        </div>
      </div>

      {/* Portfolio Summary - Premium Design */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 총 평가액 (원화 기준 통합) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 p-6 shadow-xl">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white opacity-10"></div>
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 h-32 w-32 rounded-full bg-white opacity-5"></div>
          <div className="relative">
            <p className="text-sm font-medium text-blue-100 mb-2">총 평가액 (원화 통합)</p>
            <p className="text-4xl font-bold text-white mb-4">
              ₩{totalValueKRW.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
            </p>
            <div className="space-y-2 pt-3 border-t border-blue-400/30">
              {usdAssets.length > 0 && (
                <div className="flex items-center justify-between text-blue-50">
                  <span className="text-xs font-medium">🇺🇸 USD</span>
                  <span className="text-sm font-semibold">${usdTotalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
              )}
              {krwAssets.length > 0 && (
                <div className="flex items-center justify-between text-blue-50">
                  <span className="text-xs font-medium">🇰🇷 KRW</span>
                  <span className="text-sm font-semibold">₩{krwTotalValue.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 총 수익금 (원화 기준 통합) */}
        <div className={`relative overflow-hidden rounded-2xl p-6 shadow-xl ${
          totalProfitKRW >= 0
            ? 'bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700'
            : 'bg-gradient-to-br from-red-500 via-rose-600 to-pink-700'
        }`}>
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white opacity-10"></div>
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 h-32 w-32 rounded-full bg-white opacity-5"></div>
          <div className="relative">
            <p className={`text-sm font-medium mb-2 ${totalProfitKRW >= 0 ? 'text-emerald-100' : 'text-red-100'}`}>
              총 수익금 (원화 통합)
            </p>
            <p className="text-4xl font-bold text-white mb-4">
              {totalProfitKRW >= 0 ? '+' : ''}₩{totalProfitKRW.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
            </p>
            <div className={`space-y-2 pt-3 border-t ${totalProfitKRW >= 0 ? 'border-emerald-400/30' : 'border-red-400/30'}`}>
              {usdAssets.length > 0 && (
                <div className={`flex items-center justify-between ${totalProfitKRW >= 0 ? 'text-emerald-50' : 'text-red-50'}`}>
                  <span className="text-xs font-medium">🇺🇸 USD</span>
                  <span className="text-sm font-semibold">
                    {usdTotalProfit >= 0 ? '+' : ''}${usdTotalProfit.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}
              {krwAssets.length > 0 && (
                <div className={`flex items-center justify-between ${totalProfitKRW >= 0 ? 'text-emerald-50' : 'text-red-50'}`}>
                  <span className="text-xs font-medium">🇰🇷 KRW</span>
                  <span className="text-sm font-semibold">
                    {krwTotalProfit >= 0 ? '+' : ''}₩{krwTotalProfit.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 평균 수익률 */}
        <div className={`relative overflow-hidden rounded-2xl p-6 shadow-xl ${
          totalAvgProfitPercent >= 0
            ? 'bg-gradient-to-br from-purple-500 via-violet-600 to-indigo-700'
            : 'bg-gradient-to-br from-orange-500 via-amber-600 to-yellow-700'
        }`}>
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white opacity-10"></div>
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 h-32 w-32 rounded-full bg-white opacity-5"></div>
          <div className="relative">
            <p className={`text-sm font-medium mb-2 ${totalAvgProfitPercent >= 0 ? 'text-purple-100' : 'text-orange-100'}`}>
              평균 수익률
            </p>
            <p className="text-4xl font-bold text-white mb-4">
              {totalAvgProfitPercent >= 0 ? '+' : ''}{(totalAvgProfitPercent || 0).toFixed(2)}%
            </p>
            <div className={`space-y-2 pt-3 border-t ${totalAvgProfitPercent >= 0 ? 'border-purple-400/30' : 'border-orange-400/30'}`}>
              {usdAssets.length > 0 && (
                <div className={`flex items-center justify-between ${totalAvgProfitPercent >= 0 ? 'text-purple-50' : 'text-orange-50'}`}>
                  <span className="text-xs font-medium">🇺🇸 USD</span>
                  <span className="text-sm font-semibold">
                    {usdAvgProfitPercent >= 0 ? '+' : ''}{(usdAvgProfitPercent || 0).toFixed(2)}%
                  </span>
                </div>
              )}
              {krwAssets.length > 0 && (
                <div className={`flex items-center justify-between ${totalAvgProfitPercent >= 0 ? 'text-purple-50' : 'text-orange-50'}`}>
                  <span className="text-xs font-medium">🇰🇷 KRW</span>
                  <span className="text-sm font-semibold">
                    {krwAvgProfitPercent >= 0 ? '+' : ''}{(krwAvgProfitPercent || 0).toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Investment Management Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">투자 관리표</h3>
            <p className="text-sm text-gray-600 mt-1">계좌별 투자 현황 종합 관리</p>
          </div>
          <button
            onClick={() => {
              setEditingRecord(null)
              setShowInvestmentModal(true)
            }}
            className="btn-primary flex items-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            항목 추가
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-100 border-b border-blue-200">
                <th className="text-center py-3 px-4 font-bold text-blue-900">No.</th>
                <th className="text-left py-3 px-4 font-bold text-blue-900">목표</th>
                <th className="text-left py-3 px-4 font-bold text-blue-900">계좌번호</th>
                <th className="text-right py-3 px-4 font-bold text-blue-900">원금</th>
                <th className="text-right py-3 px-4 font-bold text-blue-900">잔여금</th>
                <th className="text-right py-3 px-4 font-bold text-blue-900 bg-blue-200">투자금</th>
                <th className="text-right py-3 px-4 font-bold text-blue-900 bg-blue-200">평가금액(원)</th>
                <th className="text-right py-3 px-4 font-bold text-blue-900 bg-blue-200">손익</th>
                <th className="text-left py-3 px-4 font-bold text-blue-900">비고</th>
                <th className="text-center py-3 px-4 font-bold text-blue-900">관리</th>
              </tr>
            </thead>
            <tbody>
              {investmentRecords.map((record, index) => {
                // Calculate investment amount: 원금 - 잔여금
                const investmentAmount = (record.principal || 0) - (record.remaining || 0)

                // Calculate evaluation amount from portfolio assets matching this account
                const accountAssets = assets.filter(asset => asset.account === record.accountNumber)
                const evaluationKRW = accountAssets.reduce((sum, asset) => {
                  if (asset.currency === 'KRW') {
                    return sum + asset.totalValue
                  } else if (asset.currency === 'USD') {
                    return sum + (asset.totalValue * exchangeRate)
                  }
                  return sum
                }, 0)

                // Calculate profit: 평가금액 - 투자금
                const profit = evaluationKRW - investmentAmount

                return (
                  <tr key={record.id || index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="text-center py-3 px-4 text-gray-900">{index + 1}</td>
                    <td className="py-3 px-4 text-gray-900">{record.goal || '-'}</td>
                    <td className="py-3 px-4 text-gray-900">{record.accountNumber || '-'}</td>
                    <td className="text-right py-3 px-4 text-gray-900">
                      {new Intl.NumberFormat('ko-KR').format(record.principal || 0)}
                    </td>
                    <td className="text-right py-3 px-4 text-gray-900">
                      {new Intl.NumberFormat('ko-KR').format(record.remaining || 0)}
                    </td>
                    <td className="text-right py-3 px-4 font-bold text-gray-900 bg-blue-50">
                      {new Intl.NumberFormat('ko-KR').format(investmentAmount)}
                    </td>
                    <td className="text-right py-3 px-4 font-bold text-gray-900 bg-blue-50">
                      {new Intl.NumberFormat('ko-KR').format(Math.round(evaluationKRW))}
                    </td>
                    <td className={`text-right py-3 px-4 font-bold bg-blue-50 ${profit >= 0 ? 'text-success' : 'text-danger'}`}>
                      {profit >= 0 ? '+' : ''}{new Intl.NumberFormat('ko-KR').format(Math.round(profit))}
                    </td>
                    <td className="py-3 px-4 text-gray-700 text-xs">{record.note || '-'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingRecord(record)
                            setShowInvestmentModal(true)
                          }}
                          className="p-1 hover:bg-blue-50 rounded transition-colors"
                          title="수정"
                        >
                          <Edit2 className="w-4 h-4 text-primary-600" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('이 항목을 삭제하시겠습니까?')) {
                              setInvestmentRecords(prev => prev.filter(r => r.id !== record.id))
                            }
                          }}
                          className="p-1 hover:bg-red-50 rounded transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4 text-danger" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {/* TOTAL Row */}
              {investmentRecords.length > 0 && (
                <tr className="bg-blue-200 border-t-2 border-blue-300 font-bold">
                  <td colSpan="3" className="text-center py-3 px-4 text-blue-900">TOTAL</td>
                  <td className="text-right py-3 px-4 text-blue-900">
                    {new Intl.NumberFormat('ko-KR').format(
                      investmentRecords.reduce((sum, r) => sum + (r.principal || 0), 0)
                    )}
                  </td>
                  <td className="text-right py-3 px-4 text-blue-900">
                    {new Intl.NumberFormat('ko-KR').format(
                      investmentRecords.reduce((sum, r) => sum + (r.remaining || 0), 0)
                    )}
                  </td>
                  <td className="text-right py-3 px-4 text-blue-900">
                    {new Intl.NumberFormat('ko-KR').format(
                      investmentRecords.reduce((sum, r) => sum + ((r.principal || 0) - (r.remaining || 0)), 0)
                    )}
                  </td>
                  <td className="text-right py-3 px-4 text-blue-900">
                    {new Intl.NumberFormat('ko-KR').format(
                      Math.round(investmentRecords.reduce((sum, r) => {
                        const accountAssets = assets.filter(asset => asset.account === r.accountNumber)
                        return sum + accountAssets.reduce((assetSum, asset) => {
                          if (asset.currency === 'KRW') {
                            return assetSum + asset.totalValue
                          } else if (asset.currency === 'USD') {
                            return assetSum + (asset.totalValue * exchangeRate)
                          }
                          return assetSum
                        }, 0)
                      }, 0))
                    )}
                  </td>
                  <td className="text-right py-3 px-4 text-blue-900">
                    {(() => {
                      const totalInvestment = investmentRecords.reduce((sum, r) => sum + ((r.principal || 0) - (r.remaining || 0)), 0)
                      const totalEvaluation = investmentRecords.reduce((sum, r) => {
                        const accountAssets = assets.filter(asset => asset.account === r.accountNumber)
                        return sum + accountAssets.reduce((assetSum, asset) => {
                          if (asset.currency === 'KRW') {
                            return assetSum + asset.totalValue
                          } else if (asset.currency === 'USD') {
                            return assetSum + (asset.totalValue * exchangeRate)
                          }
                          return assetSum
                        }, 0)
                      }, 0)
                      const totalProfit = totalEvaluation - totalInvestment
                      return (
                        <span className={totalProfit >= 0 ? 'text-success' : 'text-danger'}>
                          {totalProfit >= 0 ? '+' : ''}{new Intl.NumberFormat('ko-KR').format(Math.round(totalProfit))}
                        </span>
                      )
                    })()}
                  </td>
                  <td colSpan="2"></td>
                </tr>
              )}

              {investmentRecords.length === 0 && (
                <tr>
                  <td colSpan="10" className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <FileText className="w-12 h-12 mb-3 text-gray-300" />
                      <p className="text-lg font-medium">등록된 투자 항목이 없습니다</p>
                      <p className="text-sm mt-1">우측 상단 '항목 추가' 버튼을 클릭하여 추가하세요</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 계좌별 대시보드 - Premium Design */}
      {accountSummary.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">계좌별 현황</h3>
              <p className="text-sm text-gray-600 mt-1">계좌별 평가액 및 수익 분석 (USD/KRW 분리)</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accountSummary.map((account) => (
              <div key={account.account} className="relative overflow-hidden rounded-xl bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
                {/* Header with gradient background */}
                <div className="bg-gradient-to-r from-slate-700 to-slate-900 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-lg">{account.account}</h4>
                    <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-medium text-white backdrop-blur-sm">
                      {account.assets.length}개 자산
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                  {/* USD 자산 */}
                  {account.usdTotalValue > 0 && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🇺🇸</span>
                        <span className="text-sm font-bold text-blue-900">USD</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-blue-700">평가액</span>
                          <span className="text-base font-bold text-blue-900">
                            ${account.usdTotalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-blue-700">수익금</span>
                          <span className={`text-sm font-bold ${account.usdTotalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {account.usdTotalProfit >= 0 ? '+' : ''}${account.usdTotalProfit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                          <span className="text-xs font-medium text-blue-700">수익률</span>
                          <span className={`text-lg font-bold ${account.usdProfitPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {account.usdProfitPercent >= 0 ? '+' : ''}{account.usdProfitPercent.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KRW 자산 */}
                  {account.krwTotalValue > 0 && (
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🇰🇷</span>
                        <span className="text-sm font-bold text-purple-900">KRW</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-purple-700">평가액</span>
                          <span className="text-base font-bold text-purple-900">
                            ₩{Math.round(account.krwTotalValue).toLocaleString('ko-KR')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-purple-700">수익금</span>
                          <span className={`text-sm font-bold ${account.krwTotalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {account.krwTotalProfit >= 0 ? '+' : ''}₩{Math.round(account.krwTotalProfit).toLocaleString('ko-KR')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-purple-200">
                          <span className="text-xs font-medium text-purple-700">수익률</span>
                          <span className={`text-lg font-bold ${account.krwProfitPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {account.krwProfitPercent >= 0 ? '+' : ''}{account.krwProfitPercent.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Chart */}
      <ChartCard title="자산별 수익률" subtitle="현재 보유 자산 성과 비교">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
              formatter={(value, name, props) => {
                if (name === '수익률') {
                  return [`${value}%`, `${props.payload.fullName} (${props.payload.name})`]
                }
                return [value, name]
              }}
              labelFormatter={(label) => {
                const item = performanceData.find(d => d.name === label)
                return item ? `${item.fullName} (${item.name})` : label
              }}
            />
            <Legend />
            <Bar dataKey="수익률" fill="#10b981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Search and Filter */}
      <div className="card">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="종목명 또는 심볼 검색 (예: AAPL, Bitcoin)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Filters and Sort */}
          <div className="flex flex-wrap gap-3">
            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">유형:</span>
              <div className="flex gap-2">
                {assetTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      filterType === type
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-2 ml-auto">
              <SortAsc className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">정렬:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="default">기본</option>
                <option value="value">평가액 높은순</option>
                <option value="profit">수익금 높은순</option>
                <option value="profitPercent">수익률 높은순</option>
              </select>
            </div>
          </div>

          {/* Active Filters Info */}
          {(searchQuery || filterType !== '전체' || sortBy !== 'default') && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>
                {filteredAssets.length}개 자산 표시 중
                {searchQuery && ` (검색: "${searchQuery}")`}
                {filterType !== '전체' && ` (유형: ${filterType})`}
              </span>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setFilterType('전체')
                  setSortBy('default')
                }}
                className="text-primary-600 hover:text-primary-700 underline"
              >
                초기화
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Assets Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">보유 자산</h3>
              <p className="text-sm text-gray-600 mt-1">
                전체 {assets.length}개 자산
                {lastUpdate && (
                  <span className="ml-2 text-xs text-gray-500">
                    • 마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR')}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              가져오기
            </button>
            <button
              onClick={handleCSVExport}
              className="btn-secondary flex items-center gap-2"
              disabled={assets.length === 0}
            >
              <Download className="w-4 h-4" />
              내보내기
            </button>

            {/* Selection mode toggle */}
            {!selectionMode ? (
              <button
                onClick={handleToggleSelectionMode}
                className="btn-secondary flex items-center gap-2"
                disabled={assets.length === 0}
              >
                <Trash2 className="w-4 h-4" />
                일괄 삭제
              </button>
            ) : (
              <>
                <button
                  onClick={handleBulkDelete}
                  className="btn-danger flex items-center gap-2"
                  disabled={selectedAssets.length === 0}
                >
                  <Trash2 className="w-4 h-4" />
                  삭제 ({selectedAssets.length})
                </button>
                <button
                  onClick={handleToggleSelectionMode}
                  className="btn-secondary flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  취소
                </button>
              </>
            )}

            <button onClick={handleAddAsset} className="btn-primary flex items-center gap-2">
              <PlusCircle className="w-5 h-5" />
              자산 추가
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                {selectionMode && (
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">
                    <input
                      type="checkbox"
                      checked={selectedAssets.length === filteredAssets.length && filteredAssets.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                  </th>
                )}
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">심볼</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">종목명</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">유형</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">계좌</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">통화</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">보유량</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">평균단가</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">현재가</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">평가액</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">수익금</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">수익률</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan="12" className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <Search className="w-12 h-12 mb-3 text-gray-300" />
                      <p className="text-lg font-medium">검색 결과가 없습니다</p>
                      <p className="text-sm mt-1">다른 검색어를 입력하거나 필터를 변경해보세요</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                <tr key={asset.id} className="border-b border-gray-100 hover:bg-gray-50">
                  {selectionMode && (
                    <td className="py-4 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedAssets.includes(asset.id)}
                        onChange={() => handleToggleAssetSelection(asset.id)}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                    </td>
                  )}
                  <td className="py-4 px-4">
                    <p className="font-medium text-gray-900">{asset.symbol}</p>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-sm text-gray-700">{asset.name}</p>
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-primary-50 text-primary-700">
                      {asset.type}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-blue-50 text-blue-700">
                      {asset.account || '기본계좌'}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                      {asset.currency}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right text-sm text-gray-700">
                    {asset.quantity}
                  </td>
                  <td className="py-4 px-4 text-right text-sm text-gray-700">
                    {formatCurrency(asset.avgPrice, asset.currency)}
                  </td>
                  <td className="py-4 px-4 text-right text-sm text-gray-700">
                    {formatCurrency(asset.currentPrice, asset.currency)}
                  </td>
                  <td className="py-4 px-4 text-right text-sm font-medium text-gray-900">
                    {formatCurrency(asset.totalValue, asset.currency)}
                    {asset.currency === 'KRW' && (
                      <div className="text-xs text-gray-500">
                        ${(asset.totalValue / exchangeRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right text-sm">
                    <span className={asset.profit >= 0 ? 'text-success' : 'text-danger'}>
                      {asset.profit >= 0 ? '+' : ''}{formatCurrency(asset.profit, asset.currency)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right text-sm font-medium">
                    <span className={(asset.profitPercent || 0) >= 0 ? 'text-success' : 'text-danger'}>
                      {(asset.profitPercent || 0) >= 0 ? '+' : ''}{(asset.profitPercent || 0).toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleViewDetail(asset)}
                        className="p-1 hover:bg-primary-50 rounded transition-colors"
                        title="상세 보기"
                      >
                        <Eye className="w-4 h-4 text-primary-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteAsset(asset.id)}
                        className="p-1 hover:bg-red-50 rounded transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4 text-danger" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Asset Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">자산 추가</h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  심볼 / 티커
                </label>
                <input
                  type="text"
                  name="symbol"
                  value={formData.symbol}
                  onChange={handleInputChange}
                  required
                  placeholder="예: AAPL, BTC, 삼성전자"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  자산명
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="예: Apple Inc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    자산 유형
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="주식">주식</option>
                    <option value="ETF">ETF</option>
                    <option value="코인">코인</option>
                    <option value="채권">채권</option>
                    <option value="기타">기타</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    통화
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="KRW">KRW (₩)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    계좌
                  </label>
                  <select
                    name="account"
                    value={formData.account}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="기본계좌">기본계좌</option>
                    <option value="해외계좌">해외계좌</option>
                    <option value="ISA계좌">ISA계좌</option>
                    <option value="연금계좌">연금계좌</option>
                    <option value="기타">기타</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    카테고리
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="해외주식">해외주식</option>
                    <option value="국내주식">국내주식</option>
                    <option value="암호화폐">암호화폐</option>
                    <option value="ETF">ETF</option>
                    <option value="채권">채권</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    보유 수량
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                    step="0.000001"
                    min="0"
                    placeholder="10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    평균 매수가
                  </label>
                  <input
                    type="number"
                    name="avgPrice"
                    value={formData.avgPrice}
                    onChange={handleInputChange}
                    required
                    step="0.01"
                    min="0"
                    placeholder="150.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>실시간 시세:</strong> BTC, ETH, BNB, SOL은 자동으로 실시간 가격이 업데이트됩니다.
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">📤 데이터 가져오기/내보내기</h3>
              <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Import Section */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">📥 CSV 파일 가져오기</h4>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>CSV 형식:</strong> Symbol, Name, Type, Quantity, AvgPrice, Currency
                  </p>
                  <p className="text-xs text-blue-700">
                    예시: AAPL, Apple Inc., 주식, 10, 150.50, USD
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    💡 Currency: USD (해외주식), KRW (국내주식)
                  </p>
                </div>

                <label className="btn-primary flex items-center justify-center gap-2 cursor-pointer">
                  <Upload className="w-5 h-5" />
                  CSV 파일 선택
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVImport}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Export Section */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">📤 데이터 내보내기</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleCSVExport}
                    disabled={assets.length === 0}
                    className="btn-secondary flex items-center justify-center gap-2"
                  >
                    <FileText className="w-5 h-5" />
                    CSV 다운로드
                  </button>
                  <button
                    onClick={handleJSONExport}
                    disabled={assets.length === 0}
                    className="btn-secondary flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    JSON 다운로드
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💾 백업용으로 정기적으로 데이터를 내보내기하세요
                </p>
              </div>

              {/* Template Download */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">📋 CSV 템플릿 샘플</h4>
                <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto">
{`Symbol,Name,Type,Quantity,AvgPrice,Currency
AAPL,Apple Inc.,주식,10,150.50,USD
TSLA,Tesla Inc.,주식,5,242.15,USD
005930,삼성전자,주식,20,75000,KRW
SPY,S&P 500 ETF,ETF,3,445.67,USD
BTC,Bitcoin,코인,0.1,67234,USD`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Investment Record Modal */}
      {showInvestmentModal && (
        <InvestmentRecordModal
          record={editingRecord}
          onSave={(recordData) => {
            if (editingRecord) {
              // Update existing record
              setInvestmentRecords(prev =>
                prev.map(r => r.id === editingRecord.id ? { ...recordData, id: editingRecord.id } : r)
              )
            } else {
              // Add new record
              setInvestmentRecords(prev => [...prev, { ...recordData, id: Date.now() }])
            }
            setShowInvestmentModal(false)
            setEditingRecord(null)
          }}
          onClose={() => {
            setShowInvestmentModal(false)
            setEditingRecord(null)
          }}
        />
      )}

      {/* Asset Detail Slide Panel */}
      <SlidePanel
        isOpen={showDetailPanel}
        onClose={() => setShowDetailPanel(false)}
        title={selectedAsset ? `${selectedAsset.symbol} 상세 정보` : '자산 상세'}
        width="max-w-3xl"
      >
        {selectedAsset && (
          <AssetDetailView
            asset={selectedAsset}
            exchangeRate={exchangeRate}
          />
        )}
      </SlidePanel>
    </div>
  )
}

// Investment Record Modal Component
const InvestmentRecordModal = ({ record, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    goal: record?.goal || '',
    accountNumber: record?.accountNumber || '',
    principal: record?.principal || '',
    remaining: record?.remaining || '',
    note: record?.note || ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      goal: formData.goal,
      accountNumber: formData.accountNumber,
      principal: parseFloat(formData.principal) || 0,
      remaining: parseFloat(formData.remaining) || 0,
      note: formData.note
    })
  }

  // Calculate auto values for preview
  const investmentAmount = (parseFloat(formData.principal) || 0) - (parseFloat(formData.remaining) || 0)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {record ? '투자 항목 수정' : '투자 항목 추가'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">투자 목표 및 계좌 정보를 입력하세요</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Goal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              목표 / 상품명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="goal"
              value={formData.goal}
              onChange={handleChange}
              required
              placeholder="예: 은퇴 자금, S&P500 ETF 장기투자"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              계좌번호 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleChange}
              required
              placeholder="예: 기본계좌, 해외계좌, ISA계좌"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 포트폴리오의 계좌명과 일치해야 평가금액이 자동 연동됩니다
            </p>
          </div>

          {/* Principal and Remaining */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                원금 (원) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="principal"
                value={formData.principal}
                onChange={handleChange}
                required
                step="1"
                min="0"
                placeholder="10000000"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">수동 입력</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                잔여금 (원) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="remaining"
                value={formData.remaining}
                onChange={handleChange}
                required
                step="1"
                min="0"
                placeholder="2000000"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">수동 입력</p>
            </div>
          </div>

          {/* Auto-calculated Investment Amount Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">투자금 (자동 계산)</span>
              <span className="text-lg font-bold text-blue-900">
                {new Intl.NumberFormat('ko-KR').format(investmentAmount)}원
              </span>
            </div>
            <p className="text-xs text-blue-700 mt-1">= 원금 - 잔여금</p>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              비고
            </label>
            <textarea
              name="note"
              value={formData.note}
              onChange={handleChange}
              rows="3"
              placeholder="메모나 특이사항을 입력하세요"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">수동 입력 (선택사항)</p>
          </div>

          {/* Info Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-900 font-medium mb-2">📊 자동 계산 항목 안내</p>
            <ul className="text-xs text-amber-800 space-y-1">
              <li>• <strong>투자금</strong>: 원금 - 잔여금</li>
              <li>• <strong>평가금액</strong>: 포트폴리오에서 해당 계좌의 자산 평가액 합계 (원화 환산)</li>
              <li>• <strong>손익</strong>: 평가금액 - 투자금</li>
            </ul>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary"
            >
              {record ? '수정 완료' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Portfolio
