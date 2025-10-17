const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

const safeNumber = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export const formatNumber = (value, digits = 2) => {
  const numeric = safeNumber(value)
  if (numeric === null) return 'N/A'
  return numeric.toFixed(digits)
}

const formatPercent = (value, digits = 2) => {
  const numeric = safeNumber(value)
  if (numeric === null) return 'N/A'
  const rounded = numeric.toFixed(digits)
  return `${numeric >= 0 ? '+' : ''}${rounded}%`
}

export const formatCurrency = (value, currency = 'KRW', digits = 0) => {
  const numeric = safeNumber(value)
  if (numeric === null) return 'N/A'
  const formatter = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })
  return formatter.format(numeric)
}

/**
 * Create quick market insights from raw market snapshot.
 * Returns sentiment, highlights, and risk alerts that can be reused for prompts/UI.
 */
export const computeMarketInsights = (marketData) => {
  if (!marketData) return null

  const indices = Object.values(marketData.stocks || {})
    .map(item => ({
      name: item.name || item.symbol,
      symbol: item.symbol,
      price: safeNumber(item.price),
      change: safeNumber(item.change),
      changePercent: safeNumber(item.changePercent)
    }))
    .filter(item => item.changePercent !== null)
    .sort((a, b) => b.changePercent - a.changePercent)

  const crypto = Object.values(marketData.crypto || {})
    .map(item => ({
      name: item.name || item.symbol,
      symbol: item.symbol,
      price: safeNumber(item.price),
      change24h: safeNumber(item.change24h)
    }))
    .filter(item => item.change24h !== null)
    .sort((a, b) => b.change24h - a.change24h)

  const gold = marketData.gold
    ? {
        name: 'Gold',
        price: safeNumber(marketData.gold.price),
        changePercent: safeNumber(marketData.gold.changePercent)
      }
    : null

  const usdKrw = marketData.currency?.usdKrw
    ? {
        base: marketData.currency.usdKrw.base,
        target: marketData.currency.usdKrw.target,
        rate: safeNumber(marketData.currency.usdKrw.rate)
      }
    : null

  const indexAverage = indices.length > 0
    ? indices.reduce((sum, item) => sum + item.changePercent, 0) / indices.length
    : 0

  const sentiment = (() => {
    if (indices.length === 0) return { label: '데이터 부족', tone: 'neutral' }
    if (indexAverage >= 1.5) return { label: '강한 상승(High Bullish)', tone: 'bullish' }
    if (indexAverage >= 0.1) return { label: '완만한 상승(Mild Bullish)', tone: 'slightly-bullish' }
    if (indexAverage <= -1.5) return { label: '강한 하락(High Bearish)', tone: 'bearish' }
    if (indexAverage <= -0.1) return { label: '완만한 하락(Mild Bearish)', tone: 'slightly-bearish' }
    return { label: '보합권(Neutral)', tone: 'neutral' }
  })()

  const quickHighlights = []
  if (indices[0]) {
    quickHighlights.push(`주요 지수 최고 상승: ${indices[0].name} ${formatPercent(indices[0].changePercent)}`)
  }
  if (indices[indices.length - 1]) {
    quickHighlights.push(`주요 지수 최저 성과: ${indices[indices.length - 1].name} ${formatPercent(indices[indices.length - 1].changePercent)}`)
  }
  if (crypto[0] && Math.abs(crypto[0].change24h) >= 4) {
    quickHighlights.push(`가장 큰 코인 변동성: ${crypto[0].name} ${formatPercent(crypto[0].change24h)}`)
  }
  if (gold && gold.changePercent !== null) {
    quickHighlights.push(`금(Gold) 변동: ${formatPercent(gold.changePercent)}`)
  }
  if (usdKrw && usdKrw.rate !== null) {
    quickHighlights.push(`USD/KRW 환율: ${formatNumber(usdKrw.rate, 2)}`)
  }

  const riskSignals = []
  const worstIndex = indices[indices.length - 1]
  if (worstIndex && worstIndex.changePercent <= -1.5) {
    riskSignals.push(`지수 급락: ${worstIndex.name} ${formatPercent(worstIndex.changePercent)} (${worstIndex.symbol})`)
  }
  const worstCrypto = crypto[crypto.length - 1]
  if (worstCrypto && worstCrypto.change24h <= -6) {
    riskSignals.push(`코인 급락: ${worstCrypto.name} ${formatPercent(worstCrypto.change24h)}`)
  }
  if (gold && gold.changePercent !== null && Math.abs(gold.changePercent) >= 2) {
    riskSignals.push(`금 가격 급변: ${formatPercent(gold.changePercent)}`)
  }

  return {
    sentiment,
    indexAverage,
    indices,
    crypto,
    gold,
    usdKrw,
    quickHighlights,
    riskSignals,
    lastUpdated: marketData.lastUpdated
  }
}

