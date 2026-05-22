// 포트폴리오 월별 스냅샷과 벤치마크(SPY/^KS11) 시계열을 base 100 기준으로 정규화·비교하고 α(초과수익) 계산하는 유틸

/**
 * 시계열을 base 100 기준으로 정규화.
 * 첫 유효 값을 100으로 두고 이후를 비율 환산.
 * @param {Array<{date: string, value: number}>} series
 * @returns {Array<{date: string, value: number, indexed: number}>}
 */
export const normalizeToBase100 = (series) => {
  if (!Array.isArray(series) || series.length === 0) return []
  const base = series.find(s => s.value != null && s.value > 0)?.value
  if (!base) return series.map(s => ({ ...s, indexed: null }))
  return series.map(s => ({
    ...s,
    indexed: s.value != null && s.value > 0 ? Number(((s.value / base) * 100).toFixed(2)) : null
  }))
}

/**
 * 포트폴리오 월별 스냅샷에서 시계열 추출.
 * @param {Array} snapshots [{ date: 'yyyy-MM', portfolioTotal }, ...]
 * @returns {Array<{date: string, value: number}>}
 */
export const portfolioSnapshotsToSeries = (snapshots) => {
  if (!Array.isArray(snapshots)) return []
  return snapshots
    .filter(s => s?.date && s.portfolioTotal > 0)
    .map(s => ({ date: s.date, value: Number(s.portfolioTotal) }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Yahoo 일별 시계열을 'yyyy-MM' 월별로 다운샘플 (해당 월의 마지막 거래일 종가).
 * @param {Array<{date: string, close: number}>} dailySeries
 * @returns {Array<{date: string, value: number}>}
 */
export const downsampleToMonthly = (dailySeries) => {
  if (!Array.isArray(dailySeries) || dailySeries.length === 0) return []
  const byMonth = new Map()
  for (const point of dailySeries) {
    if (!point?.date || point.close == null) continue
    const monthKey = point.date.substring(0, 7) // yyyy-MM
    // 같은 월 안에서는 더 늦은 날짜로 덮어쓴다 (월말 종가)
    const existing = byMonth.get(monthKey)
    if (!existing || point.date > existing.date) {
      byMonth.set(monthKey, { date: monthKey, value: Number(point.close), sourceDate: point.date })
    }
  }
  return Array.from(byMonth.values()).sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * 여러 시계열을 같은 month 키로 병합한 차트 데이터 생성.
 * 누락된 월은 null 로 둬서 connectNulls 로 이어 그릴 수 있게 함.
 * @param {object} streams { portfolio: [...], spy: [...], kospi: [...] }
 *   각 항목은 normalizeToBase100 후의 시계열
 * @returns {Array<{ month: string, portfolio?: number, spy?: number, kospi?: number }>}
 */
export const mergeForChart = (streams) => {
  const allMonths = new Set()
  Object.values(streams).forEach(series => {
    (series || []).forEach(p => p?.date && allMonths.add(p.date))
  })
  const sortedMonths = Array.from(allMonths).sort()

  return sortedMonths.map(month => {
    const row = { month }
    Object.entries(streams).forEach(([key, series]) => {
      const found = (series || []).find(p => p.date === month)
      row[key] = found?.indexed != null ? found.indexed : null
    })
    return row
  })
}

/**
 * 두 시리즈의 시작~끝 누적 수익률 차이(α). benchmark 기준.
 * @param {Array<{indexed: number}>} mySeries
 * @param {Array<{indexed: number}>} benchmarkSeries
 * @returns {number|null} α in percentage points
 */
export const calculateAlpha = (mySeries, benchmarkSeries) => {
  if (!Array.isArray(mySeries) || !Array.isArray(benchmarkSeries)) return null
  const myLast = [...mySeries].reverse().find(p => p?.indexed != null)?.indexed
  const benchLast = [...benchmarkSeries].reverse().find(p => p?.indexed != null)?.indexed
  if (myLast == null || benchLast == null) return null
  // 시작점이 100 이므로 (myLast - 100) - (benchLast - 100) = myLast - benchLast
  return Number((myLast - benchLast).toFixed(2))
}

/**
 * 짧은 진단 라벨 — 차트 우상단 배지용
 */
export const formatAlphaLabel = (alpha) => {
  if (alpha == null) return '데이터 부족'
  const sign = alpha >= 0 ? '+' : ''
  return `α ${sign}${alpha}%p`
}

/**
 * 진단 톤 (색상 결정용)
 */
export const alphaTone = (alpha) => {
  if (alpha == null) return 'neutral'
  if (alpha >= 5) return 'strong-positive'
  if (alpha >= 0) return 'positive'
  if (alpha >= -5) return 'negative'
  return 'strong-negative'
}
