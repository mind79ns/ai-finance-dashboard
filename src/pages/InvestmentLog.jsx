import { useState, useEffect, useMemo, useCallback } from 'react'
import { Calendar as CalendarIcon, Plus, Filter, X, List, CalendarDays, Download, Trash2, MoveDown, MoveUp, Edit, Sparkles } from 'lucide-react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import ChartCard from '../components/ChartCard'
import dataSync from '../utils/dataSync'
import aiService from '../services/aiService'

const InvestmentLog = () => {
  // 통화별 금액 포맷 헬퍼
  const formatCurrency = (value, currency) => {
    if (currency === 'KRW') {
      return `₩${Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`
    }
    return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  }

  // 로그의 통화를 결정하는 헬퍼 (기존 로그에 currency가 없는 경우 포트폴리오에서 추론)
  const getLogCurrency = (log) => {
    if (log.currency) return log.currency
    // 포트폴리오에서 해당 자산의 통화 추론
    const asset = portfolioAssets.find(a => a.symbol === log.asset)
    if (asset) return asset.currency || 'USD'
    // 6자리 숫자 심볼이면 KRW 종목으로 추정
    if (/^\d{5,6}$/.test(log.asset)) return 'KRW'
    return 'USD'
  }
  const [logs, setLogs] = useState([])
  const [portfolioAssets, setPortfolioAssets] = useState([])

  // 매수/매도 저장 시 AI 한줄 코멘트 자동 생성 여부 — localStorage 토글
  const [aiCommentEnabled, setAiCommentEnabledState] = useState(() => {
    try {
      const stored = localStorage.getItem('ai_log_comment_enabled')
      return stored === null ? true : stored === 'true'
    } catch {
      return true
    }
  })
  const setAiCommentEnabled = (enabled) => {
    setAiCommentEnabledState(enabled)
    try {
      localStorage.setItem('ai_log_comment_enabled', enabled ? 'true' : 'false')
    } catch {
      // ignore
    }
  }

  const updateLogsState = useCallback(async (updater) => {
    return new Promise((resolve, reject) => {
      setLogs(prevLogs => {
        const nextLogs = typeof updater === 'function' ? updater(prevLogs) : updater

        // 상태 업데이트 후 비동기로 저장 처리
        if (Array.isArray(nextLogs)) {
          setTimeout(async () => {
            try {
              console.log('💾 투자일지 저장 시작, 로그 개수:', nextLogs.length)
              console.log('📝 저장할 로그 데이터:', nextLogs)
              const result = await dataSync.saveInvestmentLogs(nextLogs)
              console.log('✅ 투자일지 저장 완료:', result)
              resolve(result)
            } catch (error) {
              console.error('❌ 투자일지 저장 실패:', error)
              alert('투자일지 저장 중 오류가 발생했습니다. 다시 시도해주세요.')
              reject(error)
            }
          }, 0)
        } else {
          resolve()
        }

        return nextLogs
      })
    })
  }, [])

  const accountOptions = useMemo(() => {
    const accounts = new Set(['기본계좌'])
    portfolioAssets.forEach(asset => {
      if (asset.account) {
        accounts.add(asset.account)
      }
    })
    return Array.from(accounts)
  }, [portfolioAssets])

  const defaultAccountOption = accountOptions[0] || '기본계좌'

  const [filterType, setFilterType] = useState('all')
  const [filterMonth, setFilterMonth] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [viewMode, setViewMode] = useState('list') // 'list' or 'calendar'
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [editId, setEditId] = useState(null)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'buy',
    asset: '',
    customAsset: '',
    customAssetName: '',
    customAssetType: '주식',
    customAssetCurrency: 'USD',
    selectedAccount: defaultAccountOption,
    customAccountName: '',
    quantity: '',
    price: '',
    note: ''
  })

  const selectedPortfolioAsset = useMemo(() => {
    if (!formData.asset || formData.asset === '__custom__') {
      return null
    }
    return portfolioAssets.find(asset => asset.symbol === formData.asset) || null
  }, [formData.asset, portfolioAssets])

  useEffect(() => {
    setFormData(prev => {
      if (prev.selectedAccount === '__custom__') {
        return prev
      }
      if (accountOptions.includes(prev.selectedAccount)) {
        return prev
      }
      return {
        ...prev,
        selectedAccount: defaultAccountOption
      }
    })
  }, [accountOptions, defaultAccountOption])

  // Load logs and portfolio assets (Supabase-aware)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [loadedLogs, loadedAssets] = await Promise.all([
          dataSync.loadInvestmentLogs(),
          dataSync.loadPortfolioAssets()
        ])

        setLogs(Array.isArray(loadedLogs) ? loadedLogs : [])
        setPortfolioAssets(Array.isArray(loadedAssets) ? loadedAssets : [])
      } catch (error) {
        console.error('Failed to load investment logs:', error)
        setLogs([])
        setPortfolioAssets([])
      }
    }

    loadInitialData()
  }, [])

  // Helper to get asset name from portfolio assets
  const getAssetName = (symbol) => {
    const asset = portfolioAssets.find(a => a.symbol === symbol)
    return asset ? asset.name : ''
  }

  const filteredLogs = logs.filter(log => {
    if (filterType !== 'all' && log.type !== filterType) return false
    if (filterMonth !== 'all') {
      const logMonth = new Date(log.date).getMonth()
      if (logMonth !== parseInt(filterMonth)) return false
    }
    return true
  })

  const monthlyStats = useMemo(() => {
    const buyLogs = logs.filter(l => l.type === 'buy')
    const sellLogs = logs.filter(l => l.type === 'sell')

    const totalBuyUSD = buyLogs.filter(l => getLogCurrency(l) === 'USD').reduce((sum, l) => sum + l.total, 0)
    const totalBuyKRW = buyLogs.filter(l => getLogCurrency(l) === 'KRW').reduce((sum, l) => sum + l.total, 0)
    const totalSellUSD = sellLogs.filter(l => getLogCurrency(l) === 'USD').reduce((sum, l) => sum + l.total, 0)
    const totalSellKRW = sellLogs.filter(l => getLogCurrency(l) === 'KRW').reduce((sum, l) => sum + l.total, 0)

    return {
      totalBuyUSD,
      totalBuyKRW,
      totalSellUSD,
      totalSellKRW,
      transactions: logs.length
    }
  }, [logs, portfolioAssets])

  const handleAddTransaction = () => {
    setEditId(null)
    setShowModal(true)
  }

  const handleEditLog = (log) => {
    setEditId(log.id)
    const existingAsset = portfolioAssets.find(a => a.symbol === log.asset)

    setFormData({
      date: log.date,
      type: log.type,
      asset: existingAsset ? log.asset : '__custom__',
      customAsset: existingAsset ? '' : log.asset,
      customAssetName: existingAsset ? '' : getAssetName(log.asset),
      customAssetType: existingAsset ? '주식' : '주식', // Default or infer
      customAssetCurrency: existingAsset ? existingAsset.currency : 'USD', // Default
      selectedAccount: existingAsset ? existingAsset.account : (defaultAccountOption || '__custom__'),
      customAccountName: '',
      quantity: log.quantity,
      price: log.price,
      note: log.note || ''
    })
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditId(null)
    setFormData({
      date: new Date().toISOString().split('T')[0],
      type: 'buy',
      asset: '',
      customAsset: '',
      customAssetName: '',
      customAssetType: '주식',
      customAssetCurrency: 'USD',
      selectedAccount: defaultAccountOption,
      customAccountName: '',
      quantity: '',
      price: '',
      note: ''
    })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const updates = { [name]: value }

      // 자산 선택 시 통화 자동 설정
      if (name === 'asset' && value !== '__custom__') {
        const selectedAsset = portfolioAssets.find(a => a.symbol === value)
        if (selectedAsset) {
          updates.customAssetCurrency = selectedAsset.currency || 'USD'
        }
      }
      return {
        ...prev,
        ...updates
      }
    })
  }

  // 매수/매도 거래에 대한 AI 한줄 코멘트 생성 — Gemini Flash (BASIC tier, 무료) 사용
  // 저장 완료 후 비동기로 호출. 결과 도착 시 log.metadata.aiComment 에 주입.
  const generateAIComment = useCallback(async (log) => {
    if (!aiCommentEnabled || !log || !log.id) return
    try {
      const asset = portfolioAssets.find(a => a.symbol === log.asset)
      const ctx = {
        종목: log.asset,
        종목명: asset?.name || log.asset,
        거래종류: log.type === 'buy' ? '매수' : '매도',
        수량: log.quantity,
        거래가격: log.price,
        통화: log.currency,
        평균단가: asset?.avgPrice,
        현재시세: asset?.currentPrice,
        현재수익률: asset?.profitPercent != null ? `${Number(asset.profitPercent).toFixed(2)}%` : null
      }
      const prompt = `다음 거래에 대해 한국 투자자 관점에서 1~2문장의 짧고 객관적인 코멘트를 작성해주세요.
- 거래의 객관적 사실 한 가지 + 짧은 시사점/리스크 한 가지.
- 매수가가 현재 평단/시세와 어떻게 다른지 언급 가능.
- 단정적 매도 권유는 피하고, 균형 잡힌 시각.
- 60자 이내로 짧게.

거래 정보:
${JSON.stringify(ctx, null, 2)}`

      const text = await aiService.routeAIRequest(
        prompt,
        aiService.TASK_LEVEL.BASIC,
        '당신은 한국 투자자를 위한 간결한 매매 코멘트 어시스턴트입니다. 1~2문장의 짧고 균형 잡힌 시각을 제공합니다.',
        'auto',
        { maxTokens: 200, skipCache: true }
      )

      if (text && text.trim()) {
        await updateLogsState(prev => prev.map(l =>
          l.id === log.id
            ? { ...l, metadata: { ...(l.metadata || {}), aiComment: text.trim(), aiCommentAt: new Date().toISOString() } }
            : l
        ))
      }
    } catch (err) {
      console.warn('AI quick comment failed:', err.message)
    }
  }, [aiCommentEnabled, portfolioAssets, updateLogsState])

  const handleSubmit = async (e) => {
    e.preventDefault()

    // 자산 심볼 결정: __custom__ 또는 직접 입력
    const assetSymbol = formData.asset === '__custom__'
      ? formData.customAsset.trim()
      : formData.asset.trim()

    if (!assetSymbol) {
      alert('자산 심볼을 입력해주세요.')
      return
    }

    if (formData.selectedAccount === '__custom__' && !(formData.customAccountName || '').trim()) {
      alert('새 계좌 이름을 입력해주세요.')
      return
    }

    const quantity = parseFloat(formData.quantity)
    const price = parseFloat(formData.price)

    if (!Number.isFinite(quantity) || quantity <= 0) {
      alert('유효한 수량을 입력해주세요.')
      return
    }

    if (!Number.isFinite(price) || price <= 0) {
      alert('유효한 가격을 입력해주세요.')
      return
    }

    const total = quantity * price

    const normalizedAssetSymbol = assetSymbol.toUpperCase()
    const existingAsset = portfolioAssets.find(asset => asset.symbol === normalizedAssetSymbol)
    const resolvedAccount = formData.selectedAccount === '__custom__'
      ? (formData.customAccountName || '').trim()
      : (formData.selectedAccount || '').trim()
    const accountForNewAsset = resolvedAccount || defaultAccountOption

    // 신규 자산 정보 생성 (매수이고 기존 자산이 없을 때)
    const newAssetDetails = formData.type === 'buy' && !existingAsset
      ? {
        name: (formData.customAssetName || '').trim() || normalizedAssetSymbol,
        type: (formData.customAssetType || '주식'),
        currency: (formData.customAssetCurrency || 'USD').toUpperCase(),
        account: accountForNewAsset
      }
      : null

    // 통화 결정: 기존 자산이면 해당 자산의 currency, 신규 자산이면 formData의 customAssetCurrency
    const logCurrency = existingAsset
      ? (existingAsset.currency || 'USD')
      : (formData.customAssetCurrency || 'USD').toUpperCase()

    const newLog = {
      id: editId || Date.now(), // 수정 시 ID 유지
      date: formData.date,
      type: formData.type,
      asset: normalizedAssetSymbol,
      quantity,
      price,
      total,
      currency: logCurrency,
      note: formData.note
    }

    try {
      if (editId) {
        // 수정 모드
        const oldLog = logs.find(l => l.id === editId)
        if (oldLog) {
          // 1. 기존 로그의 포트폴리오 효과 롤백
          await revertPortfolioFromTransaction(oldLog)
          // 2. 로그 업데이트
          await updateLogsState(prev => prev.map(l => l.id === editId ? newLog : l))
          console.log('✅ 거래 로그 수정 성공')
          // 3. 새 로그의 포트폴리오 효과 적용
          await updatePortfolioFromTransaction(newLog, { newAssetDetails })
        }
      } else {
        // 추가 모드
        await updateLogsState(prev => [newLog, ...prev])
        console.log('✅ 거래 로그 저장 성공')
        // 포트폴리오 자동 업데이트
        await updatePortfolioFromTransaction(newLog, { newAssetDetails })
      }
    } catch (error) {
      console.error('❌ 거래 로그 저장/수정 실패:', error)
      return // 저장 실패시 중단
    }

    handleCloseModal()

    // 저장 완료 후 AI 한줄 코멘트 비동기 생성 (UI 블로킹 없음, 토글 OFF 시 스킵)
    generateAIComment(newLog)
  }

  // 거래 내역으로 포트폴리오 업데이트
  const updatePortfolioFromTransaction = useCallback(async (transaction, { newAssetDetails } = {}) => {
    console.log('📊 포트폴리오 업데이트 시작:', {
      transaction,
      newAssetDetails,
      currentAssetsCount: portfolioAssets.length
    })

    return new Promise((resolve, reject) => {
      setPortfolioAssets(prevAssets => {
        const assets = prevAssets.map(asset => ({ ...asset }))
        let assetsChanged = false

        const transactionSymbol = (transaction.asset || '').toUpperCase()
        const assetIndex = assets.findIndex(a => a.symbol === transactionSymbol)
        const quantityValue = Number(transaction.quantity)
        const priceValue = Number(transaction.price)

        console.log('🔍 자산 검색 결과:', {
          symbol: transactionSymbol,
          foundIndex: assetIndex,
          isNewAsset: assetIndex < 0
        })

        if (!Number.isFinite(quantityValue)) {
          console.warn('❌ Invalid transaction quantity:', transaction)
          setTimeout(() => resolve(), 0)
          return prevAssets
        }

        if (transaction.type === 'buy') {
          if (!Number.isFinite(priceValue)) {
            console.warn('❌ Invalid transaction price for buy transaction:', transaction)
            setTimeout(() => resolve(), 0)
            return prevAssets
          }

          if (assetIndex >= 0) {
            // 기존 자산 업데이트
            const asset = assets[assetIndex]
            const totalQuantity = asset.quantity + quantityValue
            const totalCost = (asset.quantity * asset.avgPrice) + (quantityValue * priceValue)
            const newAvgPrice = totalQuantity > 0 ? totalCost / totalQuantity : priceValue
            const currentPrice = Number.isFinite(asset.currentPrice) ? asset.currentPrice : priceValue
            const profitPercent = newAvgPrice !== 0 ? ((currentPrice - newAvgPrice) / newAvgPrice) * 100 : 0

            assets[assetIndex] = {
              ...asset,
              quantity: totalQuantity,
              avgPrice: newAvgPrice,
              currentPrice,
              totalValue: totalQuantity * currentPrice,
              profit: (totalQuantity * currentPrice) - (totalQuantity * newAvgPrice),
              profitPercent
            }
            console.log('✅ 기존 자산 업데이트:', assets[assetIndex])
            assetsChanged = true
          } else {
            // 신규 자산 추가
            const details = newAssetDetails || {}
            const currency = (details.currency || 'USD').toUpperCase()
            const account = details.account || '기본계좌'
            const type = details.type || '주식'
            const name = details.name || transactionSymbol
            const totalValue = quantityValue * priceValue

            const newAsset = {
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
            }

            assets.push(newAsset)
            console.log('✅ 신규 자산 추가:', newAsset)
            assetsChanged = true
          }
        } else if (transaction.type === 'sell') {
          if (assetIndex >= 0) {
            const asset = assets[assetIndex]
            const newQuantity = asset.quantity - quantityValue

            if (newQuantity <= 0) {
              console.log('🗑️ 자산 완전 매도:', asset.symbol)
              assets.splice(assetIndex, 1)
            } else {
              const currentPrice = Number.isFinite(asset.currentPrice)
                ? asset.currentPrice
                : (Number.isFinite(priceValue) ? priceValue : asset.avgPrice)
              const profitPercent = asset.avgPrice !== 0
                ? ((currentPrice - asset.avgPrice) / asset.avgPrice) * 100
                : 0

              assets[assetIndex] = {
                ...asset,
                quantity: newQuantity,
                totalValue: newQuantity * currentPrice,
                profit: (newQuantity * currentPrice) - (newQuantity * asset.avgPrice),
                profitPercent
              }
              console.log('✅ 자산 일부 매도:', assets[assetIndex])
            }
            assetsChanged = true
          } else {
            console.warn('⚠️ 매도하려는 자산을 찾을 수 없음:', transactionSymbol)
          }
        }

        // 상태 업데이트 후 비동기로 저장 처리
        if (assetsChanged && Array.isArray(assets)) {
          setTimeout(async () => {
            try {
              console.log('💾 포트폴리오 저장 시도, 자산 개수:', assets.length)
              console.log('📝 저장할 포트폴리오 데이터:', assets)
              await dataSync.savePortfolioAssets(assets)
              console.log('✅ 포트폴리오 저장 성공')
              resolve(assets)
            } catch (error) {
              console.error('❌ 포트폴리오 저장 실패:', error)
              alert('포트폴리오 저장 중 오류가 발생했습니다. 다시 시도해주세요.')
              reject(error)
            }
          }, 0)
        } else {
          console.log('ℹ️ 포트폴리오 변경사항 없음')
          setTimeout(() => resolve(), 0)
        }

        return assetsChanged ? assets : prevAssets
      })
    })
  }, [portfolioAssets.length])

  // 거래 취소/삭제로 인한 포트폴리오 롤백
  const revertPortfolioFromTransaction = useCallback(async (transaction) => {
    console.log('↩️ 포트폴리오 롤백 시작:', { transaction })

    return new Promise((resolve, reject) => {
      setPortfolioAssets(prevAssets => {
        const assets = prevAssets.map(asset => ({ ...asset }))
        let assetsChanged = false

        const transactionSymbol = (transaction.asset || '').toUpperCase()
        const assetIndex = assets.findIndex(a => a.symbol === transactionSymbol)
        const quantityValue = Number(transaction.quantity)
        const priceValue = Number(transaction.price)

        if (assetIndex < 0) {
          console.warn('⚠️ 롤백할 자산을 찾을 수 없음:', transactionSymbol)
          // 자산이 이미 없으면 롤백할 게 없음 (또는 오류상황)
          setTimeout(() => resolve(), 0)
          return prevAssets
        }

        const asset = assets[assetIndex]

        if (transaction.type === 'buy') {
          // 매수 취소 -> 수량 감소, 평단가 재계산
          // 현재 총 매입금액 (Total Cost)
          const currentTotalCost = asset.quantity * asset.avgPrice
          // 취소할 매입금액
          const revertCost = quantityValue * priceValue

          const newQuantity = asset.quantity - quantityValue

          if (newQuantity <= 0) {
            // 수량이 0 이하면 자산 삭제
            console.log('🗑️ 자산 삭제 (롤백으로 수량 0):', asset.symbol)
            assets.splice(assetIndex, 1)
          } else {
            const newTotalCost = currentTotalCost - revertCost
            // 부동소수점 오차 방지
            const newAvgPrice = newTotalCost > 0 ? newTotalCost / newQuantity : 0

            assets[assetIndex] = {
              ...asset,
              quantity: newQuantity,
              avgPrice: newAvgPrice,
              totalValue: newQuantity * asset.currentPrice,
              profit: (newQuantity * asset.currentPrice) - newTotalCost,
              profitPercent: newAvgPrice !== 0
                ? ((asset.currentPrice - newAvgPrice) / newAvgPrice) * 100
                : 0
            }
          }
          assetsChanged = true
        } else if (transaction.type === 'sell') {
          // 매도 취소 -> 수량 증가, 평단가 유지 (매도는 평단가 안바꿈)
          const newQuantity = asset.quantity + quantityValue
          // 수익금 등은 현재가 기준으로 재계산
          const currentPrice = asset.currentPrice

          assets[assetIndex] = {
            ...asset,
            quantity: newQuantity,
            totalValue: newQuantity * currentPrice,
            profit: (newQuantity * currentPrice) - (newQuantity * asset.avgPrice), // 평단가 유지
            // profitPercent 유지 (평단가 안변하므로)
          }
          assetsChanged = true
        }

        // 저장 및 업데이트
        if (assetsChanged) {
          setTimeout(async () => {
            try {
              await dataSync.savePortfolioAssets(assets)
              console.log('✅ 포트폴리오 롤백 저장 완료')
              resolve(assets)
            } catch (error) {
              console.error('❌ 포트폴리오 롤백 저장 실패:', error)
              reject(error)
            }
          }, 0)
        } else {
          setTimeout(() => resolve(), 0)
        }

        return assetsChanged ? assets : prevAssets
      })
    })
  }, [])

  const handleDeleteLog = async (id) => {
    if (window.confirm('이 거래 기록을 삭제하시겠습니까? 관련 자산 정보도 수정됩니다.')) {
      try {
        const logToDelete = logs.find(log => log.id === id)
        if (logToDelete) {
          // 1. 로그 삭제
          await updateLogsState(prev => prev.filter(log => log.id !== id))
          // 2. 포트폴리오 롤백
          await revertPortfolioFromTransaction(logToDelete)
          console.log('✅ 거래 로그 삭제 및 포트폴리오 동기화 성공')
        }
      } catch (error) {
        console.error('❌ 거래 로그 삭제 실패:', error)
      }
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
    <div className="cyber-dashboard min-h-screen p-4 sm:p-6 relative">
      {/* Stats Cards - Cyberpunk Style */}
      {/* Stats Cards - Cyberpunk Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="cyber-card cyber-card-glow flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <MoveDown className="w-16 h-16 text-rose-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-cyan-300/60 mb-1">총 매수금액</p>
            <p className="text-2xl font-bold text-rose-400 drop-shadow-sm">
              {monthlyStats.totalBuyUSD > 0 && `$${monthlyStats.totalBuyUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              {monthlyStats.totalBuyUSD > 0 && monthlyStats.totalBuyKRW > 0 && <br />}
              {monthlyStats.totalBuyKRW > 0 && `₩${monthlyStats.totalBuyKRW.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`}
              {monthlyStats.totalBuyUSD === 0 && monthlyStats.totalBuyKRW === 0 && '$0.00'}
            </p>
          </div>
          <div className="h-1 w-full bg-slate-800 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-rose-500/50 w-3/4 blur-sm transform origin-left"></div>
          </div>
        </div>
        <div className="cyber-card cyber-card-glow flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <MoveUp className="w-16 h-16 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-cyan-300/60 mb-1">총 매도금액</p>
            <p className="text-2xl font-bold text-emerald-400 drop-shadow-sm">
              {monthlyStats.totalSellUSD > 0 && `$${monthlyStats.totalSellUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              {monthlyStats.totalSellUSD > 0 && monthlyStats.totalSellKRW > 0 && <br />}
              {monthlyStats.totalSellKRW > 0 && `₩${monthlyStats.totalSellKRW.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`}
              {monthlyStats.totalSellUSD === 0 && monthlyStats.totalSellKRW === 0 && '$0.00'}
            </p>
          </div>
          <div className="h-1 w-full bg-slate-800 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-emerald-500/50 w-3/4 blur-sm transform origin-left"></div>
          </div>
        </div>
        <div className="cyber-card cyber-card-glow flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <List className="w-16 h-16 text-cyan-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-cyan-300/60 mb-1">총 거래 건수</p>
            <p className="text-2xl font-bold text-cyan-300 drop-shadow-sm">
              {monthlyStats.transactions}건
            </p>
          </div>
          <div className="h-1 w-full bg-slate-800 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-cyan-500/50 w-3/4 blur-sm transform origin-left"></div>
          </div>
        </div>
      </div>

      {/* View Mode Toggle and Add Button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-slate-800/50 border border-cyan-400/30 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${viewMode === 'list'
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-cyan-300/60 hover:text-cyan-300'
                }`}
            >
              <List className="w-4 h-4" />
              리스트
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${viewMode === 'calendar'
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-cyan-300/60 hover:text-cyan-300'
                }`}
            >
              <CalendarDays className="w-4 h-4" />
              캘린더
            </button>
          </div>

          {/* AI 코멘트 자동 생성 토글 — 매수/매도 저장 시 Gemini Flash 무료 호출 */}
          <button
            onClick={() => setAiCommentEnabled(!aiCommentEnabled)}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors border ${aiCommentEnabled
              ? 'bg-purple-500/20 text-purple-300 border-purple-400/50 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
              : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            title={aiCommentEnabled ? 'AI 한줄 코멘트 자동 생성 ON (Gemini Flash, 무료)' : 'AI 한줄 코멘트 OFF'}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-xs">AI 코멘트 {aiCommentEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Filters (only in list view) */}
          {viewMode === 'list' && (
            <>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-cyan-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 bg-slate-800/50 border border-cyan-400/30 text-cyan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                >
                  <option value="all">전체</option>
                  <option value="buy">매수</option>
                  <option value="sell">매도</option>
                </select>
              </div>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="px-3 py-2 bg-slate-800/50 border border-cyan-400/30 text-cyan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              >
                <option value="all">전체 기간</option>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(month => (
                  <option key={month} value={month}>{month + 1}월</option>
                ))}
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
          {/* Mobile Card View */}
          <div className="block sm:hidden space-y-3">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="w-12 h-12 text-cyan-400/40 mx-auto mb-4" />
                <p className="text-cyan-300/60">거래 내역이 없습니다</p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="border border-cyan-500/30 rounded-lg p-3 bg-slate-800/50 hover:bg-slate-700/50 transition-all shadow-lg hover:shadow-cyan-500/10">
                  {/* Header with date and type */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span className="text-xs text-cyan-300/80">{log.date}</span>
                    </div>
                    <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-full flex-shrink-0 ${log.type === 'buy'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                      {log.type === 'buy' ? '매수' : '매도'}
                    </span>
                  </div>

                  {/* Asset name */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-8 bg-cyan-500 rounded-full"></div>
                      <div className="flex flex-col">
                        <p className="text-sm font-bold text-cyan-300">{log.asset}</p>
                        <p className="text-xs text-slate-400">{getAssetName(log.asset)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Transaction details */}
                  <div className="grid grid-cols-2 gap-2 py-2 border-t border-cyan-500/20 text-xs">
                    <div>
                      <span className="text-cyan-300/60 block mb-1">수량</span>
                      <p className="font-medium text-slate-200">{log.quantity}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-cyan-300/60 block mb-1">가격</span>
                      <p className="font-medium text-slate-200">
                        {formatCurrency(log.price, getLogCurrency(log))}
                      </p>
                    </div>
                  </div>

                  {/* Total amount */}
                  <div className="flex items-center justify-between pt-2 border-t border-cyan-500/20 mt-1">
                    <span className="text-xs text-cyan-300/60">총액</span>
                    <span className="text-sm font-bold text-cyan-300 shadow-cyan-500/20 drop-shadow-sm">
                      {formatCurrency(log.total, getLogCurrency(log))}
                    </span>
                  </div>

                  {/* Note */}
                  {log.note && (
                    <div className="pt-2 border-t border-cyan-500/20 mt-2">
                      <span className="text-xs text-slate-500">메모: </span>
                      <span className="text-xs text-slate-400">{log.note}</span>
                    </div>
                  )}

                  {/* AI 한줄 코멘트 */}
                  {log.metadata?.aiComment && (
                    <div className="pt-2 border-t border-cyan-500/20 mt-2 bg-purple-500/5 border border-purple-500/20 rounded-lg p-2">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-purple-200/90 leading-relaxed flex-1">{log.metadata.aiComment}</p>
                      </div>
                    </div>
                  )}

                  {/* Edit/Delete buttons for Mobile */}
                  <div className="pt-3 border-t border-cyan-500/20 mt-3 flex gap-2">
                    <button
                      onClick={() => handleEditLog(log)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors text-xs font-medium border border-blue-500/20"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      수정
                    </button>
                    <button
                      onClick={() => handleDeleteLog(log.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors text-xs font-medium border border-rose-500/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      삭제
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full cyber-table">
              <thead>
                <tr className="border-b border-cyan-500/30">
                  <th className="text-left py-3 px-4 text-sm font-medium text-cyan-300">날짜</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-cyan-300">유형</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-cyan-300">자산</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-cyan-300">수량</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-cyan-300">가격</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-cyan-300">총액</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-cyan-300">메모</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-cyan-300">관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors">
                    <td className="py-4 px-4 text-sm text-slate-300">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-slate-500" />
                        {log.date}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${log.type === 'buy'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                        {log.type === 'buy' ? '매수' : '매도'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-cyan-300">{log.asset}</span>
                        <span className="text-xs text-slate-500">{getAssetName(log.asset)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right text-sm text-slate-300">
                      {log.quantity}
                    </td>
                    <td className="py-4 px-4 text-right text-sm text-slate-300">
                      {formatCurrency(log.price, getLogCurrency(log))}
                    </td>
                    <td className="py-4 px-4 text-right text-sm font-medium text-slate-200">
                      {formatCurrency(log.total, getLogCurrency(log))}
                    </td>
                    <td className="py-4 px-4 text-sm text-slate-400">
                      {log.note && <div>{log.note}</div>}
                      {log.metadata?.aiComment && (
                        <div className="flex items-start gap-1.5 mt-1 text-purple-300/90">
                          <Sparkles className="w-3 h-3 text-purple-400 flex-shrink-0 mt-0.5" />
                          <span className="text-xs leading-snug">{log.metadata.aiComment}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditLog(log)}
                          className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="수정"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ... */}
          </div>
        </ChartCard>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 cyber-card cyber-card-glow">
            <h3 className="text-lg font-semibold text-cyan-300 mb-4">거래 캘린더</h3>
            <style>{`
              .react-calendar {
                width: 100%;
                border: none;
                font-family: inherit;
                background-color: transparent;
                color: #e2e8f0;
              }
              .react-calendar__tile {
                padding: 1rem 0.5rem;
                height: 90px;
                color: #cbd5e1;
              }
              .react-calendar__tile:enabled:hover,
              .react-calendar__tile:enabled:focus {
                background-color: rgba(6, 182, 212, 0.1);
                border-radius: 0.5rem;
              }
              .react-calendar__tile--active {
                background: linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%) !important;
                border: 1px solid rgba(6, 182, 212, 0.4);
                border-radius: 0.5rem;
                color: #22d3ee !important;
                box-shadow: 0 0 10px rgba(6, 182, 212, 0.2);
              }
              .react-calendar__tile--now {
                background: rgba(148, 163, 184, 0.1);
                border-radius: 0.5rem;
                border: 1px solid rgba(148, 163, 184, 0.2);
              }
              .calendar-profit {
                background: rgba(16, 185, 129, 0.05);
                border-radius: 0.5rem;
              }
              .calendar-loss {
                background: rgba(244, 63, 94, 0.05);
                border-radius: 0.5rem;
              }
              .calendar-neutral {
                background: rgba(100, 116, 139, 0.05);
                border-radius: 0.5rem;
              }
              .react-calendar__navigation button {
                font-size: 1rem;
                font-weight: 600;
                color: #22d3ee;
              }
              .react-calendar__navigation button:disabled {
                background-color: transparent;
              }
              .react-calendar__navigation button:enabled:hover,
              .react-calendar__navigation button:enabled:focus {
                background-color: rgba(6, 182, 212, 0.1);
                border-radius: 0.5rem;
              }
              .react-calendar__month-view__weekdays__weekday {
                color: #94a3b8;
                text-decoration: none;
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

          <div className="cyber-card cyber-card-glow h-fit">
            <h3 className="text-lg font-semibold text-cyan-300 mb-4 border-b border-cyan-500/20 pb-3">
              {selectedDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </h3>
            <div className="space-y-3">
              {selectedDateLogs.length > 0 ? (
                selectedDateLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-cyan-500/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`inline-block px-2 py-1 text-xs font-bold rounded ${log.type === 'buy'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                        {log.type === 'buy' ? '매수' : '매도'}
                      </span>
                      <div className="text-right">
                        <span className="block text-sm font-bold text-cyan-300">{log.asset}</span>
                        <span className="block text-xs text-slate-500">{getAssetName(log.asset)}</span>
                      </div>
                    </div>
                    <div className="text-sm text-slate-400 space-y-1">
                      <div className="flex justify-between">
                        <span>수량</span>
                        <span className="text-slate-200">{log.quantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>가격</span>
                        <span className="text-slate-200">{formatCurrency(log.price, getLogCurrency(log))}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-700 mt-1">
                        <span className="font-medium text-cyan-300/80">총액</span>
                        <span className="font-bold text-cyan-300">
                          {formatCurrency(log.total, getLogCurrency(log))}
                        </span>
                      </div>
                      {log.note && (
                        <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-700">
                          {log.note}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p className="text-sm">이 날짜에 거래 내역이 없습니다</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.15)] relative overflow-x-hidden">
            {/* Background Glow Effects */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                    {editId ? '거래 수정' : '거래 추가'}
                  </h3>
                  <p className="text-slate-400 text-sm mt-1">포트폴리오에 새로운 거래를 기록합니다</p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Date Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-cyan-300">날짜</label>
                  <div className="relative">
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                    />
                    <CalendarIcon className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Type Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'buy' }))}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${formData.type === 'buy'
                      ? 'bg-rose-500/10 border-rose-500/50 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700/50'
                      }`}
                  >
                    <span className="font-bold">매수 (Buy)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'sell' }))}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${formData.type === 'sell'
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700/50'
                      }`}
                  >
                    <span className="font-bold">매도 (Sell)</span>
                  </button>
                </div>

                {/* Asset Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-cyan-300">자산 선택</label>
                  <select
                    name="asset"
                    value={formData.asset}
                    onChange={handleInputChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all appearance-none"
                  >
                    <option value="" disabled className="bg-slate-800 text-slate-400">자산을 선택하세요</option>
                    {portfolioAssets.map(asset => (
                      <option key={asset.id || asset.symbol} value={asset.symbol} className="bg-slate-800 text-slate-200">
                        {asset.name} ({asset.symbol}) - 현보유: {asset.quantity}
                      </option>
                    ))}
                    <option value="__custom__" className="bg-slate-800 text-cyan-300 font-medium">+ 직접 입력 (새로운 자산)</option>
                  </select>
                </div>

                {/* Custom Asset Inputs - Conditional */}
                {formData.asset === '__custom__' && (
                  <div className="p-4 bg-slate-800/30 rounded-xl border border-dashed border-slate-700 space-y-4 animate-fadeIn">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs text-slate-400">종목코드 (Ticker)</label>
                        <input
                          type="text"
                          name="customAsset"
                          value={formData.customAsset}
                          onChange={handleInputChange}
                          placeholder="AAPL"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-cyan-500/50 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-slate-400">종목명</label>
                        <input
                          type="text"
                          name="customAssetName"
                          value={formData.customAssetName}
                          onChange={handleInputChange}
                          placeholder="Apple Inc."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-cyan-500/50 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs text-slate-400">자산 유형</label>
                        <select
                          name="customAssetType"
                          value={formData.customAssetType}
                          onChange={handleInputChange}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-cyan-500/50 focus:outline-none"
                        >
                          <option value="주식">주식</option>
                          <option value="코인">코인</option>
                          <option value="부동산">부동산</option>
                          <option value="현금">현금</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-slate-400">통화</label>
                        <select
                          name="customAssetCurrency"
                          value={formData.customAssetCurrency}
                          onChange={handleInputChange}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-cyan-500/50 focus:outline-none"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="KRW">KRW (₩)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Account Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-cyan-300">계좌 선택</label>
                  <select
                    name="selectedAccount"
                    value={formData.selectedAccount}
                    onChange={handleInputChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                  >
                    {accountOptions.map(option => (
                      <option key={option} value={option} className="bg-slate-800 text-slate-200">{option}</option>
                    ))}
                    <option value="__custom__" className="bg-slate-800 text-cyan-300 font-medium">+ 새 계좌 입력</option>
                  </select>
                  {formData.selectedAccount === '__custom__' && (
                    <input
                      type="text"
                      name="customAccountName"
                      value={formData.customAccountName}
                      onChange={handleInputChange}
                      placeholder="새 계좌 이름 입력 (예: 키움증권)"
                      className="w-full mt-2 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:border-cyan-500/50 focus:outline-none"
                    />
                  )}
                </div>

                {/* Quantity & Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-cyan-300">수량</label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      required
                      step="0.000001"
                      min="0"
                      placeholder="0"
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <label className="text-sm font-medium text-cyan-300">
                        단가 <span className="text-slate-500 font-normal">({formData.customAssetCurrency === 'KRW' ? '₩' : '$'})</span>
                      </label>
                      <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700 mb-1">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, customAssetCurrency: 'USD' }))}
                          className={`px-2 py-1 text-[10px] rounded-md transition-all ${formData.customAssetCurrency !== 'KRW'
                            ? 'bg-cyan-500/20 text-cyan-400 font-bold shadow-sm'
                            : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                          USD
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, customAssetCurrency: 'KRW' }))}
                          className={`px-2 py-1 text-[10px] rounded-md transition-all ${formData.customAssetCurrency === 'KRW'
                            ? 'bg-cyan-500/20 text-cyan-400 font-bold shadow-sm'
                            : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                          KRW
                        </button>
                      </div>
                    </div>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      required
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                    />
                  </div>
                </div>

                {/* Total Preview */}
                <div className="bg-slate-800/30 rounded-xl p-4 flex justify-between items-center border border-slate-700/50">
                  <span className="text-slate-400 text-sm">총 거래금액</span>
                  <span className="text-xl font-bold text-cyan-300">
                    {formData.customAssetCurrency === 'KRW' ? '₩' : '$'}
                    {((parseFloat(formData.quantity) || 0) * (parseFloat(formData.price) || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Note */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-cyan-300">메모 (선택)</label>
                  <textarea
                    name="note"
                    value={formData.note}
                    onChange={handleInputChange}
                    rows="2"
                    placeholder="거래 관련 메모..."
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-all font-medium"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/20 transition-all transform hover:-translate-y-0.5"
                  >
                    {editId ? '수정 완료' : '거래내역 추가'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InvestmentLog