/**
 * Portfolio insights built from normalized portfolio snapshot.
 */
export const computePortfolioInsights = (portfolioData, goalsSummary) => {
  if (!portfolioData || !Array.isArray(portfolioData.assets) || portfolioData.assets.length === 0) {
    return null
  }

  const totalValueKRW = safeNumber(portfolioData.totalValue) || safeNumber(portfolioData.totals?.totalValueKRW)
  const totalProfitKRW = safeNumber(portfolioData.totalProfit) || safeNumber(portfolioData.totals?.totalProfitKRW)
  const profitPercent = safeNumber(portfolioData.profitPercent)

  const assetsSortedByValue = [...portfolioData.assets].sort((a, b) => (safeNumber(b.valueKRW) || 0) - (safeNumber(a.valueKRW) || 0))
  const largestPositions = assetsSortedByValue.slice(0, 3).map(asset => {
    const valueKRW = safeNumber(asset.valueKRW)
    const weight = totalValueKRW && valueKRW !== null ? (valueKRW / totalValueKRW) * 100 : null
    return {
      symbol: asset.symbol,
      name: asset.name,
      type: asset.type,
      valueKRW,
      valueOriginal: safeNumber(asset.valueOriginal),
      currency: asset.currency,
      weight,
      profitPercent: safeNumber(asset.profitPercent)
    }
  })

  const topPerformers = [...portfolioData.assets]
    .filter(asset => safeNumber(asset.profitPercent) !== null)
    .sort((a, b) => safeNumber(b.profitPercent) - safeNumber(a.profitPercent))
    .slice(0, 3)
    .map(asset => ({
      symbol: asset.symbol,
      profitPercent: safeNumber(asset.profitPercent),
      valueKRW: safeNumber(asset.valueKRW)
    }))

  const laggards = [...portfolioData.assets]
    .filter(asset => safeNumber(asset.profitPercent) !== null)
    .sort((a, b) => safeNumber(a.profitPercent) - safeNumber(b.profitPercent))
    .slice(0, 3)
    .map(asset => ({
      symbol: asset.symbol,
      profitPercent: safeNumber(asset.profitPercent),
      valueKRW: safeNumber(asset.valueKRW)
    }))

  const allocationByType = Object.entries(portfolioData.allocation || {})
    .map(([type, percent]) => ({
      type,
      percent: safeNumber(percent)
    }))
    .filter(item => item.percent !== null)
    .sort((a, b) => b.percent - a.percent)

  const currencyExposure = (portfolioData.totals?.byCurrency || [])
    .map(item => {
      const totalValue = safeNumber(item.totalValueKRW) ?? safeNumber(item.totalValue)
      const percent = (totalValueKRW && totalValue !== null)
        ? (totalValue / totalValueKRW) * 100
        : null
      return {
        currency: item.currency,
        percent,
        totalValueKRW: safeNumber(item.totalValueKRW)
      }
    })
    .filter(item => item.percent !== null)
    .sort((a, b) => b.percent - a.percent)

  const overweightTypes = allocationByType.filter(item => item.percent >= 45)
  const underweightTypes = allocationByType.filter(item => item.percent > 0 && item.percent <= 10)

  const quickHighlights = []
  if (profitPercent !== null) {
    quickHighlights.push(`현재 누적 수익률: ${formatPercent(profitPercent)}`)
  }
  if (largestPositions[0] && largestPositions[0].weight !== null) {
    quickHighlights.push(`최대 보유 자산: ${largestPositions[0].symbol} (${formatNumber(largestPositions[0].weight, 1)}%)`)
  }
  if (currencyExposure[0]) {
    quickHighlights.push(`주요 통화 비중: ${currencyExposure[0].currency} ${formatNumber(currencyExposure[0].percent, 1)}%`)
  }

  const riskAlerts = []
  if (overweightTypes.length > 0) {
    const labels = overweightTypes.map(item => `${item.type} ${formatNumber(item.percent, 1)}%`)
    riskAlerts.push(`과도 비중 섹터: ${labels.join(', ')}`)
  }
  if (currencyExposure[0] && currencyExposure[0].percent >= 70) {
    riskAlerts.push(`${currencyExposure[0].currency} 노출이 ${formatNumber(currencyExposure[0].percent, 1)}%로 높음`)
  }
  if (laggards[0] && safeNumber(laggards[0].profitPercent) !== null && laggards[0].profitPercent <= -5) {
    riskAlerts.push(`손실 확대 자산: ${laggards[0].symbol} ${formatPercent(laggards[0].profitPercent)}`)
  }

  const goalHighlights = []
  if (goalsSummary) {
    const average = safeNumber(goalsSummary.averageProgress)
    if (average !== null) {
      goalHighlights.push(`목표 평균 달성률: ${formatNumber(average, 1)}%`)
    }
    if (goalsSummary.upcomingGoal) {
      goalHighlights.push(`다가오는 목표: ${goalsSummary.upcomingGoal.name} (${goalsSummary.upcomingGoal.targetDate})`)
    }
  }

  return {
    totalValueKRW,
    totalProfitKRW,
    profitPercent,
    largestPositions,
    topPerformers,
    laggards,
    allocationByType,
    currencyExposure,
    overweightTypes,
    underweightTypes,
    quickHighlights,
    riskAlerts,
    goalHighlights,
    baseCurrency: portfolioData.baseCurrency || 'KRW'
  }
}

