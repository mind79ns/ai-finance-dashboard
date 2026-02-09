import { useState, useEffect, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { PlusCircle, Edit2, Trash2, X, RefreshCw, Eye, Search, Filter, SortAsc, Upload, Download, FileText } from 'lucide-react'
import ChartCard from '../components/ChartCard'
import SlidePanel from '../components/SlidePanel'
import AssetDetailView from '../components/AssetDetailView'
import marketDataService from '../services/marketDataService'
import kisService from '../services/kisService'
import dataSync from '../utils/dataSync'

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
    customAccountName: '',
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

  // Investment Management - Account-based principal/deposit tracking
  const [accountPrincipals, setAccountPrincipals] = useState({}) // { accountName: { principal, remaining, note } }
  const [showPrincipalModal, setShowPrincipalModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const skipPriceUpdateRef = useRef(false)

  // Load portfolio assets and account principals on mount (with Supabase sync)
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load portfolio assets (Supabase → localStorage fallback)
        const loadedAssets = await dataSync.loadPortfolioAssets()
        setAssets(loadedAssets)

        // Load account principals (Supabase → localStorage fallback)
        const loadedPrincipals = await dataSync.loadAccountPrincipals()
        setAccountPrincipals(loadedPrincipals)
      } catch (error) {
        console.error('Failed to load data:', error)
        // Fallback to empty state - app still works
        setAssets([])
        setAccountPrincipals({})
      }
    }

    loadData()
  }, [])

  // Save account principals to localStorage + Supabase
  useEffect(() => {
    // Only sync if we have data (avoid syncing on initial empty state)
    if (Object.keys(accountPrincipals).length === 0) return

    // Sync each account principal to localStorage + Supabase
    Object.entries(accountPrincipals).forEach(async ([accountName, principalData]) => {
      await dataSync.saveAccountPrincipal(accountName, principalData)
    })
  }, [accountPrincipals])

  // Fetch real-time prices for ALL assets (stocks, ETFs, crypto)
  useEffect(() => {
    if (assets.length === 0) {
      skipPriceUpdateRef.current = false
      return
    }

    if (skipPriceUpdateRef.current) {
      skipPriceUpdateRef.current = false
      return
    }

    let cancelled = false

    const updatePrices = async () => {
      // Skip if no assets loaded yet
      if (assets.length === 0) {
        return
      }

      try {
        setLoading(true)
        const marketData = await marketDataService.getAllMarketData()

        let nextExchangeRate = exchangeRate

        // Update exchange rate
        if (marketData?.currency?.usdKrw?.rate) {
          nextExchangeRate = marketData.currency.usdKrw.rate
          setExchangeRate(nextExchangeRate)
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
          let dailyChangePercent = asset.dailyChangePercent || 0 // 당일 변동률

          // Update USD stock/ETF prices from Finnhub
          if ((asset.type === '주식' || asset.type === 'ETF') &&
            asset.currency === 'USD' &&
            usdStockPrices[asset.symbol]) {
            currentPrice = usdStockPrices[asset.symbol].price
            // Finnhub도 changePercent 제공하면 저장
            if (usdStockPrices[asset.symbol].changePercent !== undefined) {
              dailyChangePercent = usdStockPrices[asset.symbol].changePercent
            }
            console.log(`📊 Finnhub: ${asset.symbol} = $${currentPrice}`)
          }
          // Update KRW stock/ETF prices from 한국투자증권
          else if ((asset.type === '주식' || asset.type === 'ETF') &&
            asset.currency === 'KRW' &&
            krwStockPrices[asset.symbol]) {
            currentPrice = krwStockPrices[asset.symbol].price
            dailyChangePercent = krwStockPrices[asset.symbol].changePercent || 0
            console.log(`📊 KIS: ${asset.symbol} = ₩${currentPrice} (${dailyChangePercent > 0 ? '+' : ''}${dailyChangePercent.toFixed(2)}%)`)
          }
          // Update crypto prices from CoinGecko
          else if (asset.symbol === 'BTC' && marketData.crypto?.bitcoin) {
            currentPrice = marketData.crypto.bitcoin.price
            dailyChangePercent = marketData.crypto.bitcoin.change24h || 0
          }
          else if (asset.symbol === 'ETH' && marketData.crypto?.ethereum) {
            currentPrice = marketData.crypto.ethereum.price
            dailyChangePercent = marketData.crypto.ethereum.change24h || 0
          }
          else if (asset.symbol === 'BNB' && marketData.crypto?.binancecoin) {
            currentPrice = marketData.crypto.binancecoin.price
            dailyChangePercent = marketData.crypto.binancecoin.change24h || 0
          }
          else if (asset.symbol === 'SOL' && marketData.crypto?.solana) {
            currentPrice = marketData.crypto.solana.price
            dailyChangePercent = marketData.crypto.solana.change24h || 0
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
            profitPercent,
            dailyChangePercent // 당일 변동률 저장
          }
        })

        if (!cancelled) {
          skipPriceUpdateRef.current = true
          setAssets(updatedAssets)
          // Sync price updates to localStorage + Supabase
          await dataSync.savePortfolioAssets(updatedAssets, { exchangeRate: nextExchangeRate })
          setLastUpdate(new Date())
        }
      } catch (error) {
        console.error('Price update error:', error)
      } finally {
        setLoading(false)
      }
    }

    updatePrices()
    // Auto-refresh every 2 minutes
    const interval = setInterval(updatePrices, 120000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [assets])

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

  // 계좌 목록 추출 (실제 보유 자산의 계좌)
  const accountOptions = Array.from(new Set(assets.map(asset => asset.account || '기본계좌')))

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
      account: accountOptions.length > 0 ? accountOptions[0] : '기본계좌',
      customAccountName: '',
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

  const handleSubmit = async (e) => {
    e.preventDefault()

    // 계좌 검증 - 신규 계좌 직접 입력인 경우
    if (formData.account === '__custom__' && !formData.customAccountName.trim()) {
      alert('신규 계좌 이름을 입력해주세요.')
      return
    }

    const quantity = parseFloat(formData.quantity)
    const avgPrice = parseFloat(formData.avgPrice)
    const totalValue = quantity * avgPrice

    // 계좌 결정: __custom__ 선택시 customAccountName 사용
    const finalAccount = formData.account === '__custom__'
      ? formData.customAccountName.trim()
      : formData.account

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
      account: finalAccount,
      category: formData.category
    }

    // Add asset using dataSync (localStorage + Supabase)
    await dataSync.addPortfolioAsset(newAsset)

    // Update local state
    const updatedAssets = [...assets, newAsset]
    setAssets(updatedAssets)
    handleCloseModal()
  }

  const handleDeleteAsset = async (id) => {
    if (window.confirm('이 자산을 삭제하시겠습니까?')) {
      // Delete using dataSync (localStorage + Supabase)
      await dataSync.deletePortfolioAsset(id)

      // Update local state
      const updatedAssets = assets.filter(asset => asset.id !== id)
      setAssets(updatedAssets)
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
  const handleBulkDelete = async () => {
    if (selectedAssets.length === 0) {
      alert('삭제할 자산을 선택해주세요.')
      return
    }

    if (window.confirm(`선택한 ${selectedAssets.length}개의 자산을 삭제하시겠습니까?`)) {
      // Bulk delete using dataSync (localStorage + Supabase)
      await dataSync.bulkDeletePortfolioAssets(selectedAssets)

      // Update local state
      const updatedAssets = assets.filter(asset => !selectedAssets.includes(asset.id))
      setAssets(updatedAssets)
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
    reader.onload = async (e) => {
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

            let accountType, symbol, name, type, quantity, avgPrice, currency

            // Brokerage format: Account Number,Account Type,Symbol,Name,Type,Quantity,AvgPrice,Type
            if (header.includes('account number')) {
              [, accountType, symbol, name, type, quantity, avgPrice, currency] = columns
            }
            // Simple format: Symbol,Name,Type,Quantity,AvgPrice,Currency,Account,Category
            else {
              const [sym, nm, tp, qty, price, curr, acc] = columns
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

          // Save imported assets using dataSync (localStorage + Supabase)
          await dataSync.savePortfolioAssets(updatedAssets)

          setAssets(updatedAssets)
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
    <div className="cyber-dashboard min-h-screen p-4 sm:p-6 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold neon-text-cyan">포트폴리오</h2>
          {lastUpdate && (
            <p className="text-xs sm:text-sm text-cyan-300/60 mt-1">
              마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right mr-2 sm:mr-3">
            <p className="text-xs text-cyan-300/60">환율 (USD/KRW)</p>
            <p className="text-sm font-medium text-cyan-300">₩{exchangeRate.toLocaleString()}</p>
          </div>
          {loading && <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />}
        </div>
      </div>

      {/* Portfolio Summary - Premium Design */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* 총 평가액 (원화 기준 통합) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 p-4 sm:p-6 shadow-xl">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white opacity-10"></div>
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 h-32 w-32 rounded-full bg-white opacity-5"></div>
          <div className="relative">
            <p className="text-xs sm:text-sm font-medium text-blue-100 mb-2">총 평가액 (원화 통합)</p>
            <p className="text-2xl sm:text-4xl font-bold text-white mb-3 sm:mb-4">
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
        <div className={`relative overflow-hidden rounded-2xl p-4 sm:p-6 shadow-xl ${totalProfitKRW >= 0
          ? 'bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700'
          : 'bg-gradient-to-br from-red-500 via-rose-600 to-pink-700'
          }`}>
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white opacity-10"></div>
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 h-32 w-32 rounded-full bg-white opacity-5"></div>
          <div className="relative">
            <p className={`text-xs sm:text-sm font-medium mb-2 ${totalProfitKRW >= 0 ? 'text-emerald-100' : 'text-red-100'}`}>
              총 수익금 (원화 통합)
            </p>
            <p className="text-2xl sm:text-4xl font-bold text-white mb-3 sm:mb-4">
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
        <div className={`relative overflow-hidden rounded-2xl p-4 sm:p-6 shadow-xl ${totalAvgProfitPercent >= 0
          ? 'bg-gradient-to-br from-purple-500 via-violet-600 to-indigo-700'
          : 'bg-gradient-to-br from-orange-500 via-amber-600 to-yellow-700'
          }`}>
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white opacity-10"></div>
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 h-32 w-32 rounded-full bg-white opacity-5"></div>
          <div className="relative">
            <p className={`text-xs sm:text-sm font-medium mb-2 ${totalAvgProfitPercent >= 0 ? 'text-purple-100' : 'text-orange-100'}`}>
              평균 수익률
            </p>
            <p className="text-2xl sm:text-4xl font-bold text-white mb-3 sm:mb-4">
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

      {/* Investment Management Table - Account Based */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h3 className="text-base sm:text-xl font-bold text-gray-900">투자 관리표</h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">계좌별 투자 원금 및 손익 현황</p>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="block sm:hidden space-y-3">
          {accountSummary.length === 0 ? (
            <div className="py-12 text-center">
              <div className="flex flex-col items-center justify-center text-gray-500">
                <FileText className="w-12 h-12 mb-3 text-gray-300" />
                <p className="text-base font-medium">보유 자산이 없습니다</p>
                <p className="text-sm mt-1">먼저 포트폴리오에 자산을 추가하세요</p>
              </div>
            </div>
          ) : (
            <>
              {accountSummary.map((account, index) => {
                const principalData = accountPrincipals[account.account] || { principal: 0, remaining: 0, note: '' }
                const investmentAmount = account.assets.reduce((sum, asset) => {
                  const investedValue = asset.quantity * asset.avgPrice
                  if (asset.currency === 'KRW') {
                    return sum + investedValue
                  } else if (asset.currency === 'USD') {
                    return sum + (investedValue * exchangeRate)
                  }
                  return sum
                }, 0)
                const evaluationKRW = account.assets.reduce((sum, asset) => {
                  const currentValue = asset.quantity * asset.currentPrice
                  if (asset.currency === 'KRW') {
                    return sum + currentValue
                  } else if (asset.currency === 'USD') {
                    return sum + (currentValue * exchangeRate)
                  }
                  return sum
                }, 0)
                const profit = evaluationKRW - investmentAmount

                return (
                  <div key={account.account} className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900">{account.account}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{account.assets.length}개 자산 보유</p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingAccount(account.account)
                          setShowPrincipalModal(true)
                        }}
                        className="p-1.5 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
                        title="원금/예수금 입력"
                      >
                        <Edit2 className="w-4 h-4 text-primary-600" />
                      </button>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">원금</span>
                        <span className="font-medium text-gray-900">
                          {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(principalData.principal)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">예수금(잔여)</span>
                        <span className="font-medium text-gray-900">
                          {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(principalData.remaining)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-200">
                        <span className="text-gray-700 font-medium">투자금</span>
                        <span className="font-bold text-gray-900">
                          {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(investmentAmount))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-medium">평가금액</span>
                        <span className="font-bold text-gray-900">
                          {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(evaluationKRW))}
                        </span>
                      </div>
                      <div className="flex justify-between pb-2 border-b border-gray-200">
                        <span className="text-gray-700 font-medium">손익</span>
                        <span className={`font-bold text-sm ${profit >= 0 ? 'text-success' : 'text-danger'}`}>
                          {profit >= 0 ? '+' : ''}{new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(profit))}
                        </span>
                      </div>
                      {principalData.note && (
                        <div className="pt-2">
                          <span className="text-gray-600">비고: </span>
                          <span className="text-gray-700">{principalData.note}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* TOTAL Card */}
              <div className="border-2 border-blue-300 rounded-lg p-3 bg-blue-50">
                <p className="text-sm font-bold text-blue-900 mb-3 text-center">TOTAL</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-blue-700 font-medium">원금 합계</span>
                    <span className="font-bold text-blue-900">
                      {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(
                        accountSummary.reduce((sum, acc) => {
                          const data = accountPrincipals[acc.account] || { principal: 0 }
                          return sum + data.principal
                        }, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700 font-medium">예수금 합계</span>
                    <span className="font-bold text-blue-900">
                      {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(
                        accountSummary.reduce((sum, acc) => {
                          const data = accountPrincipals[acc.account] || { remaining: 0 }
                          return sum + data.remaining
                        }, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-blue-300">
                    <span className="text-blue-800 font-bold">총 투자금</span>
                    <span className="font-bold text-blue-900">
                      {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(
                        Math.round(accountSummary.reduce((sum, acc) => {
                          return sum + acc.assets.reduce((assetSum, asset) => {
                            const investedValue = asset.quantity * asset.avgPrice
                            if (asset.currency === 'KRW') {
                              return assetSum + investedValue
                            } else if (asset.currency === 'USD') {
                              return assetSum + (investedValue * exchangeRate)
                            }
                            return assetSum
                          }, 0)
                        }, 0))
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-800 font-bold">총 평가금액</span>
                    <span className="font-bold text-blue-900">
                      {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(totalValueKRW))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-800 font-bold">총 손익</span>
                    <span className={`font-bold text-sm ${(() => {
                      const totalInvestment = accountSummary.reduce((sum, acc) => {
                        return sum + acc.assets.reduce((assetSum, asset) => {
                          const investedValue = asset.quantity * asset.avgPrice
                          if (asset.currency === 'KRW') {
                            return assetSum + investedValue
                          } else if (asset.currency === 'USD') {
                            return assetSum + (investedValue * exchangeRate)
                          }
                          return assetSum
                        }, 0)
                      }, 0)
                      const totalProfit = totalValueKRW - totalInvestment
                      return totalProfit >= 0 ? 'text-success' : 'text-danger'
                    })()}`}>
                      {(() => {
                        const totalInvestment = accountSummary.reduce((sum, acc) => {
                          return sum + acc.assets.reduce((assetSum, asset) => {
                            const investedValue = asset.quantity * asset.avgPrice
                            if (asset.currency === 'KRW') {
                              return assetSum + investedValue
                            } else if (asset.currency === 'USD') {
                              return assetSum + (investedValue * exchangeRate)
                            }
                            return assetSum
                          }, 0)
                        }, 0)
                        const totalProfit = totalValueKRW - totalInvestment
                        return `${totalProfit >= 0 ? '+' : ''}${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(totalProfit))}`
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-100 border-b border-blue-200">
                <th className="text-center py-3 px-4 font-bold text-blue-900">No.</th>
                <th className="text-left py-3 px-4 font-bold text-blue-900">계좌명</th>
                <th className="text-right py-3 px-4 font-bold text-blue-900">원금</th>
                <th className="text-right py-3 px-4 font-bold text-blue-900">예수금(잔여)</th>
                <th className="text-right py-3 px-4 font-bold text-blue-900 bg-blue-200">투자금</th>
                <th className="text-right py-3 px-4 font-bold text-blue-900 bg-blue-200">평가금액(원)</th>
                <th className="text-right py-3 px-4 font-bold text-blue-900 bg-blue-200">손익</th>
                <th className="text-left py-3 px-4 font-bold text-blue-900">비고</th>
                <th className="text-center py-3 px-4 font-bold text-blue-900">관리</th>
              </tr>
            </thead>
            <tbody>
              {accountSummary.map((account, index) => {
                // Get principal/remaining data for this account
                const principalData = accountPrincipals[account.account] || { principal: 0, remaining: 0, note: '' }

                // Calculate investment amount: 보유량 * 평균단가 (actual invested amount)
                const investmentAmount = account.assets.reduce((sum, asset) => {
                  const investedValue = asset.quantity * asset.avgPrice
                  if (asset.currency === 'KRW') {
                    return sum + investedValue
                  } else if (asset.currency === 'USD') {
                    return sum + (investedValue * exchangeRate)
                  }
                  return sum
                }, 0)

                // Calculate evaluation amount: 보유량 * 현재가 (current market value)
                const evaluationKRW = account.assets.reduce((sum, asset) => {
                  const currentValue = asset.quantity * asset.currentPrice
                  if (asset.currency === 'KRW') {
                    return sum + currentValue
                  } else if (asset.currency === 'USD') {
                    return sum + (currentValue * exchangeRate)
                  }
                  return sum
                }, 0)

                // Calculate profit: 평가금액 - 투자금
                const profit = evaluationKRW - investmentAmount

                return (
                  <tr key={account.account} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="text-center py-3 px-4 text-gray-900">{index + 1}</td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{account.account}</p>
                        <p className="text-xs text-gray-500">{account.assets.length}개 자산 보유</p>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 text-gray-900">
                      {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(principalData.principal)}
                    </td>
                    <td className="text-right py-3 px-4 text-gray-900">
                      {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(principalData.remaining)}
                    </td>
                    <td className="text-right py-3 px-4 font-bold text-gray-900 bg-blue-50">
                      {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(investmentAmount))}
                    </td>
                    <td className="text-right py-3 px-4 font-bold text-gray-900 bg-blue-50">
                      {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(evaluationKRW))}
                    </td>
                    <td className={`text-right py-3 px-4 font-bold bg-blue-50 ${profit >= 0 ? 'text-success' : 'text-danger'}`}>
                      {profit >= 0 ? '+' : ''}{new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(profit))}
                    </td>
                    <td className="py-3 px-4 text-gray-700 text-xs">{principalData.note || '-'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingAccount(account.account)
                            setShowPrincipalModal(true)
                          }}
                          className="p-1 hover:bg-blue-50 rounded transition-colors"
                          title="원금/예수금 입력"
                        >
                          <Edit2 className="w-4 h-4 text-primary-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {/* TOTAL Row */}
              {accountSummary.length > 0 && (
                <tr className="bg-blue-200 border-t-2 border-blue-300 font-bold">
                  <td colSpan="2" className="text-center py-3 px-4 text-blue-900">TOTAL</td>
                  <td className="text-right py-3 px-4 text-blue-900">
                    {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(
                      accountSummary.reduce((sum, acc) => {
                        const data = accountPrincipals[acc.account] || { principal: 0 }
                        return sum + data.principal
                      }, 0)
                    )}
                  </td>
                  <td className="text-right py-3 px-4 text-blue-900">
                    {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(
                      accountSummary.reduce((sum, acc) => {
                        const data = accountPrincipals[acc.account] || { remaining: 0 }
                        return sum + data.remaining
                      }, 0)
                    )}
                  </td>
                  <td className="text-right py-3 px-4 text-blue-900">
                    {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(
                      Math.round(accountSummary.reduce((sum, acc) => {
                        // Calculate total investment: 보유량 * 평균단가
                        return sum + acc.assets.reduce((assetSum, asset) => {
                          const investedValue = asset.quantity * asset.avgPrice
                          if (asset.currency === 'KRW') {
                            return assetSum + investedValue
                          } else if (asset.currency === 'USD') {
                            return assetSum + (investedValue * exchangeRate)
                          }
                          return assetSum
                        }, 0)
                      }, 0))
                    )}
                  </td>
                  <td className="text-right py-3 px-4 text-blue-900">
                    {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(totalValueKRW))}
                  </td>
                  <td className="text-right py-3 px-4 text-blue-900">
                    {(() => {
                      // Total investment from all assets (보유량 * 평균단가)
                      const totalInvestment = accountSummary.reduce((sum, acc) => {
                        return sum + acc.assets.reduce((assetSum, asset) => {
                          const investedValue = asset.quantity * asset.avgPrice
                          if (asset.currency === 'KRW') {
                            return assetSum + investedValue
                          } else if (asset.currency === 'USD') {
                            return assetSum + (investedValue * exchangeRate)
                          }
                          return assetSum
                        }, 0)
                      }, 0)
                      const totalProfit = totalValueKRW - totalInvestment
                      return (
                        <span className={totalProfit >= 0 ? 'text-success' : 'text-danger'}>
                          {totalProfit >= 0 ? '+' : ''}{new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(totalProfit))}
                        </span>
                      )
                    })()}
                  </td>
                  <td colSpan="2"></td>
                </tr>
              )}

              {accountSummary.length === 0 && (
                <tr>
                  <td colSpan="9" className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <FileText className="w-12 h-12 mb-3 text-gray-300" />
                      <p className="text-lg font-medium">보유 자산이 없습니다</p>
                      <p className="text-sm mt-1">먼저 포트폴리오에 자산을 추가하세요</p>
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
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">계좌별 현황</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">계좌별 평가액 및 수익 분석 (USD/KRW 분리)</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accountSummary.map((account) => (
              <div key={account.account} className="relative overflow-hidden rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow duration-300">
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
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🇺🇸</span>
                        <span className="text-sm font-bold text-blue-900 dark:text-blue-200">USD</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">평가액</span>
                          <span className="text-base font-bold text-blue-900 dark:text-blue-100">
                            ${account.usdTotalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">수익금</span>
                          <span className={`text-sm font-bold ${account.usdTotalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {account.usdTotalProfit >= 0 ? '+' : ''}${account.usdTotalProfit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-blue-200 dark:border-blue-700">
                          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">수익률</span>
                          <span className={`text-lg font-bold ${account.usdProfitPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {account.usdProfitPercent >= 0 ? '+' : ''}{account.usdProfitPercent.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KRW 자산 */}
                  {account.krwTotalValue > 0 && (
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg p-4 border border-purple-100 dark:border-purple-800">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🇰🇷</span>
                        <span className="text-sm font-bold text-purple-900 dark:text-purple-200">KRW</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-purple-700 dark:text-purple-300">평가액</span>
                          <span className="text-base font-bold text-purple-900 dark:text-purple-100">
                            ₩{Math.round(account.krwTotalValue).toLocaleString('ko-KR')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-purple-700 dark:text-purple-300">수익금</span>
                          <span className={`text-sm font-bold ${account.krwTotalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {account.krwTotalProfit >= 0 ? '+' : ''}₩{Math.round(account.krwTotalProfit).toLocaleString('ko-KR')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-purple-200 dark:border-purple-700">
                          <span className="text-xs font-medium text-purple-700 dark:text-purple-300">수익률</span>
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
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            {/* Type Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-gray-700">유형:</span>
              <div className="flex flex-wrap gap-2">
                {assetTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-2.5 sm:px-3 py-1 text-xs sm:text-sm rounded-lg transition-colors min-h-[32px] ${filterType === type
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
            <div className="flex items-center gap-2 sm:ml-auto">
              <SortAsc className="w-4 h-4 text-gray-600 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-gray-700">정렬:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2.5 sm:px-3 py-1.5 sm:py-1 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[32px]"
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
        <div className="flex flex-col gap-3 mb-4 sm:mb-6">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">보유 자산</h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              전체 {assets.length}개 자산
              {lastUpdate && (
                <span className="ml-2 text-xs text-gray-500 hidden sm:inline">
                  • 마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR')}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="btn-secondary flex items-center gap-2 text-xs sm:text-sm"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">가져오기</span>
              <span className="sm:hidden">가져오기</span>
            </button>
            <button
              onClick={handleCSVExport}
              className="btn-secondary flex items-center gap-2 text-xs sm:text-sm"
              disabled={assets.length === 0}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">내보내기</span>
              <span className="sm:hidden">내보내기</span>
            </button>

            {/* Selection mode toggle */}
            {!selectionMode ? (
              <button
                onClick={handleToggleSelectionMode}
                className="btn-secondary flex items-center gap-2 text-xs sm:text-sm"
                disabled={assets.length === 0}
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">일괄 삭제</span>
                <span className="sm:hidden">삭제</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleBulkDelete}
                  className="btn-danger flex items-center gap-2 text-xs sm:text-sm"
                  disabled={selectedAssets.length === 0}
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">삭제 ({selectedAssets.length})</span>
                  <span className="sm:hidden">삭제</span>
                </button>
                <button
                  onClick={handleToggleSelectionMode}
                  className="btn-secondary flex items-center gap-2 text-xs sm:text-sm"
                >
                  <X className="w-4 h-4" />
                  취소
                </button>
              </>
            )}

            <button onClick={handleAddAsset} className="btn-primary flex items-center gap-2 text-xs sm:text-sm">
              <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">자산 추가</span>
              <span className="sm:hidden">추가</span>
            </button>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="block sm:hidden space-y-3">
          {filteredAssets.length === 0 ? (
            <div className="py-12 text-center">
              <div className="flex flex-col items-center justify-center text-gray-500">
                <Search className="w-12 h-12 mb-3 text-gray-300" />
                <p className="text-base font-medium">검색 결과가 없습니다</p>
                <p className="text-sm mt-1">다른 검색어를 입력하거나 필터를 변경해보세요</p>
              </div>
            </div>
          ) : (
            filteredAssets.map((asset) => {
              const positive = (asset.profitPercent || 0) >= 0
              return (
                <div key={asset.id} className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-md transition-shadow">
                  {/* Header with symbol, name, and selection checkbox */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {selectionMode && (
                        <input
                          type="checkbox"
                          checked={selectedAssets.includes(asset.id)}
                          onChange={() => handleToggleAssetSelection(asset.id)}
                          className="mt-0.5 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{asset.symbol}</p>
                        <p className="text-xs text-gray-600 truncate mt-0.5">{asset.name}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="inline-block px-1.5 py-0.5 text-xs font-medium rounded bg-primary-50 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300">
                            {asset.type}
                          </span>
                          <span className="inline-block px-1.5 py-0.5 text-xs font-medium rounded bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                            {asset.account || '기본계좌'}
                          </span>
                          <span className="inline-block px-1.5 py-0.5 text-xs font-medium rounded bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200">
                            {asset.currency}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Profit percentage badge */}
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg flex-shrink-0 ml-2 ${positive ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-rose-50 dark:bg-rose-900/30'
                      }`}>
                      <span className={`text-base font-bold ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {(asset.profitPercent || 0) >= 0 ? '+' : ''}{(asset.profitPercent || 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Key metrics */}
                  <div className="grid grid-cols-2 gap-2 py-2 border-t border-gray-200 text-xs">
                    <div>
                      <span className="text-gray-600">보유량</span>
                      <p className="font-medium text-gray-900 mt-0.5">{asset.quantity}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-600">평가액</span>
                      <p className="font-bold text-gray-900 mt-0.5">{formatCurrency(asset.totalValue, asset.currency)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">평균단가</span>
                      <p className="font-medium text-gray-900 mt-0.5">{formatCurrency(asset.avgPrice, asset.currency)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-600">현재가</span>
                      <p className="font-medium text-gray-900 mt-0.5">{formatCurrency(asset.currentPrice, asset.currency)}</p>
                    </div>
                  </div>

                  {/* Profit display */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="text-xs text-gray-600">수익금</span>
                    <span className={`text-sm font-bold ${asset.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                      {asset.profit >= 0 ? '+' : ''}{formatCurrency(asset.profit, asset.currency)}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-200 mt-3">
                    <button
                      onClick={() => handleViewDetail(asset)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg transition-colors text-xs font-medium"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      상세
                    </button>
                    <button
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors text-xs font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      삭제
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
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
                    {accountOptions.length > 0 ? (
                      accountOptions.map(account => (
                        <option key={account} value={account}>
                          {account}
                        </option>
                      ))
                    ) : (
                      <option value="기본계좌">기본계좌</option>
                    )}
                    <option value="__custom__">신규 계좌 직접 입력</option>
                  </select>
                  {formData.account === '__custom__' && (
                    <input
                      type="text"
                      name="customAccountName"
                      placeholder="신규 계좌 이름 입력"
                      value={formData.customAccountName}
                      onChange={handleInputChange}
                      required
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  )}
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

      {/* Account Principal Modal */}
      {showPrincipalModal && editingAccount && (
        <AccountPrincipalModal
          accountName={editingAccount}
          principalData={accountPrincipals[editingAccount] || { principal: 0, remaining: 0, note: '' }}
          onSave={(data) => {
            setAccountPrincipals(prev => ({
              ...prev,
              [editingAccount]: data
            }))
            setShowPrincipalModal(false)
            setEditingAccount(null)
          }}
          onClose={() => {
            setShowPrincipalModal(false)
            setEditingAccount(null)
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

// Account Principal Modal Component
const AccountPrincipalModal = ({ accountName, principalData, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    principal: principalData.principal || 0,
    remaining: principalData.remaining || 0,
    note: principalData.note || ''
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
      principal: parseFloat(formData.principal) || 0,
      remaining: parseFloat(formData.remaining) || 0,
      note: formData.note
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">
                {accountName} - 원금/예수금 관리
              </h3>
              <p className="text-sm text-blue-100 mt-1">투자 원금 및 잔여 예수금을 입력하세요</p>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
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
              <p className="text-xs text-gray-500 mt-1">초기 투입 금액</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                예수금 (원) <span className="text-red-500">*</span>
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
              <p className="text-xs text-gray-500 mt-1">현재 잔여 금액</p>
            </div>
          </div>

          {/* Info about manual input */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-1">📝 원금/예수금은 참고용 입력값입니다</p>
            <p className="text-xs text-blue-700">
              실제 투자금과 평가금액은 포트폴리오의 보유 자산 데이터에서 자동 계산됩니다
            </p>
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
          </div>

          {/* Info Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-900 font-medium mb-2">📊 자동 계산 항목 안내</p>
            <ul className="text-xs text-amber-800 space-y-1">
              <li>• <strong>투자금</strong>: 이 계좌 보유 자산의 총 매수금액 (보유량 × 평균단가)</li>
              <li>• <strong>평가금액</strong>: 이 계좌 보유 자산의 현재 시가총액 (보유량 × 현재가)</li>
              <li>• <strong>손익</strong>: 평가금액 - 투자금 (실제 수익/손실)</li>
              <li className="pt-1 border-t border-amber-300 mt-2">💡 USD 자산은 실시간 환율로 원화 환산됩니다</li>
            </ul>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
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
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Portfolio
