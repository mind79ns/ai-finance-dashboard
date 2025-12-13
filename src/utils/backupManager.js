/**
 * 백업 관리 유틸리티
 * 자동 백업, 히스토리 관리, 선택적 내보내기 기능 제공
 */

const BACKUP_HISTORY_KEY = 'backup_history'
const AUTO_BACKUP_KEY = 'auto_backup_enabled'
const LAST_BACKUP_KEY = 'last_backup_date'
const MAX_BACKUP_HISTORY = 5

// 백업할 데이터 키 목록
const BACKUP_DATA_KEYS = [
    { key: 'portfolio_assets', label: '포트폴리오 자산', icon: '📊' },
    { key: 'investment_logs', label: '투자 일지', icon: '📝' },
    { key: 'goals', label: '투자 목표', icon: '🎯' },
    { key: 'asset_status_data', label: '자산 현황', icon: '💰' },
    { key: 'price_alerts', label: '가격 알림', icon: '🔔' },
    { key: 'ai_chat_history', label: 'AI 채팅 기록', icon: '💬' },
    { key: 'ai_report_history', label: 'AI 리포트', icon: '📋' },
    { key: 'user_debts', label: '부채 정보', icon: '💳' },
    { key: 'dividend_transactions', label: '배당금 내역', icon: '💵' },
    { key: 'transaction_history_v2', label: '입출금 이력', icon: '🔄' }
]

/**
 * 현재 모든 데이터를 백업 객체로 생성
 */
export const createBackupData = (selectedKeys = null) => {
    const keysToBackup = selectedKeys || BACKUP_DATA_KEYS.map(d => d.key)
    const data = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        deviceInfo: navigator.userAgent,
        data: {}
    }

    keysToBackup.forEach(key => {
        try {
            const stored = localStorage.getItem(key)
            if (stored) {
                data.data[key] = JSON.parse(stored)
            }
        } catch (e) {
            console.warn(`Failed to backup ${key}:`, e)
        }
    })

    // 설정도 포함
    data.settings = {
        theme: localStorage.getItem('app_theme') || 'light',
        defaultCurrency: localStorage.getItem('default_currency') || 'KRW'
    }

    return data
}

/**
 * 백업 데이터 크기 계산 (KB)
 */
export const calculateBackupSize = (data) => {
    const bytes = new Blob([JSON.stringify(data)]).size
    return (bytes / 1024).toFixed(2)
}

/**
 * 백업 히스토리에 저장
 */
export const saveToBackupHistory = (backupData, name = null) => {
    const history = getBackupHistory()

    const entry = {
        id: Date.now(),
        name: name || `자동 백업 ${new Date().toLocaleString('ko-KR')}`,
        date: new Date().toISOString(),
        size: calculateBackupSize(backupData),
        itemCount: Object.keys(backupData.data).length,
        data: backupData
    }

    // 최대 개수 유지
    const newHistory = [entry, ...history].slice(0, MAX_BACKUP_HISTORY)
    localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(newHistory))
    localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString())

    return entry
}

/**
 * 백업 히스토리 가져오기
 */
export const getBackupHistory = () => {
    try {
        const history = localStorage.getItem(BACKUP_HISTORY_KEY)
        return history ? JSON.parse(history) : []
    } catch {
        return []
    }
}

/**
 * 특정 백업에서 복원
 */
export const restoreFromBackup = (backupData) => {
    if (!backupData || !backupData.data) {
        throw new Error('유효하지 않은 백업 데이터입니다.')
    }

    // 데이터 복원
    Object.entries(backupData.data).forEach(([key, value]) => {
        localStorage.setItem(key, JSON.stringify(value))
    })

    // 설정 복원
    if (backupData.settings) {
        if (backupData.settings.theme) {
            localStorage.setItem('app_theme', backupData.settings.theme)
        }
        if (backupData.settings.defaultCurrency) {
            localStorage.setItem('default_currency', backupData.settings.defaultCurrency)
        }
    }

    return true
}

/**
 * 백업 히스토리에서 삭제
 */
export const deleteFromBackupHistory = (id) => {
    const history = getBackupHistory()
    const newHistory = history.filter(h => h.id !== id)
    localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(newHistory))
    return newHistory
}

/**
 * 백업 파일로 다운로드
 */
export const downloadBackup = (backupData, filename = null) => {
    const name = filename || `finance-backup-${new Date().toISOString().split('T')[0]}.json`
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
}

/**
 * 자동 백업 활성화 여부
 */
export const isAutoBackupEnabled = () => {
    return localStorage.getItem(AUTO_BACKUP_KEY) === 'true'
}

/**
 * 자동 백업 토글
 */
export const setAutoBackupEnabled = (enabled) => {
    localStorage.setItem(AUTO_BACKUP_KEY, String(enabled))
}

/**
 * 마지막 백업 날짜 가져오기
 */
export const getLastBackupDate = () => {
    const date = localStorage.getItem(LAST_BACKUP_KEY)
    return date ? new Date(date) : null
}

/**
 * 24시간 이내 백업 여부 확인
 */
export const needsAutoBackup = () => {
    const lastBackup = getLastBackupDate()
    if (!lastBackup) return true

    const hoursSinceBackup = (Date.now() - lastBackup.getTime()) / (1000 * 60 * 60)
    return hoursSinceBackup >= 24
}

/**
 * 자동 백업 실행 (24시간 주기)
 */
export const performAutoBackup = () => {
    if (!isAutoBackupEnabled()) return null
    if (!needsAutoBackup()) return null

    const backupData = createBackupData()
    const entry = saveToBackupHistory(backupData, `자동 백업 ${new Date().toLocaleDateString('ko-KR')}`)
    console.log('✅ 자동 백업 완료:', entry.name)
    return entry
}

/**
 * CSV 형식으로 포트폴리오 내보내기
 */
export const exportPortfolioToCSV = () => {
    const assets = JSON.parse(localStorage.getItem('portfolio_assets') || '[]')

    if (assets.length === 0) {
        throw new Error('내보낼 자산이 없습니다.')
    }

    const headers = ['심볼', '종목명', '유형', '수량', '평균단가', '현재가', '평가액', '수익률', '계좌', '통화']
    const rows = assets.map(a => [
        a.symbol,
        a.name,
        a.type,
        a.quantity,
        a.avgPrice,
        a.currentPrice || a.avgPrice,
        (a.quantity * (a.currentPrice || a.avgPrice)).toFixed(2),
        a.profitPercent ? a.profitPercent.toFixed(2) + '%' : '0%',
        a.account || '기본계좌',
        a.currency || 'KRW'
    ])

    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `portfolio-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
}

/**
 * 백업 데이터 키 목록 반환
 */
export const getBackupDataKeys = () => BACKUP_DATA_KEYS

export default {
    createBackupData,
    calculateBackupSize,
    saveToBackupHistory,
    getBackupHistory,
    restoreFromBackup,
    deleteFromBackupHistory,
    downloadBackup,
    isAutoBackupEnabled,
    setAutoBackupEnabled,
    getLastBackupDate,
    needsAutoBackup,
    performAutoBackup,
    exportPortfolioToCSV,
    getBackupDataKeys
}