const normalizeCategoryList = (items, fallback = [], options = {}) => {
  const list = Array.isArray(items) && items.length
    ? items.map(item => ({
        id: item?.id || item?.key || item?.name || '',
        name: item?.name || item?.label || item?.title || item?.id || '',
        isAccumulated: !!item?.isAccumulated,
        color: item?.color
      })).filter(item => item.id)
    : fallback

  if (options.ensureAccumulated) {
    const hasAccumulated = list.some(item => item.id === 'accumulated')
    if (!hasAccumulated) {
      list.unshift({
        id: 'accumulated',
        name: '기초자산',
        isAccumulated: true,
        color: '#6366f1'
      })
    } else {
      list.forEach(item => {
        if (item.id === 'accumulated') {
          item.isAccumulated = true
        }
      })
    }
  }

  return list
}

const sumTransactionsByMonth = (transactions, year, month, options = {}) => {
  const { currency, vndToKrwRate = 0.055 } = options
  if (!Array.isArray(transactions) || !transactions.length) return 0

  const total = transactions
    .filter(tx => {
      if (!tx?.date) return false
      const txDate = new Date(tx.date)
      if (Number.isNaN(txDate.getTime())) return false
      return txDate.getFullYear() === year && (txDate.getMonth() + 1) === month
    })
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)

  if ((currency || '').toLowerCase() === 'vnd') {
    return total * vndToKrwRate
  }

  return total
}

