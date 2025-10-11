import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, Plus, Filter, X, List, CalendarDays, Download, Trash2 } from 'lucide-react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import ChartCard from '../components/ChartCard'

const InvestmentLog = () => {
  const [logs, setLogs] = useState([])
  const [portfolioAssets, setPortfolioAssets] = useState([])

  const [filterType, setFilterType] = useState('all')
  const [filterMonth, setFilterMonth] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [viewMode, setViewMode] = useState('list') // 'list' or 'calendar'
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'buy',
    asset: '',
    customAsset: '',
    customAssetName: '',
    customAssetType: '주식',
    customAssetCurrency: 'USD',
    customAssetAccount: '기본계좌',
    quantity: '',
    price: '',
    note: ''
  })

  // Load logs and portfolio assets from localStorage on mount
  useEffect(() => {
    const savedLogs = localStorage.getItem('investment_logs')
    if (savedLogs) {
      try {
        setLogs(JSON.parse(savedLogs))
      } catch (error) {
        console.error('Failed to load logs:', error)
      }
    }

    const savedAssets = localStorage.getItem('portfolio_assets')
    if (savedAssets) {
      try {
        setPortfolioAssets(JSON.parse(savedAssets))
      } catch (error) {
        console.error('Failed to load logs:', error)
      }
    }
  }, [])

  const filteredLogs = logs.filter(log => {
    if (filterType !== 'all' && log.type !== filterType) return false
    if (filterMonth !== 'all') {
      const logMonth = new Date(log.date).getMonth()
      if (logMonth !== parseInt(filterMonth)) return false
    }
    return true
  })

  const monthlyStats = {
    totalBuy: logs.filter(l => l.type === 'buy').reduce((sum, l) => sum + l.total, 0),
    totalSell: logs.filter(l => l.type === 'sell').reduce((sum, l) => sum + l.total, 0),
    transactions: logs.length
  }

  const handleAddTransaction = () => {
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setFormData({
      date: new Date().toISOString().split('T')[0],
      type: 'buy',
      asset: '',
      customAsset: '',
      customAssetName: '',
      customAssetType: '주식',
      customAssetCurrency: 'USD',
      customAssetAccount: '기본계좌',
      quantity: '',
      price: '',
      note: ''
    })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target

    if (name === 'asset') {
      if (value === '__custom__') {
        setFormData(prev => ({
          ...prev,
          asset: value,
          customAsset: '',
          customAssetName: '',
          customAssetType: prev.customAssetType || '주식',
          customAssetCurrency: prev.customAssetCurrency || 'USD',
          customAssetAccount: prev.customAssetAccount || '기본계좌'
        }))
      } else {
        const symbol = value.toUpperCase()
        if (portfolioAssets.length === 0) {
          setFormData(prev => ({
            ...prev,
            asset: symbol,
            customAsset: '',
            customAssetName: prev.customAssetName || symbol
          }))
        } else {
          setFormData(prev => ({
            ...prev,
            asset: symbol,
            customAsset: '',
            customAssetName: '',
            customAssetType: '주식',
            customAssetCurrency: 'USD',
            customAssetAccount: '기본계좌'
          }))
        }
      }
      return
    }

    if (name === 'customAsset') {
      const symbol = value.toUpperCase()
      setFormData(prev => ({
        ...prev,
        customAsset: symbol,
        customAssetName: prev.customAssetName || symbol
      }))
      return
    }

    if (name === 'customAssetCurrency') {
      setFormData(prev => ({
        ...prev,
        customAssetCurrency: value.toUpperCase()
      }))
      return
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const assetSymbol = formData.asset === '__custom__'
      ? formData.customAsset.trim()
      : formData.asset.trim()

    if (!assetSymbol) {
      alert('자산 심볼을 입력해주세요.')
      return
    }

    const quantity = parseFloat(formData.quantity)
    const price = parseFloat(formData.price)
    const total = quantity * price

    const normalizedAssetSymbol = assetSymbol.toUpperCase()
    const existingAsset = portfolioAssets.find(asset => asset.symbol === normalizedAssetSymbol)
    const newAssetDetails = formData.type === 'buy' && !existingAsset
      ? {
          name: (formData.customAssetName || '').trim() || normalizedAssetSymbol,
          type: (formData.customAssetType || '주식'),
          currency: (formData.customAssetCurrency || 'USD').toUpperCase(),
          account: (formData.customAssetAccount || '').trim() || '기본계좌'
        }
      : null

    const newLog = {
      id: Date.now(),
      date: formData.date,
      type: formData.type,
      asset: normalizedAssetSymbol,
      quantity,
      price,
      total,
      note: formData.note
    }

    const updatedLogs = [newLog, ...logs]
    setLogs(updatedLogs)
    localStorage.setItem('investment_logs', JSON.stringify(updatedLogs))

    // 포트폴리오 자동 업데이트
    updatePortfolioFromTransaction(newLog, { newAssetDetails })

    handleCloseModal()
  }

  // 거래 내역으로 포트폴리오 업데이트
  const updatePortfolioFromTransaction = (transaction, { newAssetDetails } = {}) => {
    const savedAssets = localStorage.getItem('portfolio_assets')
    let assets = []

    if (savedAssets) {
      try {
        assets = JSON.parse(savedAssets)
      } catch (error) {
        console.error('Failed to parse portfolio assets:', error)
        assets = []
      }
    }

    let assetsChanged = false
    const transactionSymbol = (transaction.asset || '').toUpperCase()
    const assetIndex = assets.findIndex(a => a.symbol === transactionSymbol)
    const quantityValue = Number(transaction.quantity)
    const priceValue = Number(transaction.price)

    if (!Number.isFinite(quantityValue)) {
      console.warn('Invalid transaction quantity:', transaction)
      return
    }

    if (transaction.type === 'buy') {
      if (!Number.isFinite(priceValue)) {
        console.warn('Invalid transaction price for buy transaction:', transaction)
        return
      }

      if (assetIndex >= 0) {
        const asset = assets[assetIndex]
        const totalQuantity = asset.quantity + quantityValue
        const totalCost = (asset.quantity * asset.avgPrice) + (quantityValue * priceValue)
        const newAvgPrice = totalCost / totalQuantity
        const currentPrice = asset.currentPrice || priceValue

        assets[assetIndex] = {
          ...asset,
          quantity: totalQuantity,
          avgPrice: newAvgPrice,
          totalValue: totalQuantity * currentPrice,
          profit: (totalQuantity * currentPrice) - (totalQuantity * newAvgPrice),
          profitPercent: ((currentPrice - newAvgPrice) / newAvgPrice) * 100
        }
        assetsChanged = true
      } else {
        const details = newAssetDetails || {}
        const currency = (details.currency || 'USD').toUpperCase()
        const account = details.account || '기본계좌'
        const type = details.type || '주식'
        const name = details.name || transactionSymbol
        const totalValue = quantityValue * priceValue

        assets.push({
          id: Date.now(),
          symbol: transactionSymbol,
          name,
          type,
          quantity: quantityValue,
          avgPrice: priceValue,
          currentPrice: priceValue,
          totalValue,
          profit: 0,
          profitPercent: 0,
          currency,
          account,
          category: currency === 'KRW' ? '국내주식' : '해외주식'
        })
        assetsChanged = true
      }
    } else if (transaction.type === 'sell') {
      if (assetIndex >= 0) {
        const asset = assets[assetIndex]
        const newQuantity = asset.quantity - quantityValue

        if (newQuantity <= 0) {
          assets.splice(assetIndex, 1)
        } else {
          const currentPrice = Number.isFinite(asset.currentPrice)
            ? asset.currentPrice
            : (Number.isFinite(priceValue) ? priceValue : asset.avgPrice)
          assets[assetIndex] = {
            ...asset,
            quantity: newQuantity,
            totalValue: newQuantity * currentPrice,
            profit: (newQuantity * currentPrice) - (newQuantity * asset.avgPrice),
            profitPercent: ((currentPrice - asset.avgPrice) / asset.avgPrice) * 100
          }
        }
        assetsChanged = true
      }
    }

    if (assetsChanged) {
      try {
        localStorage.setItem('portfolio_assets', JSON.stringify(assets))
      } catch (error) {
        console.error('Failed to persist portfolio assets:', error)
      }
      setPortfolioAssets([...assets])
    }
  }

  const handleDeleteLog = (id) => {
    if (window.confirm('이 거래 기록을 삭제하시겠습니까?')) {
      const updatedLogs = logs.filter(log => log.id !== id)
      setLogs(updatedLogs)
      localStorage.setItem('investment_logs', JSON.stringify(updatedLogs))
    }
  }

  // Export handlers
  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Asset', 'Quantity', 'Price', 'Total', 'Note']
    const csvData = logs.map(log => [
      log.date,
      log.type,
      log.asset,
      log.quantity,
      log.price,
      log.total,
      log.note || ''
    ])

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `investment_log_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  // Get logs for a specific date
  const getLogsForDate = (date) => {
    const dateString = date.toISOString().split('T')[0]
    return logs.filter(log => log.date === dateString)
  }

  // Check if date has transactions
  const hasTransactions = (date) => {
    const dateString = date.toISOString().split('T')[0]
    return logs.some(log => log.date === dateString)
  }

  // Get net profit/loss for a date
  const getDateProfit = (date) => {
    const dateString = date.toISOString().split('T')[0]
    const dateLogs = logs.filter(log => log.date === dateString)
    const buys = dateLogs.filter(l => l.type === 'buy').reduce((sum, l) => sum + l.total, 0)
    const sells = dateLogs.filter(l => l.type === 'sell').reduce((sum, l) => sum + l.total, 0)
    return sells - buys
  }

  // Custom tile content for calendar
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const profit = getDateProfit(date)
      const logsCount = getLogsForDate(date).length

      if (logsCount > 0) {
        return (
          <div className="text-xs mt-1">
            <div className={`font-semibold ${profit > 0 ? 'text-success' : profit < 0 ? 'text-danger' : 'text-gray-600'}`}>
              {profit > 0 ? '+' : ''}{profit !== 0 ? `$${Math.abs(profit).toFixed(0)}` : ''}
            </div>
            <div className="text-gray-500 text-[10px]">{logsCount}건</div>
          </div>
        )
      }
    }
    return null
  }

  // Custom tile class for calendar
  const tileClassName = ({ date, view }) => {
    if (view === 'month' && hasTransactions(date)) {
      const profit = getDateProfit(date)
      if (profit > 0) return 'calendar-profit'
      if (profit < 0) return 'calendar-loss'
      return 'calendar-neutral'
    }
    return null
  }

  // Get logs for selected date in calendar view
  const selectedDateLogs = viewMode === 'calendar' ? getLogsForDate(selectedDate) : []

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">총 매수금액</p>
          <p className="text-2xl font-bold text-primary-600">
            ${monthlyStats.totalBuy.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">총 매도금액</p>
          <p className="text-2xl font-bold text-success">
            ${monthlyStats.totalSell.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600 mb-1">총 거래 건수</p>
          <p className="text-2xl font-bold text-gray-900">
            {monthlyStats.transactions}건
          </p>
        </div>
      </div>

      {/* View Mode Toggle and Add Button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4" />
              리스트
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              캘린더
            </button>
          </div>

          {/* Filters (only in list view) */}
          {viewMode === 'list' && (
            <>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-600" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">전체</option>
                  <option value="buy">매수</option>
                  <option value="sell">매도</option>
                </select>
              </div>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">전체 기간</option>
                <option value="0">1월</option>
                <option value="1">2월</option>
                <option value="2">3월</option>
                <option value="3">4월</option>
                <option value="4">5월</option>
                <option value="5">6월</option>
                <option value="6">7월</option>
                <option value="7">8월</option>
                <option value="8">9월</option>
                <option value="9">10월</option>
                <option value="10">11월</option>
                <option value="11">12월</option>
              </select>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            내보내기
          </button>
          <button onClick={handleAddTransaction} className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            거래 추가
          </button>
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <ChartCard
          title="투자 거래 내역"
          subtitle={`${filteredLogs.length}건의 거래`}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">날짜</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">유형</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">자산</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">수량</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">가격</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">총액</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">메모</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-gray-400" />
                        {log.date}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                        log.type === 'buy'
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-success/10 text-success'
                      }`}>
                        {log.type === 'buy' ? '매수' : '매도'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm font-medium text-gray-900">
                      {log.asset}
                    </td>
                    <td className="py-4 px-4 text-right text-sm text-gray-700">
                      {log.quantity}
                    </td>
                    <td className="py-4 px-4 text-right text-sm text-gray-700">
                      ${log.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4 text-right text-sm font-medium text-gray-900">
                      ${log.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {log.note}
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">거래 내역이 없습니다</p>
            </div>
          )}
        </ChartCard>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">거래 캘린더</h3>
            <style>{`
              .react-calendar {
                width: 100%;
                border: none;
                font-family: inherit;
              }
              .react-calendar__tile {
                padding: 1rem 0.5rem;
                height: 90px;
              }
              .react-calendar__tile--active {
                background: #0ea5e9 !important;
                color: white !important;
              }
              .react-calendar__tile--now {
                background: #f0f9ff;
              }
              .calendar-profit {
                background: #f0fdf4;
              }
              .calendar-loss {
                background: #fef2f2;
              }
              .calendar-neutral {
                background: #f9fafb;
              }
              .react-calendar__navigation button {
                font-size: 1rem;
                font-weight: 600;
              }
            `}</style>
            <Calendar
              onChange={setSelectedDate}
              value={selectedDate}
              tileContent={tileContent}
              tileClassName={tileClassName}
              locale="ko-KR"
            />
          </div>

          {/* Selected Date Details */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </h3>
            <div className="space-y-3">
              {selectedDateLogs.length > 0 ? (
                selectedDateLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                        log.type === 'buy'
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-success/10 text-success'
                      }`}>
                        {log.type === 'buy' ? '매수' : '매도'}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">{log.asset}</span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>수량: {log.quantity}</p>
                      <p>가격: ${log.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                      <p className="font-medium text-gray-900">
                        총액: ${log.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      {log.note && (
                        <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                          {log.note}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">이 날짜에 거래 내역이 없습니다</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">거래 추가</h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  날짜
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  거래 유형
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="buy">매수</option>
                  <option value="sell">매도</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  자산 선택
                </label>
                {portfolioAssets.length > 0 ? (
                  <div className="space-y-3">
                    <select
                      name="asset"
                      value={formData.asset}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">포트폴리오에서 선택</option>
                      {portfolioAssets.map(asset => (
                        <option key={asset.id} value={asset.symbol}>
                          {asset.symbol} - {asset.name} ({asset.currency})
                        </option>
                      ))}
                      <option value="__custom__">직접 입력</option>
                    </select>

                    {formData.asset === '__custom__' && (
                      <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">심볼</label>
                          <input
                            type="text"
                            name="customAsset"
                            placeholder="예: AAPL"
                            value={formData.customAsset}
                            onChange={handleInputChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">자산명</label>
                          <input
                            type="text"
                            name="customAssetName"
                            placeholder="예: Apple Inc."
                            value={formData.customAssetName}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">유형</label>
                            <select
                              name="customAssetType"
                              value={formData.customAssetType}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                              <option value="주식">주식</option>
                              <option value="ETF">ETF</option>
                              <option value="채권">채권</option>
                              <option value="코인">코인</option>
                              <option value="현금">현금</option>
                              <option value="기타">기타</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">통화</label>
                            <select
                              name="customAssetCurrency"
                              value={formData.customAssetCurrency}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                              <option value="USD">USD</option>
                              <option value="KRW">KRW</option>
                              <option value="EUR">EUR</option>
                              <option value="JPY">JPY</option>
                              <option value="CNY">CNY</option>
                              <option value="BTC">BTC</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">계좌</label>
                            <input
                              type="text"
                              name="customAssetAccount"
                              placeholder="예: 기본계좌"
                              value={formData.customAssetAccount}
                              onChange={handleInputChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      name="asset"
                      value={formData.asset}
                      onChange={handleInputChange}
                      required
                      placeholder="종목 심볼 입력 (예: AAPL)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">자산명</label>
                        <input
                          type="text"
                          name="customAssetName"
                          placeholder="예: Apple Inc."
                          value={formData.customAssetName}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">계좌</label>
                        <input
                          type="text"
                          name="customAssetAccount"
                          placeholder="예: 기본계좌"
                          value={formData.customAssetAccount}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">유형</label>
                        <select
                          name="customAssetType"
                          value={formData.customAssetType}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="주식">주식</option>
                          <option value="ETF">ETF</option>
                          <option value="채권">채권</option>
                          <option value="코인">코인</option>
                          <option value="현금">현금</option>
                          <option value="기타">기타</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">통화</label>
                        <select
                          name="customAssetCurrency"
                          value={formData.customAssetCurrency}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="USD">USD</option>
                          <option value="KRW">KRW</option>
                          <option value="EUR">EUR</option>
                          <option value="JPY">JPY</option>
                          <option value="CNY">CNY</option>
                          <option value="BTC">BTC</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">분류</label>
                        <div className="px-3 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500">
                          통화에 따라 포트폴리오 카테고리가 자동 지정됩니다
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  💡 포트폴리오에 등록된 자산을 선택하거나 직접 입력하세요
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    수량
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                    step="0.000001"
                    min="0"
                    placeholder="1.0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    가격 ($)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    step="0.01"
                    min="0"
                    placeholder="100.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  메모 (선택)
                </label>
                <textarea
                  name="note"
                  value={formData.note}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="거래에 대한 메모를 입력하세요..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
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
    </div>
  )
}

export default InvestmentLog
