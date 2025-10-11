import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle, Info } from 'lucide-react'
import marketDataService from '../services/marketDataService'

const Market = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [marketData, setMarketData] = useState(null)
  const [activeCategory, setActiveCategory] = useState('all') // all, stocks, crypto, currency

  const fetchMarketData = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await marketDataService.getAllMarketData()
      setMarketData(data)
      setLastUpdate(new Date(data.lastUpdated))
    } catch (err) {
      console.error('Market data error:', err)
      setError('실시간 데이터를 가져오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMarketData()

    // Auto refresh every 2 minutes
    const interval = setInterval(fetchMarketData, 120000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = () => {
    fetchMarketData()
  }

  if (loading && !marketData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">실시간 시장 데이터 로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
          <p className="text-gray-900 font-medium mb-2">데이터 로드 실패</p>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={handleRefresh} className="btn-primary">
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  const stockFallback = marketData?.stocks
    ? Object.values(marketData.stocks).some(item => item?.error || !item?.price)
    : false

  const cryptoFallback = marketData?.crypto
    ? Object.values(marketData.crypto).some(item => item?.error || !item?.price)
    : false

  const currencyFallback = marketData?.currency
    ? Object.values(marketData.currency).some(item => item?.error)
    : false

  const lastUpdatedLabel = lastUpdate
    ? `${lastUpdate.toLocaleDateString('ko-KR')} ${lastUpdate.toLocaleTimeString('ko-KR')}`
    : '데이터 없음'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">실시간 시장 데이터</h2>
          <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
            <span>마지막 업데이트: {lastUpdatedLabel}</span>
            <span className="text-xs text-gray-500">
              Finnhub · CoinGecko · ExchangeRate API
            </span>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* Category Filter */}
      <div className="card">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeCategory === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setActiveCategory('stocks')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeCategory === 'stocks'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            주식/ETF
          </button>
          <button
            onClick={() => setActiveCategory('crypto')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeCategory === 'crypto'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            암호화폐
          </button>
          <button
            onClick={() => setActiveCategory('currency')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeCategory === 'currency'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            환율
          </button>
        </div>
      </div>

      {/* Data Source Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>📡 실시간 데이터:</strong> Finnhub (미국 주식 ETF), CoinGecko (암호화폐), ExchangeRate API (환율)
        </p>
        <p className="text-xs text-blue-700 mt-1">
          💡 SPY, QQQ, DIA, GLD ETF로 주요 지수 시장 추세를 실시간 반영합니다
        </p>
      </div>

      {/* Stock Indices */}
      {marketData?.stocks && (activeCategory === 'all' || activeCategory === 'stocks') && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">주요 지수 ETF (실시간)</h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Info className="w-3 h-3" />
              <span>데이터 출처: Finnhub (2분 자동 갱신)</span>
            </div>
          </div>
          {stockFallback && (
            <div className="mb-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-xs text-orange-700">
              Finnhub API 키가 설정되지 않아 예시 데이터(0 값)를 표시합니다. 실데이터를 원하면 VITE_FINNHUB_API_KEY를 등록하세요.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <IndexCard
              name="S&P 500"
              subtitle="SPY ETF"
              data={marketData.stocks.sp500}
            />
            <IndexCard
              name="Nasdaq 100"
              subtitle="QQQ ETF"
              data={marketData.stocks.nasdaq}
            />
            <IndexCard
              name="Dow Jones"
              subtitle="DIA ETF"
              data={marketData.stocks.dow}
            />
            <IndexCard
              name="Gold"
              subtitle="GLD ETF"
              data={marketData.gold}
            />
          </div>
        </div>
      )}

      {/* Cryptocurrencies */}
      {marketData?.crypto && (activeCategory === 'all' || activeCategory === 'crypto') && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">암호화폐 (실시간)</h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Info className="w-3 h-3" />
              <span>데이터 출처: CoinGecko (무료 API, 2분 갱신)</span>
            </div>
          </div>
          {cryptoFallback && (
            <div className="mb-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-xs text-orange-700">
              CoinGecko 응답이 없거나 지연되어 임시 데이터를 사용 중입니다.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <CryptoCard crypto={marketData.crypto.bitcoin} />
            <CryptoCard crypto={marketData.crypto.ethereum} />
            <CryptoCard crypto={marketData.crypto.binancecoin} />
            <CryptoCard crypto={marketData.crypto.solana} />
          </div>
        </div>
      )}

      {/* Currency Rates */}
      {marketData?.currency && (activeCategory === 'all' || activeCategory === 'currency') && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">환율 (실시간)</h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Info className="w-3 h-3" />
              <span>데이터 출처: ExchangeRate API (USD 기준)</span>
            </div>
          </div>
          {currencyFallback && (
            <div className="mb-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-xs text-orange-700">
              환율 API 응답이 없어 기본 환율을 표시합니다. 최신 환율 반영을 위해 API 키/네트워크 상태를 확인하세요.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <CurrencyCard
              pair="USD/KRW"
              name="원화"
              data={marketData.currency.usdKrw}
            />
            <CurrencyCard
              pair="USD/EUR"
              name="유로"
              data={marketData.currency.usdEur}
            />
            <CurrencyCard
              pair="USD/JPY"
              name="엔화"
              data={marketData.currency.usdJpy}
            />
            <CurrencyCard
              pair="USD/GBP"
              name="파운드"
              data={marketData.currency.usdGbp}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Index Card Component
const IndexCard = ({ name, subtitle, data }) => {
  if (!data || data.error || data.price === 0 || data.price === undefined || data.price === null) {
    return (
      <div className="card bg-gray-50">
        <p className="text-sm text-gray-600 mb-1">{name}</p>
        {subtitle && <p className="text-xs text-gray-500 mb-2">{subtitle}</p>}
        <p className="text-xs text-orange-600 mb-2">
          {data?.error || 'Finnhub API 키가 필요합니다'}
        </p>
        <a
          href="https://finnhub.io/register"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary-600 underline"
        >
          무료 API 키 발급받기 →
        </a>
      </div>
    )
  }

  const price = data.price || 0
  const change = data.change || 0
  const changePercent = data.changePercent || 0
  const sparklinePoints = [
    { label: '전일', value: data.previousClose ?? price - change },
    { label: '저가', value: data.low ?? price - Math.abs(change) },
    { label: '고가', value: data.high ?? price + Math.abs(change) },
    { label: '현재', value: price }
  ].filter(point => Number.isFinite(point.value))

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="mb-2">
        <p className="text-sm text-gray-600">{name}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-2">
        ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <div className={`flex items-center gap-1 text-sm ${
        data.isPositive ? 'text-success' : 'text-danger'
      }`}>
        {data.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        <span>
          {data.isPositive ? '+' : ''}{change.toFixed(2)} ({data.isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
        </span>
      </div>
      {sparklinePoints.length >= 2 && (
        <div className="mt-4">
          <Sparkline data={sparklinePoints} isPositive={data.isPositive} />
        </div>
      )}
    </div>
  )
}

// Crypto Card Component
const CryptoCard = ({ crypto }) => {
  if (!crypto || crypto.error || crypto.price === 0 || crypto.price === undefined || crypto.price === null) {
    return (
      <div className="card bg-gray-50">
        <p className="text-sm text-gray-600">{crypto?.name || 'Crypto'}</p>
        <p className="text-xs text-orange-600">
          {crypto?.error || 'CoinGecko API 응답이 없어 기본 데이터를 표시합니다.'}
        </p>
      </div>
    )
  }

  const formatMarketCap = (value) => {
    if (!value) return 'N/A'
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
    return `$${value.toFixed(2)}`
  }

  const price = crypto.price || 0
  const change24h = crypto.change24h || 0
  const trendBase = price / (1 + (change24h / 100 || 0))
  const sparklinePoints = Array.from({ length: 6 }).map((_, index) => {
    const ratio = index / 5
    const value = trendBase * (1 + (change24h / 100 || 0) * ratio)
    return { label: `t${index}`, value }
  }).filter(point => Number.isFinite(point.value))

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-medium text-gray-900">{crypto.name}</p>
          <p className="text-xs text-gray-500">{crypto.symbol}</p>
        </div>
        {crypto.marketCap && (
          <span className="text-xs text-gray-500">
            시가총액: {formatMarketCap(crypto.marketCap)}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-2">
        ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <div className={`flex items-center gap-1 text-sm ${
        crypto.isPositive ? 'text-success' : 'text-danger'
      }`}>
        {crypto.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        <span>
          {crypto.isPositive ? '+' : ''}{change24h.toFixed(2)}% (24h)
        </span>
      </div>
      {sparklinePoints.length >= 2 && (
        <div className="mt-4">
          <Sparkline data={sparklinePoints} isPositive={crypto.isPositive} />
        </div>
      )}
    </div>
  )
}

// Currency Card Component
const CurrencyCard = ({ pair, name, data }) => {
  if (!data || data.error || data.rate === undefined || data.rate === null) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-orange-100">
        <p className="text-xs text-gray-600 mb-1">{pair}</p>
        <p className="text-sm font-medium text-gray-700 mb-2">{name}</p>
        <p className="text-xs text-orange-600">
          {data?.error || '환율 데이터를 불러오지 못했습니다.'}
        </p>
      </div>
    )
  }

  const displayRate = data.rate || 0

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <p className="text-xs text-gray-600 mb-1">{pair}</p>
      <p className="text-sm font-medium text-gray-700 mb-2">{name}</p>
      <p className="text-xl font-bold text-gray-900">
        {displayRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
      </p>
    </div>
  )
}

const Sparkline = ({ data, isPositive }) => {
  if (!data || data.length < 2) {
    return null
  }

  const strokeColor = isPositive ? '#16a34a' : '#ef4444'

  return (
    <div className="h-16">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <defs>
            <linearGradient id={`sparkline-${isPositive ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={strokeColor} stopOpacity={0.4} />
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" hide />
          <YAxis domain={['auto', 'auto']} hide />
          <Tooltip
            formatter={value => value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            labelFormatter={() => ''}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={2}
            dot={false}
            fill={`url(#sparkline-${isPositive ? 'up' : 'down'})`}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default Market