export const computeCashflowInsights = ({
  statusData = {},
  incomeCategories = [],
  expenseCategories = [],
  transactionHistory = { vnd: [], usd: [], krw: [] },
  vndToKrwRate = 0.055,
  targetYear,
  referenceDate = new Date()
} = {}) => {
  const normalizedIncome = normalizeCategoryList(incomeCategories, [], { ensureAccumulated: true })
  const normalizedExpense = normalizeCategoryList(expenseCategories)

  const availableYears = Object.keys(statusData || {})
    .map(key => Number(key))
    .filter(year => Number.isFinite(year))
    .sort((a, b) => a - b)

  let year = Number(targetYear)
  if (!Number.isFinite(year)) {
    year = availableYears.length ? availableYears[availableYears.length - 1] : referenceDate.getFullYear()
  }

  const yearKey = statusData[year] ? year : String(year)
  const yearData = (statusData && (statusData[yearKey] || statusData[String(yearKey)])) || {}

  const monthlySummaries = []
  let accumulatedAmount = 0

  for (let i = 0; i < 12; i++) {
    const monthNumber = i + 1
    const monthKey = yearData[monthNumber] ? monthNumber : String(monthNumber)
    const rawMonth = (yearData && yearData[monthKey]) || {}
    const monthData = { ...rawMonth }

    const krwTotal = sumTransactionsByMonth(transactionHistory?.krw, year, monthNumber, { currency: 'krw' })
    if (krwTotal > 0) {
      monthData.loan = krwTotal
    }

    const vndTotal = sumTransactionsByMonth(transactionHistory?.vnd, year, monthNumber, { currency: 'vnd', vndToKrwRate })
    if (vndTotal > 0) {
      monthData.vnd = vndTotal
    }

    const monthIncome = normalizedIncome.reduce((sum, cat) => {
      if (cat.isAccumulated) return sum
      return sum + (Number(monthData[cat.id]) || 0)
    }, 0)

    const monthExpense = normalizedExpense.reduce((sum, cat) => {
      return sum + (Number(monthData[cat.id]) || 0)
    }, 0)

    const netChange = monthIncome - monthExpense

    if (i === 0) {
      accumulatedAmount = Number(monthData.accumulated || monthData['accumulated'] || 0)
    } else {
      const prev = monthlySummaries[i - 1]
      accumulatedAmount = (Number(prev?.accumulated) || 0) + (Number(prev?.netChange) || 0)
    }

    monthlySummaries.push({
      index: i,
      label: MONTH_LABELS[i],
      income: monthIncome,
      expense: monthExpense,
      netChange,
      accumulated: accumulatedAmount,
      breakdown: monthData
    })
  }

  const totalIncome = monthlySummaries.reduce((sum, month) => sum + month.income, 0)
  const totalExpense = monthlySummaries.reduce((sum, month) => sum + month.expense, 0)
  const annualNetChange = totalIncome - totalExpense

  const monthsWithActivity = monthlySummaries.filter(month => {
    const hasIncome = month.income > 0
    const hasExpense = month.expense > 0
    const hasBreakdown = Object.entries(month.breakdown || {}).some(([key, value]) => {
      if (key === 'accumulated') return false
      return Number(value) > 0
    })
    return hasIncome || hasExpense || hasBreakdown
  })

  const divisor = monthsWithActivity.length || 12
  const averageMonthlyIncome = divisor > 0 ? totalIncome / divisor : 0
  const averageMonthlyExpense = divisor > 0 ? totalExpense / divisor : 0
  const averageMonthlyNet = divisor > 0 ? annualNetChange / divisor : 0

  const latestActiveMonth = monthsWithActivity.length
    ? monthsWithActivity[monthsWithActivity.length - 1]
    : monthlySummaries[Math.min(referenceDate.getMonth(), monthlySummaries.length - 1)] || monthlySummaries[monthlySummaries.length - 1]

  const incomeTotalsByCategory = normalizedIncome.reduce((acc, cat) => {
    if (cat.isAccumulated) return acc
    const total = monthlySummaries.reduce((sum, month) => sum + (Number(month.breakdown?.[cat.id]) || 0), 0)
    acc.push({
      id: cat.id,
      name: cat.name || cat.id,
      total
    })
    return acc
  }, []).sort((a, b) => b.total - a.total)

  const expenseTotalsByCategory = normalizedExpense.reduce((acc, cat) => {
    const total = monthlySummaries.reduce((sum, month) => sum + (Number(month.breakdown?.[cat.id]) || 0), 0)
    acc.push({
      id: cat.id,
      name: cat.name || cat.id,
      total
    })
    return acc
  }, []).sort((a, b) => b.total - a.total)

  return {
    year,
    monthSummaries: monthlySummaries.map(month => ({
      label: month.label,
      income: month.income,
      expense: month.expense,
      netChange: month.netChange,
      accumulated: month.accumulated
    })),
    totalIncome,
    totalExpense,
    annualNetChange,
    averageMonthlyIncome,
    averageMonthlyExpense,
    averageMonthlyNet,
    totalAssets: monthlySummaries.length ? monthlySummaries[monthlySummaries.length - 1].accumulated : 0,
    latestMonth: latestActiveMonth
      ? {
          label: latestActiveMonth.label,
          income: latestActiveMonth.income,
          expense: latestActiveMonth.expense,
          netChange: latestActiveMonth.netChange,
          accumulated: latestActiveMonth.accumulated
        }
      : null,
    topIncomeCategories: incomeTotalsByCategory.slice(0, 3),
    topExpenseCategories: expenseTotalsByCategory.slice(0, 3),
    hasActivity: monthsWithActivity.length > 0
  }
}

