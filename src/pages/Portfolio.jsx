import { useState, useEffect, useRef, Fragment } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { PlusCircle, Edit2, Trash2, X, RefreshCw, Eye, Search, Filter, SortAsc, Upload, Download, FileText, ArrowUpRight, ArrowDownRight, Printer, ChevronDown, ChevronRight, Layers } from 'lucide-react'
import ChartCard from '../components/ChartCard'
import SlidePanel from '../components/SlidePanel'
import AssetDetailView from '../components/AssetDetailView'
import marketDataService from '../services/marketDataService'
import kisService from '../services/kisService'
import dataSync from '../utils/dataSync'
import { fetchAndUpdateAssetPrices } from '../utils/priceUpdater'

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
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false) // 백그라운드 시세 갱신 인디케이터용
  const [lastUpdate, setLastUpdate] = useState(null)
  const [exchangeRate, setExchangeRate] = useState(1340) // USD/KRW rate
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('전체')
  const [sortBy, setSortBy] = useState('default') // default, profit, profitPercent, value
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedAssets, setSelectedAssets] = useState([]) // For bulk delete
  const [selectionMode, setSelectionMode] = useState(false) // Toggle selection mode

  // 계좌별 그룹 뷰 — 기본은 기존과 동일한 플랫 리스트, 토글 시에만 계좌별로 묶어서 표시
  const [groupByAccount, setGroupByAccount] = useState(false)
  const [collapsedAccounts, setCollapsedAccounts] = useState(() => new Set()) // 접힌 계좌명 집합 (기본 전체 펼침)
  const toggleAccountCollapse = (account) => {
    setCollapsedAccounts(prev => {
      const next = new Set(prev)
      if (next.has(account)) next.delete(account)
      else next.add(account)
      return next
    })
  }

  // Investment Management - Account-based principal/deposit tracking
  const [accountPrincipals, setAccountPrincipals] = useState({}) // { accountName: { principal, remaining, note } }
  const [showPrincipalModal, setShowPrincipalModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const [editingAsset, setEditingAsset] = useState(null)
  const [editFormData, setEditFormData] = useState({
    quantity: '',
    avgPrice: ''
  })

  // ... (previous useEffects)

  const handleEditAsset = (asset) => {
    setEditingAsset(asset)
    setEditFormData({
      quantity: asset.quantity,
      avgPrice: asset.avgPrice
    })
  }

  const handleCloseEditModal = () => {
    setEditingAsset(null)
    setEditFormData({
      quantity: '',
      avgPrice: ''
    })
  }

  const handleEditInputChange = (e) => {
    const { name, value } = e.target
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSaveAssetEdit = async (e) => {
    e.preventDefault()
    if (!editingAsset) return

    const newQuantity = parseFloat(editFormData.quantity)
    const newAvgPrice = parseFloat(editFormData.avgPrice)

    if (isNaN(newQuantity) || newQuantity < 0) {
      alert('유효한 수량을 입력해주세요.')
      return
    }

    if (isNaN(newAvgPrice) || newAvgPrice < 0) {
      alert('유효한 평단가를 입력해주세요.')
      return
    }

    const updatedAsset = {
      ...editingAsset,
      quantity: newQuantity,
      avgPrice: newAvgPrice,
      totalValue: newQuantity * editingAsset.currentPrice, // Recalculate total value
      profit: (newQuantity * editingAsset.currentPrice) - (newQuantity * newAvgPrice), // Recalculate profit
      profitPercent: newAvgPrice !== 0 ? ((editingAsset.currentPrice - newAvgPrice) / newAvgPrice) * 100 : 0
    }

    // Save to dataSync
    await dataSync.savePortfolioAssets(assets.map(a => a.id === editingAsset.id ? updatedAsset : a))

    // Update local state
    setAssets(prev => prev.map(a => a.id === editingAsset.id ? updatedAsset : a))

    alert('자산 정보가 수정되었습니다.')
    handleCloseEditModal()
  }

  // ... (rest of the component)

  // In the rendering part (Asset List), add Edit button:
  // <button onClick={() => handleEditAsset(asset)} ...><Edit2 .../></button>

  // And add the Edit Modal at the end:



  // Chart Pagination
  const [chartPage, setChartPage] = useState(0)
  const ITEMS_PER_PAGE = 10

  const skipPriceUpdateRef = useRef(false)

  // Load portfolio assets and account principals on mount (with Supabase sync)
  useEffect(() => {
    let mounted = true
    const loadData = async () => {
      try {
        // Load portfolio assets (Supabase → localStorage fallback)
        const loadedAssets = await dataSync.loadPortfolioAssets()
        if (mounted) setAssets(loadedAssets)

        // Load account principals (Supabase → localStorage fallback)
        const loadedPrincipals = await dataSync.loadAccountPrincipals()
        if (mounted) setAccountPrincipals(loadedPrincipals)

        // [Optimistic UI] 캐시값으로 화면을 즉시 그린다. 시세 갱신은 백그라운드에서 진행.
        if (mounted) {
          setLoading(false)
        }
      } catch (error) {
        console.error('Failed to load data:', error)
        if (mounted) {
          // Fallback to empty state - app still works
          setAssets([])
          setAccountPrincipals({})
          setLoading(false)
        }
      }
    }

    loadData()
    return () => mounted = false
  }, [])



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

      if (!cancelled) setIsRefreshing(true)

      try {
        const { updatedAssets, nextExchangeRate } = await fetchAndUpdateAssetPrices(assets, exchangeRate)

        if (!cancelled) {
          skipPriceUpdateRef.current = true
          setExchangeRate(nextExchangeRate)
          setAssets(updatedAssets)
          dataSync.savePortfolioAssets(updatedAssets, { exchangeRate: nextExchangeRate }).catch(console.error)
          setLastUpdate(new Date())
        }
      } catch (error) {
        console.error('Price update error:', error)
      } finally {
        if (!cancelled) setIsRefreshing(false)
      }
    }

    updatePrices()
    // Auto-refresh every 1 minute
    const interval = setInterval(updatePrices, 60000)
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

  // PDF 보고서 — 자산현황/입출금이력 탭과 동일 패턴 (새 창 + 자동 print 다이얼로그).
  // 현재 화면(필터/정렬 적용된 filteredAssets)의 보유 종목 스냅샷 + 계좌별 요약을 한 페이지로.
  const handlePDFExport = () => {
    const fmt = (n) => {
      const num = Number(n) || 0
      return num.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
    }
    const fmtCur = (n, cur) => {
      const val = Number(n) || 0
      if (cur === 'USD') return `$${val.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
      return `₩${fmt(val)}`
    }
    const escape = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

    const rate = exchangeRate || 1340

    const assetRows = filteredAssets.map(asset => {
      const weight = getAssetWeightPercent(asset)
      const daily = Number(asset.dailyChangePercent || 0)
      return `<tr>
        <td class="name">${escape(asset.symbol)}</td>
        <td>${escape(asset.name)}</td>
        <td class="center">${escape(asset.type)}</td>
        <td class="center">${escape(asset.account || '기본계좌')}</td>
        <td class="num">${escape(asset.quantity)}</td>
        <td class="num">${fmtCur(asset.avgPrice, asset.currency)}</td>
        <td class="num">${fmtCur(asset.currentPrice, asset.currency)}</td>
        <td class="num ${daily >= 0 ? 'pos' : 'neg'}">${daily === 0 ? '-' : `${daily >= 0 ? '+' : ''}${daily.toFixed(2)}%`}</td>
        <td class="num">${fmtCur(asset.totalValue, asset.currency)}</td>
        <td class="num">${weight.toFixed(1)}%</td>
        <td class="num ${asset.profit >= 0 ? 'pos' : 'neg'}">${asset.profit >= 0 ? '+' : ''}${fmtCur(asset.profit, asset.currency)}</td>
        <td class="num total ${(asset.profitPercent || 0) >= 0 ? 'pos' : 'neg'}">${(asset.profitPercent || 0) >= 0 ? '+' : ''}${(asset.profitPercent || 0).toFixed(2)}%</td>
      </tr>`
    }).join('')

    const accountRows = accountSummary.map(stat => {
      const totalValKRW = stat.krwTotalValue + stat.usdTotalValue * rate
      const totalProfitKRW = stat.krwTotalProfit + stat.usdTotalProfit * rate
      return `<tr>
        <td class="name">${escape(stat.account)}</td>
        <td class="num">${stat.assets.length}</td>
        <td class="num">${fmtCur(totalValKRW, 'KRW')}</td>
        <td class="num ${totalProfitKRW >= 0 ? 'pos' : 'neg'}">${totalProfitKRW >= 0 ? '+' : ''}${fmtCur(totalProfitKRW, 'KRW')}</td>
      </tr>`
    }).join('')

    const fullHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>포트폴리오_보고서_${new Date().toISOString().slice(0, 10)}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Malgun Gothic', 'Noto Sans KR', system-ui, sans-serif; background: #ffffff; color: #0f172a; margin: 0; padding: 20px; }
  .ar-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0e7490; padding-bottom: 10px; margin-bottom: 18px; }
  .ar-title { margin: 0; font-size: 22px; color: #0c4a6e; font-weight: 800; }
  .ar-subtitle { font-size: 11px; color: #64748b; margin-top: 4px; }
  .ar-meta { font-size: 10px; color: #64748b; text-align: right; line-height: 1.6; }
  .ar-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 18px; }
  .ar-summary-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; background: #f8fafc; }
  .ar-summary-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
  .ar-summary-value { font-size: 18px; font-weight: 800; margin-top: 4px; }
  .ar-section-title { font-size: 13px; font-weight: 700; margin: 16px 0 6px; color: #0e7490; }
  .pos { color: #047857; }
  .neg { color: #be123c; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th, td { border: 1px solid #cbd5e1; padding: 4px 6px; }
  th { background: #e0f2fe; color: #0c4a6e; font-weight: 700; text-align: center; }
  td.name { background: #f1f5f9; font-weight: 600; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.center { text-align: center; }
  td.total { font-weight: 700; }
  .ar-footer { margin-top: 18px; padding-top: 6px; border-top: 1px solid #cbd5e1; font-size: 10px; color: #94a3b8; text-align: center; }
  .toolbar { position: fixed; top: 8px; right: 8px; display: flex; gap: 8px; z-index: 1000; }
  .toolbar button { padding: 8px 16px; border: 1px solid #0e7490; background: #0e7490; color: white; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
  .toolbar button.secondary { background: white; color: #0e7490; }
  @media print { .toolbar { display: none !important; } body { padding: 0; } }
</style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">🖨️ PDF 로 저장 / 인쇄</button>
    <button class="secondary" onclick="window.close()">닫기</button>
  </div>

  <div class="ar-header">
    <div>
      <h1 class="ar-title">📊 포트폴리오 보고서</h1>
      <div class="ar-subtitle">보유 종목 스냅샷 + 계좌별 요약 (현재 화면 필터/정렬 기준)</div>
    </div>
    <div class="ar-meta">
      출력: ${escape(new Date().toLocaleString('ko-KR'))}<br>
      환율: USD ${fmt(rate)}원
    </div>
  </div>

  <div class="ar-summary">
    <div class="ar-summary-card">
      <div class="ar-summary-label">총 평가액 (원화 통합)</div>
      <div class="ar-summary-value">${fmtCur(totalValueKRW, 'KRW')}</div>
    </div>
    <div class="ar-summary-card">
      <div class="ar-summary-label">총 수익금 (원화 통합)</div>
      <div class="ar-summary-value ${totalProfitKRW >= 0 ? 'pos' : 'neg'}">${totalProfitKRW >= 0 ? '+' : ''}${fmtCur(totalProfitKRW, 'KRW')}</div>
    </div>
    <div class="ar-summary-card">
      <div class="ar-summary-label">평균 수익률</div>
      <div class="ar-summary-value ${totalAvgProfitPercent >= 0 ? 'pos' : 'neg'}">${totalAvgProfitPercent >= 0 ? '+' : ''}${totalAvgProfitPercent.toFixed(2)}%</div>
    </div>
  </div>

  <div class="ar-section-title">① 보유 종목 (${filteredAssets.length}개)</div>
  <table>
    <thead>
      <tr>
        <th>심볼</th><th>종목명</th><th>유형</th><th>계좌</th><th>수량</th>
        <th>평균단가</th><th>현재가</th><th>일일변동</th><th>평가액</th><th>비중</th><th>수익금</th><th>수익률</th>
      </tr>
    </thead>
    <tbody>${assetRows}</tbody>
  </table>

  <div class="ar-section-title">② 계좌별 요약 (원화 통합)</div>
  <table>
    <thead>
      <tr><th>계좌</th><th>보유종목수</th><th>평가액</th><th>수익금</th></tr>
    </thead>
    <tbody>${accountRows}</tbody>
  </table>

  <div class="ar-footer">
    AI Finance Dashboard — 포트폴리오 보고서 · 본 자료는 사용자 입력 데이터 기반이며 투자 권유가 아닙니다.
  </div>

<script>
  window.addEventListener('load', function() {
    setTimeout(function() { window.print(); }, 400);
  });
</script>
</body>
</html>`

    const win = window.open('', '_blank', 'width=1200,height=900')
    if (!win) {
      alert('팝업이 차단되었습니다. 브라우저 팝업을 허용해주세요.')
      return
    }
    win.document.open()
    win.document.write(fullHtml)
    win.document.close()
    win.focus()
  }

  // CSV Export Handler — LIST에 보이는 컬럼/필터/정렬을 그대로 따라 내보낸다.
  // 평가액·수익금·수익률·원화환산까지 포함하고 마지막 행에 합계를 추가.
  const handleCSVExport = () => {
    const escapeCell = (value) => {
      if (value === null || value === undefined) return ''
      const str = String(value)
      if (/[",\r\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const fmt = (n, digits = 2) => {
      if (n === null || n === undefined || Number.isNaN(Number(n))) return ''
      return Number(n).toFixed(digits)
    }

    const headers = [
      '심볼', '종목명', '종류', '계좌', '통화', '카테고리',
      '수량', '평균단가', '현재가',
      '평가액', '평가액(원화환산)', '평가액(USD환산)',
      '수익금', '수익률(%)', '일일변동률(%)'
    ]

    const rate = exchangeRate || 1340

    const csvData = filteredAssets.map(asset => {
      const currency = asset.currency || 'USD'
      const currentPrice = Number(asset.currentPrice) || Number(asset.avgPrice) || 0
      const quantity = Number(asset.quantity) || 0
      const avgPrice = Number(asset.avgPrice) || 0
      const totalValue = Number(asset.totalValue) || (quantity * currentPrice)
      const profit = Number(asset.profit) || (totalValue - quantity * avgPrice)
      const profitPercent = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0
      const dailyChangePercent = Number(asset.dailyChangePercent || 0)

      const totalValueKRW = currency === 'USD' ? totalValue * rate : totalValue
      const totalValueUSD = currency === 'USD' ? totalValue : totalValue / rate

      return [
        asset.symbol,
        asset.name,
        asset.type,
        asset.account || '기본계좌',
        currency,
        asset.category || '해외주식',
        fmt(quantity, 8).replace(/\.?0+$/, ''),
        fmt(avgPrice, 4),
        fmt(currentPrice, 4),
        fmt(totalValue, 2),
        fmt(totalValueKRW, 0),
        fmt(totalValueUSD, 2),
        fmt(profit, 2),
        fmt(profitPercent, 2),
        fmt(dailyChangePercent, 2)
      ]
    })

    // 합계 행 — KRW 통합 기준
    const totals = filteredAssets.reduce((acc, asset) => {
      const currency = asset.currency || 'USD'
      const value = Number(asset.totalValue) || 0
      const profit = Number(asset.profit) || 0
      acc.valueKRW += currency === 'USD' ? value * rate : value
      acc.profitKRW += currency === 'USD' ? profit * rate : profit
      return acc
    }, { valueKRW: 0, profitKRW: 0 })

    const investedKRW = totals.valueKRW - totals.profitKRW
    const totalProfitPercent = investedKRW > 0 ? (totals.profitKRW / investedKRW) * 100 : 0

    const totalRow = [
      '합계', '', '', '', 'KRW', '', '', '', '',
      '', fmt(totals.valueKRW, 0), fmt(totals.valueKRW / rate, 2),
      fmt(totals.profitKRW, 0), fmt(totalProfitPercent, 2), ''
    ]

    const csvContent = [
      headers.map(escapeCell).join(','),
      ...csvData.map(row => row.map(escapeCell).join(',')),
      totalRow.map(escapeCell).join(',')
    ].join('\r\n')

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
    URL.revokeObjectURL(url)
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

  // 자산 유형별 아바타 배지 색상 — 폼의 유형 옵션(주식/ETF/코인/채권)과 매칭
  const ASSET_TYPE_AVATAR_STYLE = {
    '주식': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    'ETF': 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    '코인': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    '채권': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  }
  // 컴포넌트가 아닌 plain 함수로 — 렌더마다 새 컴포넌트 타입이 되어 불필요하게 리마운트되는 것 방지
  const renderAssetAvatar = (asset, className = '') => {
    const style = ASSET_TYPE_AVATAR_STYLE[asset.type] || 'bg-slate-600/30 text-slate-300 border-slate-500/40'
    const initials = (asset.symbol || '?').slice(0, 2).toUpperCase()
    return (
      <span className={`inline-flex items-center justify-center rounded-full border font-bold shrink-0 ${style} ${className}`}>
        {initials}
      </span>
    )
  }

  // 자산별 포트폴리오 비중(%) — 원화 환산 평가액 기준. 요약 카드의 totalValueKRW 재사용.
  const getAssetWeightPercent = (asset) => {
    if (!totalValueKRW || totalValueKRW <= 0) return 0
    const valueKRW = asset.currency === 'USD' ? asset.totalValue * exchangeRate : asset.totalValue
    return (valueKRW / totalValueKRW) * 100
  }

  // 모바일 카드 1개 렌더 — 플랫 뷰/계좌별 그룹 뷰 양쪽에서 재사용 (내용 100% 동일, 중복 방지)
  const renderAssetCard = (asset) => {
    const positive = (asset.profitPercent || 0) >= 0
    return (
      <div key={asset.id} className="border border-cyan-500/30 rounded-lg p-3 bg-slate-800 text-white shadow-lg">
        {/* Header with symbol, name, and selection checkbox */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {selectionMode && (
              <input
                type="checkbox"
                checked={selectedAssets.includes(asset.id)}
                onChange={() => handleToggleAssetSelection(asset.id)}
                className="mt-0.5 w-4 h-4 text-cyan-400 border-gray-600 rounded focus:ring-cyan-500 bg-slate-700 flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0 flex items-start gap-2">
              {renderAssetAvatar(asset, 'w-8 h-8 text-xs mt-0.5')}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-cyan-300 truncate">{asset.symbol}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{asset.name}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="inline-block px-1.5 py-0.5 text-xs font-medium rounded bg-cyan-900/30 text-cyan-300 border border-cyan-500/20">
                    {asset.type}
                  </span>
                  <span className="inline-block px-1.5 py-0.5 text-xs font-medium rounded bg-blue-900/30 text-blue-300 border border-blue-500/20">
                    {asset.account || '기본계좌'}
                  </span>
                  <span className="inline-block px-1.5 py-0.5 text-xs font-medium rounded bg-slate-700 text-gray-300">
                    {asset.currency}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* Profit percentage badge + 일일변동 */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${positive ? 'bg-emerald-900/30' : 'bg-red-900/30'
              }`}>
              <span className={`text-base font-bold ${positive ? 'neon-text-green' : 'neon-text-red'}`}>
                {(asset.profitPercent || 0) >= 0 ? '+' : ''}{(asset.profitPercent || 0).toFixed(1)}%
              </span>
            </div>
            {Number(asset.dailyChangePercent || 0) !== 0 && (
              <span className={`inline-flex items-center gap-0.5 text-[11px] ${Number(asset.dailyChangePercent) >= 0 ? 'neon-text-green' : 'neon-text-red'}`}>
                {Number(asset.dailyChangePercent) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                금일 {Math.abs(Number(asset.dailyChangePercent)).toFixed(2)}%
              </span>
            )}
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-2 py-2 border-t border-cyan-500/20 text-xs text-gray-300">
          <div>
            <span className="text-gray-500">보유량</span>
            <p className="font-medium text-white mt-0.5">{asset.quantity}</p>
          </div>
          <div className="text-right">
            <span className="text-gray-500">평가액</span>
            <p className="font-bold text-white mt-0.5">{formatCurrency(asset.totalValue, asset.currency)}</p>
          </div>
          <div>
            <span className="text-gray-500">평균단가</span>
            <p className="font-medium text-white mt-0.5">{formatCurrency(asset.avgPrice, asset.currency)}</p>
          </div>
          <div className="text-right">
            <span className="text-gray-500">현재가</span>
            <p className="font-medium text-white mt-0.5">{formatCurrency(asset.currentPrice, asset.currency)}</p>
          </div>
          <div>
            <span className="text-gray-500">비중</span>
            <p className="font-medium text-white mt-0.5">{getAssetWeightPercent(asset).toFixed(1)}%</p>
          </div>
        </div>

        {/* Profit display */}
        <div className="flex items-center justify-between pt-2 border-t border-cyan-500/20">
          <span className="text-xs text-gray-500">수익금</span>
          <span className={`text-sm font-bold ${asset.profit >= 0 ? 'neon-text-green' : 'neon-text-red'}`}>
            {asset.profit >= 0 ? '+' : ''}{formatCurrency(asset.profit, asset.currency)}
          </span>
        </div>

        {/* Action buttons — 데스크탑 테이블과 동일하게 상세/수정/삭제 3버튼 */}
        <div className="flex items-center gap-2 pt-3 border-t border-cyan-500/20 mt-3">
          <button
            onClick={() => handleViewDetail(asset)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-cyan-300 rounded-lg transition-colors text-xs font-medium"
          >
            <Eye className="w-3.5 h-3.5" />
            상세
          </button>
          <button
            onClick={() => handleEditAsset(asset)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-900/20 hover:bg-blue-900/40 text-blue-400 rounded-lg transition-colors text-xs font-medium"
          >
            <Edit2 className="w-3.5 h-3.5" />
            수정
          </button>
          <button
            onClick={() => handleDeleteAsset(asset.id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded-lg transition-colors text-xs font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" />
            삭제
          </button>
        </div>
      </div>
    )
  }

  // 데스크탑 테이블 행 1개 렌더 — 플랫 뷰/계좌별 그룹 뷰 양쪽에서 재사용 (내용 100% 동일, 중복 방지)
  const renderAssetRow = (asset) => (
    <tr key={asset.id} className="border-b border-cyan-500/10 hover:bg-cyan-500/5 transition-colors">
      {selectionMode && (
        <td className="py-4 px-4 text-center">
          <input
            type="checkbox"
            checked={selectedAssets.includes(asset.id)}
            onChange={() => handleToggleAssetSelection(asset.id)}
            className="w-4 h-4 text-cyan-500 border-cyan-500/30 rounded focus:ring-cyan-500 bg-slate-800"
          />
        </td>
      )}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          {renderAssetAvatar(asset, 'w-7 h-7 text-[10px]')}
          <p className="font-medium text-cyan-300">{asset.symbol}</p>
        </div>
      </td>
      <td className="py-4 px-4">
        <p className="text-sm text-gray-300">{asset.name}</p>
      </td>
      <td className="py-4 px-4">
        <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-cyan-900/30 text-cyan-300 border border-cyan-500/20">
          {asset.type}
        </span>
      </td>
      <td className="py-4 px-4">
        <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-blue-900/30 text-blue-300 border border-blue-500/20">
          {asset.account || '기본계좌'}
        </span>
      </td>
      <td className="py-4 px-4 text-center">
        <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-slate-700 text-gray-300">
          {asset.currency}
        </span>
      </td>
      <td className="py-4 px-4 text-right text-sm text-gray-300">
        {asset.quantity}
      </td>
      <td className="py-4 px-4 text-right text-sm text-gray-300">
        {formatCurrency(asset.avgPrice, asset.currency)}
      </td>
      <td className="py-4 px-4 text-right text-sm text-gray-300">
        {formatCurrency(asset.currentPrice, asset.currency)}
      </td>
      <td className="py-4 px-4 text-right text-sm">
        {(() => {
          const daily = Number(asset.dailyChangePercent || 0)
          if (daily === 0) return <span className="text-gray-500">-</span>
          const up = daily >= 0
          return (
            <span className={`inline-flex items-center gap-0.5 justify-end ${up ? 'neon-text-green' : 'neon-text-red'}`}>
              {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(daily).toFixed(2)}%
            </span>
          )
        })()}
      </td>
      <td className="py-4 px-4 text-right text-sm font-medium text-white">
        {formatCurrency(asset.totalValue, asset.currency)}
        {asset.currency === 'KRW' && (
          <div className="text-xs text-gray-500">
            ${(asset.totalValue / exchangeRate).toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
        )}
      </td>
      <td className="py-4 px-4 text-right text-sm text-gray-300">
        {getAssetWeightPercent(asset).toFixed(1)}%
      </td>
      <td className="py-4 px-4 text-right text-sm">
        <span className={asset.profit >= 0 ? 'neon-text-green' : 'neon-text-red'}>
          {asset.profit >= 0 ? '+' : ''}{formatCurrency(asset.profit, asset.currency)}
        </span>
      </td>
      <td className="py-4 px-4 text-right text-sm font-medium">
        <span className={(asset.profitPercent || 0) >= 0 ? 'neon-text-green' : 'neon-text-red'}>
          {(asset.profitPercent || 0) >= 0 ? '+' : ''}{(asset.profitPercent || 0).toFixed(2)}%
        </span>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewDetail(asset)}
            className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors"
            title="상세 보기"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleEditAsset(asset)}
            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
            title="자산 수정"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteAsset(asset.id)}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  )

  // 데스크탑 테이블 헤더 컬럼 수 (그룹 헤더 행의 colSpan 계산용) — 심볼~관리 14개 + 선택모드 체크박스
  const desktopColumnCount = 14 + (selectionMode ? 1 : 0)

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

  // 계좌별 그룹 뷰용 — filteredAssets(검색/필터/정렬 이미 적용됨)를 계좌 단위로 묶는다.
  // Map 은 삽입 순서를 보존하므로 그룹 내부 순서는 filteredAssets 의 정렬 순서를 그대로 따른다.
  const groupedByAccount = (() => {
    const map = new Map()
    filteredAssets.forEach(asset => {
      const account = asset.account || '기본계좌'
      if (!map.has(account)) map.set(account, [])
      map.get(account).push(asset)
    })
    return Array.from(map.entries()).map(([account, groupAssets]) => {
      const valueKRW = groupAssets.reduce((sum, a) => sum + (a.currency === 'USD' ? a.totalValue * exchangeRate : a.totalValue), 0)
      const profitKRW = groupAssets.reduce((sum, a) => sum + (a.currency === 'USD' ? a.profit * exchangeRate : a.profit), 0)
      const investedKRW = valueKRW - profitKRW
      const profitPercent = investedKRW > 0 ? (profitKRW / investedKRW) * 100 : 0
      return { account, assets: groupAssets, valueKRW, profitKRW, profitPercent }
    }).sort((a, b) => b.valueKRW - a.valueKRW) // 평가액 큰 계좌 먼저
  })()

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
          {(loading || isRefreshing) && (
            <span className="flex items-center gap-1 text-xs text-cyan-300/70">
              <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
              {isRefreshing && !loading ? '시세 갱신 중' : '로딩 중'}
            </span>
          )}
        </div>
      </div>

      {/* Portfolio Summary - Premium Design */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* 총 평가액 (원화 기준 통합) */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-800 border border-blue-500/30 p-4 sm:p-6 shadow-[0_0_15px_rgba(59,130,246,0.15)] group hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all duration-300">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-blue-500/10 blur-xl group-hover:bg-blue-500/20 transition-all"></div>
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 h-32 w-32 rounded-full bg-indigo-500/10 blur-xl group-hover:bg-indigo-500/20 transition-all"></div>
          <div className="relative">
            <p className="text-xs sm:text-sm font-medium text-blue-400 mb-2 tracking-wider">총 평가액 (원화 통합)</p>
            <p className="text-2xl sm:text-4xl font-bold text-white mb-3 sm:mb-4 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">
              ₩{totalValueKRW.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
            </p>
            <div className="space-y-2 pt-3 border-t border-blue-500/20">
              {usdAssets.length > 0 && (
                <div className="flex items-center justify-between text-blue-200/70">
                  <span className="text-xs font-medium">🇺🇸 USD</span>
                  <span className="text-sm font-semibold text-blue-100">${usdTotalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
              )}
              {krwAssets.length > 0 && (
                <div className="flex items-center justify-between text-blue-200/70">
                  <span className="text-xs font-medium">🇰🇷 KRW</span>
                  <span className="text-sm font-semibold text-blue-100">₩{krwTotalValue.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 총 수익금 (원화 기준 통합) */}
        <div className={`relative overflow-hidden rounded-2xl p-4 sm:p-6 shadow-lg transition-all duration-300 ${totalProfitKRW >= 0
          ? 'bg-slate-800 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]'
          : 'bg-slate-800 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)] hover:shadow-[0_0_20px_rgba(239,68,68,0.25)]'
          }`}>
          <div className={`absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full blur-xl transition-all opacity-20 ${totalProfitKRW >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
          <div className={`absolute bottom-0 left-0 -mb-8 -ml-8 h-32 w-32 rounded-full blur-xl transition-all opacity-10 ${totalProfitKRW >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
          <div className="relative">
            <p className={`text-xs sm:text-sm font-medium mb-2 tracking-wider ${totalProfitKRW >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              총 수익금 (원화 통합)
            </p>
            <p className={`text-2xl sm:text-4xl font-bold mb-3 sm:mb-4 drop-shadow-md ${totalProfitKRW >= 0 ? 'text-emerald-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'text-red-300 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}>
              {totalProfitKRW >= 0 ? '+' : ''}₩{totalProfitKRW.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
            </p>
            <div className={`space-y-2 pt-3 border-t ${totalProfitKRW >= 0 ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
              {usdAssets.length > 0 && (
                <div className="flex items-center justify-between text-gray-400">
                  <span className="text-xs font-medium">🇺🇸 USD</span>
                  <span className={`text-sm font-semibold ${usdTotalProfit >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                    {usdTotalProfit >= 0 ? '+' : ''}${usdTotalProfit.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}
              {krwAssets.length > 0 && (
                <div className="flex items-center justify-between text-gray-400">
                  <span className="text-xs font-medium">🇰🇷 KRW</span>
                  <span className={`text-sm font-semibold ${krwTotalProfit >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                    {krwTotalProfit >= 0 ? '+' : ''}₩{krwTotalProfit.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 평균 수익률 */}
        <div className={`relative overflow-hidden rounded-2xl p-4 sm:p-6 shadow-lg transition-all duration-300 ${totalAvgProfitPercent >= 0
          ? 'bg-slate-800 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:shadow-[0_0_20px_rgba(168,85,247,0.25)]'
          : 'bg-slate-800 border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.15)] hover:shadow-[0_0_20px_rgba(249,115,22,0.25)]'
          }`}>
          <div className={`absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full blur-xl transition-all opacity-20 ${totalAvgProfitPercent >= 0 ? 'bg-purple-500' : 'bg-orange-500'}`}></div>
          <div className={`absolute bottom-0 left-0 -mb-8 -ml-8 h-32 w-32 rounded-full blur-xl transition-all opacity-10 ${totalAvgProfitPercent >= 0 ? 'bg-purple-500' : 'bg-orange-500'}`}></div>
          <div className="relative">
            <p className={`text-xs sm:text-sm font-medium mb-2 tracking-wider ${totalAvgProfitPercent >= 0 ? 'text-purple-400' : 'text-orange-400'}`}>
              평균 수익률
            </p>
            <p className={`text-2xl sm:text-4xl font-bold mb-3 sm:mb-4 drop-shadow-md ${totalAvgProfitPercent >= 0 ? 'text-purple-300 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'text-orange-300 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]'}`}>
              {totalAvgProfitPercent >= 0 ? '+' : ''}{(totalAvgProfitPercent || 0).toFixed(2)}%
            </p>
            <div className={`space-y-2 pt-3 border-t ${totalAvgProfitPercent >= 0 ? 'border-purple-500/20' : 'border-orange-500/20'}`}>
              {usdAssets.length > 0 && (
                <div className="flex items-center justify-between text-gray-400">
                  <span className="text-xs font-medium">🇺🇸 USD</span>
                  <span className={`text-sm font-semibold ${usdAvgProfitPercent >= 0 ? 'text-purple-300' : 'text-orange-300'}`}>
                    {usdAvgProfitPercent >= 0 ? '+' : ''}{(usdAvgProfitPercent || 0).toFixed(2)}%
                  </span>
                </div>
              )}
              {krwAssets.length > 0 && (
                <div className="flex items-center justify-between text-gray-400">
                  <span className="text-xs font-medium">🇰🇷 KRW</span>
                  <span className={`text-sm font-semibold ${krwAvgProfitPercent >= 0 ? 'text-purple-300' : 'text-orange-300'}`}>
                    {krwAvgProfitPercent >= 0 ? '+' : ''}{(krwAvgProfitPercent || 0).toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Investment Management Table - Account Based */}
      <div className="cyber-card cyber-card-glow">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h3 className="text-base sm:text-xl font-bold text-cyan-400">투자 관리표</h3>
            <p className="text-xs sm:text-sm text-cyan-300/60 mt-1">계좌별 투자 원금 및 손익 현황</p>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="block sm:hidden space-y-3">
          {accountSummary.length === 0 ? (
            <div className="py-12 text-center">
              <div className="flex flex-col items-center justify-center text-cyan-300/60">
                <FileText className="w-12 h-12 mb-3 text-cyan-400/30" />
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
                  <div key={account.account} className="border border-cyan-400/30 rounded-lg p-3 bg-slate-800/50 hover:bg-slate-700/50 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-cyan-300">{account.account}</p>
                        <p className="text-xs text-cyan-300/60 mt-0.5">{account.assets.length}개 자산 보유</p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingAccount(account.account)
                          setShowPrincipalModal(true)
                        }}
                        className="p-1.5 hover:bg-cyan-400/20 rounded transition-colors flex-shrink-0"
                        title="원금/예수금 입력"
                      >
                        <Edit2 className="w-4 h-4 text-cyan-400" />
                      </button>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-cyan-300/60">원금</span>
                        <span className="font-medium text-white">
                          {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(principalData.principal)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyan-300/60">예수금(잔여)</span>
                        <span className="font-medium text-white">
                          {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(principalData.remaining)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-cyan-400/20">
                        <span className="text-cyan-200 font-medium">투자금</span>
                        <span className="font-bold text-white">
                          {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(investmentAmount))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyan-200 font-medium">평가금액</span>
                        <span className="font-bold text-white">
                          {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(evaluationKRW))}
                        </span>
                      </div>
                      <div className="flex justify-between pb-2 border-b border-cyan-400/20">
                        <span className="text-cyan-200 font-medium">손익</span>
                        <span className={`font-bold text-sm ${profit >= 0 ? 'neon-text-green' : 'neon-text-red'}`}>
                          {profit >= 0 ? '+' : ''}{new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(profit))}
                        </span>
                      </div>
                      {principalData.note && (
                        <div className="pt-2">
                          <span className="text-cyan-300/60">비고: </span>
                          <span className="text-cyan-200">{principalData.note}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* TOTAL Card */}
              <div className="border-2 border-cyan-400/50 rounded-lg p-3 bg-cyan-500/10">
                <p className="text-sm font-bold text-cyan-400 mb-3 text-center">TOTAL</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-cyan-300 font-medium">원금 합계</span>
                    <span className="font-bold text-white">
                      {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(
                        accountSummary.reduce((sum, acc) => {
                          const data = accountPrincipals[acc.account] || { principal: 0 }
                          return sum + data.principal
                        }, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyan-300 font-medium">예수금 합계</span>
                    <span className="font-bold text-white">
                      {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(
                        accountSummary.reduce((sum, acc) => {
                          const data = accountPrincipals[acc.account] || { remaining: 0 }
                          return sum + data.remaining
                        }, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-cyan-400/30">
                    <span className="text-cyan-200 font-bold">총 투자금</span>
                    <span className="font-bold text-white">
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
        <div className="hidden sm:block overflow-x-auto cyber-table">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-center">뺈호</th>
                <th className="text-left">계좌명</th>
                <th className="text-right">원금</th>
                <th className="text-right">예수금(잔여)</th>
                <th className="text-right">투자금</th>
                <th className="text-right">평가금액(원)</th>
                <th className="text-right">손익</th>
                <th className="text-left">비고</th>
                <th className="text-center">관리</th>
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
                  <tr key={account.account} className="border-b border-cyan-400/20 hover:bg-cyan-500/5">
                    <td className="text-center py-3 px-4 text-white">{index + 1}</td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-cyan-300">{account.account}</p>
                        <p className="text-xs text-cyan-300/60">{account.assets.length}개 자산 보유</p>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 text-white">
                      {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(principalData.principal)}
                    </td>
                    <td className="text-right py-3 px-4 text-white">
                      {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(principalData.remaining)}
                    </td>
                    <td className="text-right py-3 px-4 font-bold text-cyan-300 bg-cyan-500/10">
                      {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(investmentAmount))}
                    </td>
                    <td className="text-right py-3 px-4 font-bold text-cyan-300 bg-cyan-500/10">
                      {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(evaluationKRW))}
                    </td>
                    <td className={`text-right py-3 px-4 font-bold bg-cyan-500/10 ${profit >= 0 ? 'neon-text-green' : 'neon-text-red'}`}>
                      {profit >= 0 ? '+' : ''}{new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(profit))}
                    </td>
                    <td className="py-3 px-4 text-cyan-300/60 text-xs">{principalData.note || '-'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingAccount(account.account)
                            setShowPrincipalModal(true)
                          }}
                          className="p-1 hover:bg-cyan-400/20 rounded transition-colors"
                          title="원금/예수금 입력"
                        >
                          <Edit2 className="w-4 h-4 text-cyan-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {/* TOTAL Row */}
              {accountSummary.length > 0 && (
                <tr className="bg-cyan-500/20 border-t-2 border-cyan-400/50 font-bold">
                  <td colSpan="2" className="text-center py-3 px-4 text-cyan-400">TOTAL</td>
                  <td className="text-right py-3 px-4 text-white">
                    {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(
                      accountSummary.reduce((sum, acc) => {
                        const data = accountPrincipals[acc.account] || { principal: 0 }
                        return sum + data.principal
                      }, 0)
                    )}
                  </td>
                  <td className="text-right py-3 px-4 text-white">
                    {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(
                      accountSummary.reduce((sum, acc) => {
                        const data = accountPrincipals[acc.account] || { remaining: 0 }
                        return sum + data.remaining
                      }, 0)
                    )}
                  </td>
                  <td className="text-right py-3 px-4 text-cyan-300">
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
                  <td className="text-right py-3 px-4 text-cyan-300">
                    {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(Math.round(totalValueKRW))}
                  </td>
                  <td className="text-right py-3 px-4">
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
                        <span className={totalProfit >= 0 ? 'neon-text-green' : 'neon-text-red'}>
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

      {/* 계좌별 대시보드 - Cyberpunk Design */}
      {accountSummary.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-cyan-400">계좌별 현황</h3>
              <p className="text-sm text-cyan-300/60 mt-1">계좌별 평가액 및 수익 분석</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accountSummary.map((account) => (
              <div key={account.account} className="cyber-card cyber-card-glow overflow-hidden group">
                {/* Header with deep gradient background */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-cyan-500/30 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-cyan-300 text-lg tracking-wide">{account.account}</h4>
                    <span className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-xs font-medium text-cyan-400 backdrop-blur-sm">
                      {account.assets.length}개 자산
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4 bg-slate-800/50">
                  {/* USD 자산 */}
                  {account.usdTotalValue > 0 && (
                    <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-500/30 hover:border-blue-400/50 transition-colors">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🇺🇸</span>
                        <span className="text-sm font-bold text-blue-300">USD</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-blue-400/80">평가액</span>
                          <span className="text-base font-bold text-blue-200">
                            ${account.usdTotalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-blue-400/80">수익금</span>
                          <span className={`text-sm font-bold ${account.usdTotalProfit >= 0 ? 'neon-text-green' : 'neon-text-red'}`}>
                            {account.usdTotalProfit >= 0 ? '+' : ''}${account.usdTotalProfit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-blue-500/20">
                          <span className="text-xs font-medium text-blue-400/80">수익률</span>
                          <span className={`text-lg font-bold ${account.usdProfitPercent >= 0 ? 'neon-text-green' : 'neon-text-red'}`}>
                            {account.usdProfitPercent >= 0 ? '+' : ''}{account.usdProfitPercent.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KRW 자산 */}
                  {account.krwTotalValue > 0 && (
                    <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-500/30 hover:border-purple-400/50 transition-colors">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🇰🇷</span>
                        <span className="text-sm font-bold text-purple-300">KRW</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-purple-400/80">평가액</span>
                          <span className="text-base font-bold text-purple-200">
                            ₩{Math.round(account.krwTotalValue).toLocaleString('ko-KR')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-purple-400/80">수익금</span>
                          <span className={`text-sm font-bold ${account.krwTotalProfit >= 0 ? 'neon-text-green' : 'neon-text-red'}`}>
                            {account.krwTotalProfit >= 0 ? '+' : ''}₩{Math.round(account.krwTotalProfit).toLocaleString('ko-KR')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-purple-500/20">
                          <span className="text-xs font-medium text-purple-400/80">수익률</span>
                          <span className={`text-lg font-bold ${account.krwProfitPercent >= 0 ? 'neon-text-green' : 'neon-text-red'}`}>
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

      {/* Performance Chart with Pagination */}
      {(() => {
        const totalPages = Math.ceil(performanceData.length / ITEMS_PER_PAGE)
        const paginatedData = performanceData.slice(
          chartPage * ITEMS_PER_PAGE,
          (chartPage + 1) * ITEMS_PER_PAGE
        )

        return (
          <ChartCard
            title="자산별 수익률"
            subtitle="현재 보유 자산 성과 비교"
            action={
              totalPages > 1 && (
                <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1 border border-cyan-500/30">
                  <button
                    onClick={() => setChartPage(p => Math.max(0, p - 1))}
                    disabled={chartPage === 0}
                    className="p-1 hover:bg-cyan-500/20 rounded disabled:opacity-30 transition-colors text-cyan-400"
                  >
                    ←
                  </button>
                  <span className="text-xs text-cyan-300 font-medium px-2">
                    {chartPage + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setChartPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={chartPage === totalPages - 1}
                    className="p-1 hover:bg-cyan-500/20 rounded disabled:opacity-30 transition-colors text-cyan-400"
                  >
                    →
                  </button>
                </div>
              )
            }
          >
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={paginatedData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis
                  dataKey="fullName"
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#475569' }}
                  interval={0}
                  tickFormatter={(value) => value.length > 8 ? value.substring(0, 8) + '...' : value}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#475569' }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(6, 182, 212, 0.05)' }}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
                    color: '#f8fafc'
                  }}
                  itemStyle={{ color: '#22d3ee' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '0.25rem' }}
                  formatter={(value) => [`${value}%`, '수익률']}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar
                  dataKey="수익률"
                  fill="#06b6d4"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                >
                  {paginatedData.map((entry, index) => (
                    <cell key={`cell-${index}`} fill={entry.수익률 >= 0 ? '#06b6d4' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )
      })()}

      {/* Search and Filter */}
      <div className="cyber-card mb-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cyan-400/50" />
            <input
              type="text"
              placeholder="종목명 또는 심볼 검색 (예: AAPL, Bitcoin)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-cyan-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-white placeholder-gray-500 transition-all"
            />
          </div>

          {/* Filters and Sort */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            {/* Type Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-cyan-300">유형:</span>
              <div className="flex flex-wrap gap-2">
                {assetTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-2.5 sm:px-3 py-1 text-xs sm:text-sm rounded-lg transition-colors min-h-[32px] border ${filterType === type
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                      : 'bg-slate-800 text-gray-400 border-gray-700 hover:border-cyan-500/30 hover:text-cyan-200'
                      }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-2 sm:ml-auto">
              <SortAsc className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-cyan-300">정렬:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2.5 sm:px-3 py-1.5 sm:py-1 text-xs sm:text-sm bg-slate-900 border border-cyan-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-white min-h-[32px]"
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
            <div className="flex items-center gap-2 text-sm text-cyan-300/60">
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
                className="text-cyan-400 hover:text-cyan-300 underline transition-colors"
              >
                초기화
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Assets Table */}
      <div className="cyber-card cyber-card-glow">
        <div className="flex flex-col gap-3 mb-4 sm:mb-6">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-cyan-400">보유 자산</h3>
            <p className="text-xs sm:text-sm text-cyan-300/60 mt-1">
              전체 {assets.length}개 자산
              {lastUpdate && (
                <span className="ml-2 text-xs text-cyan-500/50 hidden sm:inline">
                  • 마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR')}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-cyan-500/30 hover:border-cyan-500/50 rounded-lg text-cyan-300 transition-colors flex items-center gap-2 text-xs sm:text-sm"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">가져오기</span>
              <span className="sm:hidden">가져오기</span>
            </button>
            <button
              onClick={handleCSVExport}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-cyan-500/30 hover:border-cyan-500/50 rounded-lg text-cyan-300 transition-colors flex items-center gap-2 text-xs sm:text-sm"
              disabled={assets.length === 0}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">내보내기</span>
              <span className="sm:hidden">내보내기</span>
            </button>
            <button
              onClick={handlePDFExport}
              className="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/50 rounded-lg text-indigo-300 transition-colors flex items-center gap-2 text-xs sm:text-sm"
              disabled={filteredAssets.length === 0}
              title="현재 화면(필터/정렬 적용)의 보유 종목 + 계좌별 요약을 PDF로 다운로드"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">PDF 보고서</span>
              <span className="sm:hidden">PDF</span>
            </button>
            <button
              onClick={() => setGroupByAccount(prev => !prev)}
              className={`px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 text-xs sm:text-sm ${groupByAccount
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-cyan-500/30 hover:border-cyan-500/50'
                }`}
              disabled={filteredAssets.length === 0}
              title="보유 자산을 계좌별로 묶어서 표시"
            >
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">{groupByAccount ? '전체 보기' : '계좌별 보기'}</span>
              <span className="sm:hidden">계좌별</span>
            </button>

            {/* Selection mode toggle */}
            {!selectionMode ? (
              <button
                onClick={handleToggleSelectionMode}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-cyan-500/30 hover:border-cyan-500/50 rounded-lg text-cyan-300 transition-colors flex items-center gap-2 text-xs sm:text-sm"
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
                  className="px-3 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 hover:border-red-500/50 rounded-lg text-red-400 transition-colors flex items-center gap-2 text-xs sm:text-sm"
                  disabled={selectedAssets.length === 0}
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">삭제 ({selectedAssets.length})</span>
                  <span className="sm:hidden">삭제</span>
                </button>
                <button
                  onClick={handleToggleSelectionMode}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-gray-500/30 hover:border-gray-500/50 rounded-lg text-gray-400 transition-colors flex items-center gap-2 text-xs sm:text-sm"
                >
                  <X className="w-4 h-4" />
                  취소
                </button>
              </>
            )}

            <button onClick={handleAddAsset} className="cyber-btn flex items-center gap-2 text-xs sm:text-sm">
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
              <div className="flex flex-col items-center justify-center text-cyan-300/40">
                <Search className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-base font-medium">검색 결과가 없습니다</p>
                <p className="text-sm mt-1">다른 검색어를 입력하거나 필터를 변경해보세요</p>
              </div>
            </div>
          ) : groupByAccount ? (
            groupedByAccount.map(group => {
              const collapsed = collapsedAccounts.has(group.account)
              return (
                <div key={group.account} className="space-y-2">
                  <button
                    onClick={() => toggleAccountCollapse(group.account)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-800/80 border border-cyan-500/30 rounded-lg text-left"
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      {collapsed ? <ChevronRight className="w-4 h-4 text-cyan-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
                      <span className="text-sm font-bold text-cyan-300 truncate">{group.account}</span>
                      <span className="text-xs text-cyan-300/50 flex-shrink-0">({group.assets.length}개)</span>
                    </span>
                    <span className="text-right flex-shrink-0">
                      <span className="block text-sm font-bold text-white">₩{group.valueKRW.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}</span>
                      <span className={`block text-xs ${group.profitKRW >= 0 ? 'neon-text-green' : 'neon-text-red'}`}>
                        {group.profitKRW >= 0 ? '+' : ''}₩{group.profitKRW.toLocaleString('ko-KR', { maximumFractionDigits: 0 })} ({group.profitPercent >= 0 ? '+' : ''}{group.profitPercent.toFixed(1)}%)
                      </span>
                    </span>
                  </button>
                  {!collapsed && (
                    <div className="space-y-3 pl-2">
                      {group.assets.map(asset => renderAssetCard(asset))}
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            filteredAssets.map(asset => renderAssetCard(asset))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto cyber-table">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cyan-500/30">
                {selectionMode && (
                  <th className="text-center py-3 px-4 text-sm font-medium text-cyan-300/60">
                    <input
                      type="checkbox"
                      checked={selectedAssets.length === filteredAssets.length && filteredAssets.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-cyan-500 border-cyan-500/30 rounded focus:ring-cyan-500 bg-slate-800"
                    />
                  </th>
                )}
                <th className="text-left py-3 px-4 text-sm font-medium text-cyan-300/60">심볼</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-cyan-300/60">종목명</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-cyan-300/60">유형</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-cyan-300/60">계좌</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-cyan-300/60">통화</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-cyan-300/60">보유량</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-cyan-300/60">평균단가</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-cyan-300/60">현재가</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-cyan-300/60">일일변동</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-cyan-300/60">평가액</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-cyan-300/60">비중</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-cyan-300/60">수익금</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-cyan-300/60">수익률</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-cyan-300/60">관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={desktopColumnCount} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-cyan-300/40">
                      <Search className="w-12 h-12 mb-3 opacity-50" />
                      <p className="text-lg font-medium">검색 결과가 없습니다</p>
                      <p className="text-sm mt-1">다른 검색어를 입력하거나 필터를 변경해보세요</p>
                    </div>
                  </td>
                </tr>
              ) : groupByAccount ? (
                groupedByAccount.map(group => {
                  const collapsed = collapsedAccounts.has(group.account)
                  return (
                    <Fragment key={group.account}>
                      <tr
                        className="bg-slate-800/60 border-b border-cyan-500/20 cursor-pointer hover:bg-slate-800/90 transition-colors"
                        onClick={() => toggleAccountCollapse(group.account)}
                      >
                        <td colSpan={desktopColumnCount} className="py-3 px-4">
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2 min-w-0">
                              {collapsed ? <ChevronRight className="w-4 h-4 text-cyan-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
                              <span className="text-sm font-bold text-cyan-300 truncate">{group.account}</span>
                              <span className="text-xs text-cyan-300/50 flex-shrink-0">({group.assets.length}개)</span>
                            </span>
                            <span className="flex items-center gap-4 flex-shrink-0 text-sm">
                              <span className="text-white font-medium">₩{group.valueKRW.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}</span>
                              <span className={group.profitKRW >= 0 ? 'neon-text-green' : 'neon-text-red'}>
                                {group.profitKRW >= 0 ? '+' : ''}₩{group.profitKRW.toLocaleString('ko-KR', { maximumFractionDigits: 0 })} ({group.profitPercent >= 0 ? '+' : ''}{group.profitPercent.toFixed(1)}%)
                              </span>
                            </span>
                          </div>
                        </td>
                      </tr>
                      {!collapsed && group.assets.map(asset => renderAssetRow(asset))}
                    </Fragment>
                  )
                })
              ) : (
                filteredAssets.map(asset => renderAssetRow(asset))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Asset Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-lg max-w-md w-full p-6 shadow-2xl shadow-cyan-500/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">자산 추가</h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  심볼 / 티커
                </label>
                <input
                  type="text"
                  name="symbol"
                  value={formData.symbol}
                  onChange={handleInputChange}
                  required
                  placeholder="예: AAPL, BTC, 삼성전자"
                  className="w-full px-3 py-2 bg-slate-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  자산명
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="예: Apple Inc."
                  className="w-full px-3 py-2 bg-slate-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    자산 유형
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                  >
                    <option value="주식">주식</option>
                    <option value="ETF">ETF</option>
                    <option value="코인">코인</option>
                    <option value="채권">채권</option>
                    <option value="기타">기타</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    통화
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="KRW">KRW (₩)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    계좌
                  </label>
                  <select
                    name="account"
                    value={formData.account}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
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
                      className="mt-2 w-full px-3 py-2 bg-slate-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    카테고리
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
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
                  <label className="block text-sm font-medium text-gray-300 mb-2">
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
                    className="w-full px-3 py-2 bg-slate-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
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
                    className="w-full px-3 py-2 bg-slate-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-500"
                  />
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                <p className="text-xs text-blue-300">
                  <strong>실시간 시세:</strong> BTC, ETH, BNB, SOL은 자동으로 실시간 가격이 업데이트됩니다.
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-slate-800 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 cyber-btn"
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-lg max-w-2xl w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">📤 데이터 가져오기/내보내기</h3>
              <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Import Section */}
              <div>
                <h4 className="font-semibold text-cyan-300 mb-3">📥 CSV 파일 가져오기</h4>
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-3">
                  <p className="text-sm text-blue-300 mb-2">
                    <strong>CSV 형식:</strong> Symbol, Name, Type, Quantity, AvgPrice, Currency
                  </p>
                  <p className="text-xs text-blue-400">
                    예시: AAPL, Apple Inc., 주식, 10, 150.50, USD
                  </p>
                  <p className="text-xs text-blue-400 mt-1">
                    💡 Currency: USD (해외주식), KRW (국내주식)
                  </p>
                </div>

                <label className="cyber-btn flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto">
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
                <h4 className="font-semibold text-cyan-300 mb-3">📤 데이터 내보내기</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleCSVExport}
                    disabled={assets.length === 0}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-cyan-500/30 rounded-lg text-cyan-300 transition-colors flex items-center justify-center gap-2"
                  >
                    <FileText className="w-5 h-5" />
                    CSV 다운로드
                  </button>
                  <button
                    onClick={handleJSONExport}
                    disabled={assets.length === 0}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-cyan-500/30 rounded-lg text-cyan-300 transition-colors flex items-center justify-center gap-2"
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
              <div className="bg-slate-800 border border-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-gray-300 mb-2">📋 CSV 템플릿 샘플</h4>
                <pre className="text-xs bg-slate-950 p-3 rounded border border-gray-800 text-gray-300 overflow-x-auto font-mono">
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
          onSave={async (data) => {
            // Optimistic UI update
            setAccountPrincipals(prev => ({
              ...prev,
              [editingAccount]: data
            }))

            // Persist to storage
            await dataSync.saveAccountPrincipal(editingAccount, data)

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

      {/* Edit Asset Modal */}
      {editingAsset && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl max-w-sm w-full p-6 border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.15)] relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                자산 수정 <span className="text-cyan-400 text-base font-normal">({editingAsset.name})</span>
              </h3>
              <button onClick={handleCloseEditModal} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveAssetEdit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-cyan-300">보유 수량</label>
                <input
                  type="number"
                  name="quantity"
                  value={editFormData.quantity}
                  onChange={handleEditInputChange}
                  required
                  step="0.000001"
                  min="0"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-cyan-300">
                  평균 단가 <span className="text-slate-500">({editingAsset.currency})</span>
                </label>
                <input
                  type="number"
                  name="avgPrice"
                  value={editFormData.avgPrice}
                  onChange={handleEditInputChange}
                  required
                  step="0.000001"
                  min="0"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-cyan-500/30">
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-4 rounded-t-2xl border-b border-blue-500/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">
                {accountName} - 원금/예수금 관리
              </h3>
              <p className="text-sm text-blue-200 mt-1">투자 원금 및 잔여 예수금을 입력하세요</p>
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
              <label className="block text-sm font-medium text-gray-300 mb-2">
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
                className="w-full px-4 py-2.5 bg-slate-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">초기 투입 금액</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
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
                className="w-full px-4 py-2.5 bg-slate-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">현재 잔여 금액</p>
            </div>
          </div>

          {/* Info about manual input */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-300 mb-1">📝 원금/예수금은 참고용 입력값입니다</p>
            <p className="text-xs text-blue-400">
              실제 투자금과 평가금액은 포트폴리오의 보유 자산 데이터에서 자동 계산됩니다
            </p>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              비고
            </label>
            <textarea
              name="note"
              value={formData.note}
              onChange={handleChange}
              rows="3"
              placeholder="메모나 특이사항을 입력하세요"
              className="w-full px-4 py-2.5 bg-slate-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-500 resize-none"
            />
          </div>

          {/* Info Box */}
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
            <p className="text-sm text-amber-500 font-medium mb-2">📊 자동 계산 항목 안내</p>
            <ul className="text-xs text-amber-400 space-y-1">
              <li>• <strong>투자금</strong>: 이 계좌 보유 자산의 총 매수금액 (보유량 × 평균단가)</li>
              <li>• <strong>평가금액</strong>: 이 계좌 보유 자산의 현재 시가총액 (보유량 × 현재가)</li>
              <li>• <strong>손익</strong>: 평가금액 - 투자금 (실제 수익/손실)</li>
              <li className="pt-1 border-t border-amber-500/20 mt-2">💡 USD 자산은 실시간 환율로 원화 환산됩니다</li>
            </ul>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-700 rounded-lg text-gray-300 hover:bg-slate-800 transition-colors font-medium"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 cyber-btn"
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
