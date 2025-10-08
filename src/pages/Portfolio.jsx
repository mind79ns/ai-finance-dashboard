import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { PlusCircle, Edit2, Trash2, X, RefreshCw, Eye, Search, Filter, SortAsc, Upload, Download, FileText } from 'lucide-react'
import ChartCard from '../components/ChartCard'
import SlidePanel from '../components/SlidePanel'
import AssetDetailView from '../components/AssetDetailView'
import marketDataService from '../services/marketDataService'

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
  }, [])

  // Fetch real-time prices for ALL assets (stocks, ETFs, crypto)
  useEffect(() => {
    const updatePrices = async () => {
      try {
        setLoading(true)
        const marketData = await marketDataService.getAllMarketData()

        // Update exchange rate
        if (marketData.currency?.usdKrw) {
          setExchangeRate(marketData.currency.usdKrw.rate)
        }

        // Get list of USD stock/ETF symbols to fetch (skip KRW assets)
        const stockSymbols = assets
          .filter(asset =>
            (asset.type === '주식' || asset.type === 'ETF') &&
            asset.currency === 'USD'
          )
          .map(asset => asset.symbol)

        // Fetch stock prices from Finnhub (USD only)
        let stockPrices = {}
        if (stockSymbols.length > 0) {
          stockPrices = await marketDataService.getMultipleStockPrices(stockSymbols)
        }

        // Update all asset prices
        const updatedAssets = assets.map(asset => {
          let currentPrice = asset.currentPrice

          // Update USD stock/ETF prices from Finnhub
          if ((asset.type === '주식' || asset.type === 'ETF') &&
              asset.currency === 'USD' &&
              stockPrices[asset.symbol]) {
            currentPrice = stockPrices[asset.symbol].price
            console.log(`📊 Updated ${asset.symbol}: $${currentPrice}`)
          }
          // KRW assets: keep current price as-is (manual update required)
          else if (asset.currency === 'KRW') {
            // Korean stocks/ETFs need manual price updates or alternative API
            console.log(`⏭️ Skipping KRW asset ${asset.symbol} (manual update required)`)
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
    수익률: parseFloat(asset.profitPercent.toFixed(2))
  }))

  const totalValue = assets.reduce((sum, asset) => sum + asset.totalValue, 0)
  const totalProfit = assets.reduce((sum, asset) => sum + asset.profit, 0)
  const avgProfitPercent = totalValue > totalProfit ? (totalProfit / (totalValue - totalProfit)) * 100 : 0

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
    reader.onload = (e) => {
      try {
        const text = e.target.result
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

    reader.readAsText(file, 'UTF-8')
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

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">총 평가액</p>
          <p className="text-3xl font-bold text-gray-900">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            ₩{(totalValue * exchangeRate).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">총 수익금</p>
          <p className={`text-3xl font-bold ${totalProfit >= 0 ? 'text-success' : 'text-danger'}`}>
            {totalProfit >= 0 ? '+' : ''}${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {totalProfit >= 0 ? '+' : ''}₩{(totalProfit * exchangeRate).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">평균 수익률</p>
          <p className={`text-3xl font-bold ${avgProfitPercent >= 0 ? 'text-success' : 'text-danger'}`}>
            {avgProfitPercent >= 0 ? '+' : ''}{avgProfitPercent.toFixed(2)}%
          </p>
        </div>
      </div>

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
            <h3 className="text-lg font-semibold text-gray-900">보유 자산</h3>
            <p className="text-sm text-gray-600 mt-1">전체 {assets.length}개 자산</p>
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
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">종목</th>
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
                  <td colSpan="10" className="py-12 text-center">
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
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{asset.symbol}</p>
                      <p className="text-sm text-gray-600">{asset.name}</p>
                    </div>
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
                    <span className={asset.profitPercent >= 0 ? 'text-success' : 'text-danger'}>
                      {asset.profitPercent >= 0 ? '+' : ''}{asset.profitPercent.toFixed(2)}%
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

export default Portfolio