export const buildMarketReportPrompt = (marketData, insights) => {
  if (!marketData) {
    return '시장 데이터를 수집할 수 없습니다.'
  }

  const sentimentLine = insights
    ? `${insights.sentiment.label} (지수 평균 변동률 ${formatNumber(insights.indexAverage, 2)}%)`
    : '데이터 부족'

  const indexLines = insights?.indices
    ? insights.indices.map(item => `- ${item.name}: ${formatPercent(item.changePercent)} (종가 ${formatNumber(item.price, 2)})`).join('\n')
    : '- 지수 데이터 없음'

  const cryptoLines = insights?.crypto && insights.crypto.length
    ? insights.crypto.slice(0, 5).map(item => `- ${item.name}: ${formatPercent(item.change24h)} (가격 ${formatNumber(item.price, 2)})`).join('\n')
    : '- 주요 코인 데이터 없음'

  const riskLines = insights?.riskSignals && insights.riskSignals.length
    ? insights.riskSignals.map(item => `- ${item}`).join('\n')
    : '- 특이 리스크 없음'

  const goldLine = insights?.gold && insights.gold.price !== null
    ? `- 금(Gold) 가격: ${formatNumber(insights.gold.price, 2)} (${formatPercent(insights.gold.changePercent)})`
    : '- 금 데이터 없음'

  const fxLine = insights?.usdKrw && insights.usdKrw.rate !== null
    ? `- USD/KRW 환율: ${formatNumber(insights.usdKrw.rate, 2)}`
    : '- 환율 데이터 없음'

  return `다음은 최신 시장 데이터 스냅샷입니다.
업데이트 시점: ${marketData.lastUpdated || 'N/A'}

시장 톤: ${sentimentLine}

주요 지수 요약:
${indexLines}

주요 코인 변동:
${cryptoLines}

귀금속 및 환율:
${goldLine}
${fxLine}

감지된 리스크/이슈:
${riskLines}

원시 데이터(JSON 요약):
${JSON.stringify({
    stocks: marketData.stocks,
    gold: marketData.gold,
    crypto: marketData.crypto,
    currency: marketData.currency,
    lastUpdated: marketData.lastUpdated
  }, null, 2)}

작성 가이드:
1. 섹션 제목은 "시장 개요", "섹터 및 자산별 분석", "리스크 요인과 기회", "전략 제안", "전망 및 체크포인트" 순서를 따르세요.
2. 지수·암호화폐·금·환율 데이터를 모두 활용하여 다각도로 분석하세요.
3. 리스크 섹션에서는 위의 감지 신호를 참고해 경고를 명확히 제시하세요.
4. 전략 제안은 위험도(저/중/고)와 예상 기간을 병기하고, 실행 단계를 나누어 설명하세요.
5. 데이터의 한계(실시간 지연, 환율 변동 가능성 등)를 마지막에 Disclaimer로 명시하세요.

**출력 형식 지침 (필수):**
- 각 섹션은 명확한 Markdown 헤딩(##)으로 구분하세요
- 이모지를 적극 활용하여 시각적 가독성을 높이세요 (예: 📊 시장 개요, ⚠️ 리스크, 💡 전략 제안)
- 주요 데이터는 **Markdown 표 형식**으로 정리하세요
  예시:
  | 지수 | 변동률 | 종가 |
  |------|--------|------|
  | S&P 500 | +1.2% | 4,500 |
- 핵심 포인트는 **볼드** 처리하고, 중요 수치는 강조하세요
- 실행 단계는 번호 목록으로 명확히 구분하세요
- 각 섹션 말미에 한 줄 요약을 추가하세요`
}

export const buildPortfolioAnalysisPrompt = (portfolioData, portfolioInsights, goalsSummary) => {
  if (!portfolioData || !portfolioInsights) {
    return '포트폴리오 데이터가 충분하지 않습니다.'
  }

  const holdingsLines = portfolioInsights.largestPositions.length
    ? portfolioInsights.largestPositions.map(item => `- ${item.symbol} (${item.type}): ${formatCurrency(item.valueKRW, 'KRW')} (${formatNumber(item.weight, 1)}% 비중, 수익률 ${formatPercent(item.profitPercent)})`).join('\n')
    : '- 주요 보유 자산 없음'

  const performerLines = portfolioInsights.topPerformers.length
    ? portfolioInsights.topPerformers.map(item => `- ${item.symbol}: ${formatPercent(item.profitPercent)} (${formatCurrency(item.valueKRW, 'KRW')})`).join('\n')
    : '- 수익 상위 자산 없음'

  const laggardLines = portfolioInsights.laggards.length
    ? portfolioInsights.laggards.map(item => `- ${item.symbol}: ${formatPercent(item.profitPercent)} (${formatCurrency(item.valueKRW, 'KRW')})`).join('\n')
    : '- 손실 구간 자산 없음'

  const allocationLines = portfolioInsights.allocationByType.length
    ? portfolioInsights.allocationByType.map(item => `- ${item.type}: ${formatNumber(item.percent, 1)}%`).join('\n')
    : '- 자산군 배분 데이터 없음'

  const currencyLines = portfolioInsights.currencyExposure.length
    ? portfolioInsights.currencyExposure.map(item => `- ${item.currency}: ${formatNumber(item.percent, 1)}% (${formatCurrency(item.totalValueKRW, 'KRW')})`).join('\n')
    : '- 통화 노출 데이터 없음'

  const quickHighlights = portfolioInsights.quickHighlights.length
    ? portfolioInsights.quickHighlights.map(item => `- ${item}`).join('\n')
    : '- 하이라이트 없음'

  const riskAlerts = portfolioInsights.riskAlerts.length
    ? portfolioInsights.riskAlerts.map(item => `- ${item}`).join('\n')
    : '- 특이 리스크 없음'

  const goalLines = portfolioInsights.goalHighlights.length
    ? portfolioInsights.goalHighlights.map(item => `- ${item}`).join('\n')
    : goalsSummary
      ? '- 목표 정보가 있으나 요약을 생성할 수 없습니다.'
      : '- 등록된 목표 없음'

  return `다음 포트폴리오 데이터를 ${portfolioInsights.baseCurrency} 기준으로 심층 분석해주세요.

핵심 요약:
${quickHighlights}

리스크 경고:
${riskAlerts}

총 평가액: ${formatCurrency(portfolioInsights.totalValueKRW, 'KRW')} (수익 ${formatCurrency(portfolioInsights.totalProfitKRW, 'KRW')})
누적 수익률: ${formatPercent(portfolioInsights.profitPercent)}

자산 배분:
${allocationLines}

통화 노출:
${currencyLines}

상위 보유 자산:
${holdingsLines}

수익 상위 자산:
${performerLines}

손실 구간 자산:
${laggardLines}

목표 진행 상황:
${goalLines}

데이터 제한: 실시간 시장 데이터와 환율에 따라 변동 가능성이 있으므로 유의해야 합니다.

작성 가이드:
1. "포트폴리오 개요"에서 성과와 주요 하이라이트를 정리하고 목표와의 정합성을 평가하세요.
2. "통화 및 환율 영향"에서는 통화 노출과 환헤지 필요성을 분석하세요.
3. "목표 연계 분석"에서 목표 진척과 포트폴리오의 적합성을 평가하세요.
4. "리스크 및 수익성"에서는 상/하위 자산, 과도 비중 섹터를 활용해 문제점을 지적하세요.
5. "개선 제안"에서는 우선순위·영향도를 포함한 실행 가능한 조치를 제안하세요.
6. "실행 체크리스트"와 "Disclaimer"로 마무리하세요.

**출력 형식 지침 (필수):**
- 각 섹션은 명확한 Markdown 헤딩(##)으로 구분하세요
- 이모지를 적극 활용하여 시각적 가독성을 높이세요 (예: 📈 포트폴리오 개요, 💰 자산 배분, ⚠️ 리스크, 🎯 목표 연계)
- 자산 배분, 보유 자산, 수익률 등 주요 데이터는 **Markdown 표 형식**으로 정리하세요
  예시:
  | 자산 | 비중 | 수익률 | 평가액 |
  |------|------|--------|--------|
  | 삼성전자 | 35% | +12.5% | ₩5,000,000 |
- 핵심 메시지는 **볼드** 처리하고, 긍정(🟢)/부정(🔴)/중립(🟡) 이모지로 시각화하세요
- 개선 제안은 우선순위별 번호 목록으로 작성하세요
- 각 섹션 말미에 핵심 요약을 추가하세요`
}

export const buildRebalancingPrompt = (portfolioData, portfolioInsights, riskAnalysis) => {
  if (!portfolioData || !portfolioInsights) {
    return '포트폴리오 데이터가 부족하여 리밸런싱을 제안할 수 없습니다.'
  }

  const allocationLines = portfolioInsights.allocationByType.length
    ? portfolioInsights.allocationByType.map(item => `- ${item.type}: ${formatNumber(item.percent, 1)}%`).join('\n')
    : '- 자산 배분 데이터 없음'

  const currencyLines = portfolioInsights.currencyExposure.length
    ? portfolioInsights.currencyExposure.map(item => `- ${item.currency}: ${formatNumber(item.percent, 1)}%`).join('\n')
    : '- 통화 노출 데이터 없음'

  const overweightLines = portfolioInsights.overweightTypes.length
    ? portfolioInsights.overweightTypes.map(item => `- ${item.type}: ${formatNumber(item.percent, 1)}%`).join('\n')
    : '- 과도 비중 섹터 없음'

  const underweightLines = portfolioInsights.underweightTypes.length
    ? portfolioInsights.underweightTypes.map(item => `- ${item.type}: ${formatNumber(item.percent, 1)}%`).join('\n')
    : '- 부족 비중 섹터 없음'

  const riskSummary = riskAnalysis
    ? `현재 위험도: ${riskAnalysis.riskLevel} (변동성 ${formatNumber(riskAnalysis.volatility, 2)}%, 샤프 ${formatNumber(riskAnalysis.sharpeRatio, 2)})`
    : '리스크 진단 미실행'

  const topHoldings = portfolioInsights.largestPositions.map(item => `- ${item.symbol}: ${formatNumber(item.weight, 1)}% 비중, 수익률 ${formatPercent(item.profitPercent)}`).join('\n')

  return `포트폴리오 리밸런싱 전략을 제안해주세요.

현재 평가액: ${formatCurrency(portfolioInsights.totalValueKRW, 'KRW')}
누적 수익률: ${formatPercent(portfolioInsights.profitPercent)}
${riskSummary}

현재 자산 배분:
${allocationLines}

통화 노출:
${currencyLines}

과도 비중 섹터:
${overweightLines}

부족 비중 섹터:
${underweightLines}

주요 보유 자산:
${topHoldings}

작성 지침:
1. 현재 배분과 위험도를 검토하고, 적정 목표 배분 비율(예: 성장형/중립형/보수형)을 가정하여 제안하세요.
2. 과도/부족 비중 섹터를 해소할 수 있는 매수·매도/환헤지 전략을 구체적으로 제시하세요.
3. 실행 단계를 우선순위별로 나누고, 각 단계의 예상 영향(긍정/부정)과 모니터링 포인트를 병기하세요.
4. 환율 변동, 세금, 거래비용 등 구현상의 주의사항을 포함하세요.
5. 리밸런싱 주기와 자동화 아이디어, 추적해야 할 주요 지표를 체크리스트로 정리하세요.

**출력 형식 지침 (필수):**
- 각 섹션은 명확한 Markdown 헤딩(##)으로 구분하세요
- 이모지를 적극 활용하여 시각적 가독성을 높이세요 (예: 🎯 목표 배분, 📊 현재 vs 목표, ⚖️ 리밸런싱 액션)
- 현재 배분 vs 목표 배분 비교는 **Markdown 표 형식**으로 작성하세요
  예시:
  | 자산군 | 현재 비중 | 목표 비중 | 조정 필요 | 액션 |
  |--------|----------|----------|----------|------|
  | 주식 | 65% | 50% | -15% | 매도 ₩3,000,000 |
- 우선순위 액션은 번호 목록으로 명확히 구분하세요
- 예상 영향은 긍정(✅)/주의(⚠️)/부정(❌) 이모지로 표시하세요
- 체크리스트는 - [ ] 형식으로 작성하세요`
}

export const buildChatPrompt = ({ userMessage, context, marketInsights, portfolioInsights }) => {
  const marketSummary = marketInsights
    ? [
        `시장 톤: ${marketInsights.sentiment.label}`,
        ...(marketInsights.quickHighlights.slice(0, 3))
      ].join('\n')
    : '시장 인사이트 없음'

  const portfolioSummary = portfolioInsights
    ? [
        `총 평가액: ${formatCurrency(portfolioInsights.totalValueKRW, 'KRW')} / 수익률 ${formatPercent(portfolioInsights.profitPercent)}`,
        ...(portfolioInsights.quickHighlights.slice(0, 3)),
        ...(portfolioInsights.riskAlerts.slice(0, 2))
      ].join('\n')
    : '포트폴리오 인사이트 없음'

  const cashflowInsights = context.cashflow
  const cashflowSummary = cashflowInsights
    ? [
        `총자산: ${formatCurrency(cashflowInsights.totalAssets, 'KRW')}`,
        `평균 월수입/지출: ${formatCurrency(cashflowInsights.averageMonthlyIncome, 'KRW')} / ${formatCurrency(cashflowInsights.averageMonthlyExpense, 'KRW')}`,
        cashflowInsights.latestMonth
          ? `최근 월(${cashflowInsights.latestMonth.label}) 수입/지출: ${formatCurrency(cashflowInsights.latestMonth.income, 'KRW')} / ${formatCurrency(cashflowInsights.latestMonth.expense, 'KRW')}`
          : '최근 월 데이터 없음',
        `연간 순변화: ${formatCurrency(cashflowInsights.annualNetChange, 'KRW')} (${cashflowInsights.averageMonthlyNet >= 0 ? '흑자' : '적자'} 경향)`
      ].join('\n')
    : '수입/지출 데이터 없음'

  const trimmedContext = {
    portfolio: portfolioInsights
      ? {
          totalValueKRW: portfolioInsights.totalValueKRW,
          profitPercent: portfolioInsights.profitPercent,
          largestPositions: portfolioInsights.largestPositions,
          currencyExposure: portfolioInsights.currencyExposure
        }
      : null,
    market: marketInsights
      ? {
          sentiment: marketInsights.sentiment,
          indices: marketInsights.indices,
          crypto: marketInsights.crypto.slice(0, 4),
          usdKrw: marketInsights.usdKrw
        }
      : null,
    cashflow: cashflowInsights
      ? {
          totalAssets: cashflowInsights.totalAssets,
          totalIncome: cashflowInsights.totalIncome,
          totalExpense: cashflowInsights.totalExpense,
          averageMonthlyIncome: cashflowInsights.averageMonthlyIncome,
          averageMonthlyExpense: cashflowInsights.averageMonthlyExpense,
          latestMonth: cashflowInsights.latestMonth,
          topIncomeCategories: cashflowInsights.topIncomeCategories,
          topExpenseCategories: cashflowInsights.topExpenseCategories
        }
      : null,
    goals: context.goalsSummary || null,
    latestReports: {
      market: context.latestMarketReport,
      portfolio: context.latestPortfolioAnalysis,
      rebalancing: context.latestRebalancing
    },
    risk: context.riskAnalysis || null
  }

  return `사용자 질문: ${userMessage}

시장 인사이트:
${marketSummary}

포트폴리오 인사이트:
${portfolioSummary}

현금흐름 요약:
${cashflowSummary}

참고 컨텍스트(JSON 요약):
${JSON.stringify(trimmedContext, null, 2)}

답변 가이드:
1. 질문에 대한 직접적이고 실용적인 조언을 1~2문단으로 먼저 제시하세요.
2. 이어서 시장·포트폴리오 인사이트를 연결하여 근거를 설명하세요.
3. 실행 가능한 다음 단계(액션 아이템)를 번호 목록으로 정리하세요.
4. 필요 시 리스크와 확인해야 할 데이터(추가 조사 포인트)를 명시하세요.
5. 마지막에 2문장 이내 Disclaimer를 덧붙이세요.

**출력 형식 지침 (필수):**
- 답변은 명확한 구조로 작성하세요 (핵심 답변 → 근거 → 액션 아이템)
- 이모지를 활용하여 가독성을 높이세요 (예: 💡 조언, 📊 데이터 근거, 🎯 액션 아이템)
- 관련 데이터는 **Markdown 표 형식**으로 정리하세요
- 중요한 수치나 개념은 **볼드** 처리하세요
- 액션 아이템은 번호 목록으로 명확히 구분하세요
- 긍정(✅)/주의(⚠️)/부정(❌) 이모지로 리스크 수준을 표시하세요`
}
