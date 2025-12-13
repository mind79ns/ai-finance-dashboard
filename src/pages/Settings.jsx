import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Sun, Moon, DollarSign, Key, Trash2, Download, Upload, RefreshCw, Check, AlertTriangle, Clock, History, FileSpreadsheet, RotateCcw } from 'lucide-react'
import DataMigrationPanel from '../components/DataMigrationPanel'
import backupManager from '../utils/backupManager'

const Settings = () => {
  // Theme settings
  const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'light')

  // Currency settings
  const [defaultCurrency, setDefaultCurrency] = useState(() => localStorage.getItem('default_currency') || 'KRW')

  // API Keys (masked for display)
  const [apiKeys, setApiKeys] = useState({
    openai: localStorage.getItem('openai_api_key') || '',
    gemini: localStorage.getItem('gemini_api_key') || ''
  })
  const [showApiKeys, setShowApiKeys] = useState({ openai: false, gemini: false })

  // Status messages
  const [saveStatus, setSaveStatus] = useState('')
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Auto-backup settings
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(() => backupManager.isAutoBackupEnabled())
  const [backupHistory, setBackupHistory] = useState(() => backupManager.getBackupHistory())
  const [lastBackupDate, setLastBackupDate] = useState(() => backupManager.getLastBackupDate())

  // Apply theme on change
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('app_theme', theme)
  }, [theme])

  // Save currency preference
  const handleCurrencyChange = (currency) => {
    setDefaultCurrency(currency)
    localStorage.setItem('default_currency', currency)
    showSaveMessage('기본 통화가 저장되었습니다.')
  }

  // Save API keys
  const handleSaveApiKey = (provider, key) => {
    localStorage.setItem(`${provider}_api_key`, key)
    setApiKeys(prev => ({ ...prev, [provider]: key }))
    showSaveMessage(`${provider.toUpperCase()} API 키가 저장되었습니다.`)
  }

  // Show save confirmation
  const showSaveMessage = (message) => {
    setSaveStatus(message)
    setTimeout(() => setSaveStatus(''), 3000)
  }

  // Export all data
  const handleExportData = () => {
    const data = {
      exportDate: new Date().toISOString(),
      portfolioAssets: JSON.parse(localStorage.getItem('portfolio_assets') || '[]'),
      investmentLogs: JSON.parse(localStorage.getItem('investment_logs') || '[]'),
      goals: JSON.parse(localStorage.getItem('goals') || '[]'),
      assetStatus: JSON.parse(localStorage.getItem('assetStatus') || '[]'),
      priceAlerts: JSON.parse(localStorage.getItem('price_alerts') || '[]'),
      aiChatHistory: JSON.parse(localStorage.getItem('ai_chat_history') || '[]'),
      aiReportHistory: JSON.parse(localStorage.getItem('ai_report_history') || '[]'),
      settings: {
        theme,
        defaultCurrency
      }
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finance-dashboard-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    showSaveMessage('데이터가 내보내기 되었습니다.')
  }

  // Import data
  const handleImportData = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)

        // Restore each data type
        if (data.portfolioAssets) localStorage.setItem('portfolio_assets', JSON.stringify(data.portfolioAssets))
        if (data.investmentLogs) localStorage.setItem('investment_logs', JSON.stringify(data.investmentLogs))
        if (data.goals) localStorage.setItem('goals', JSON.stringify(data.goals))
        if (data.assetStatus) localStorage.setItem('assetStatus', JSON.stringify(data.assetStatus))
        if (data.priceAlerts) localStorage.setItem('price_alerts', JSON.stringify(data.priceAlerts))
        if (data.aiChatHistory) localStorage.setItem('ai_chat_history', JSON.stringify(data.aiChatHistory))
        if (data.aiReportHistory) localStorage.setItem('ai_report_history', JSON.stringify(data.aiReportHistory))

        if (data.settings) {
          if (data.settings.theme) {
            setTheme(data.settings.theme)
            localStorage.setItem('app_theme', data.settings.theme)
          }
          if (data.settings.defaultCurrency) {
            setDefaultCurrency(data.settings.defaultCurrency)
            localStorage.setItem('default_currency', data.settings.defaultCurrency)
          }
        }

        showSaveMessage('데이터가 가져오기 되었습니다. 페이지를 새로고침하세요.')
      } catch (error) {
        showSaveMessage('⚠️ 파일 형식이 올바르지 않습니다.')
      }
    }
    reader.readAsText(file)
  }

  // Reset all data
  const handleResetData = () => {
    const keysToRemove = [
      'portfolio_assets', 'investment_logs', 'goals', 'assetStatus',
      'price_alerts', 'ai_chat_history', 'ai_report_history', 'user_debts'
    ]
    keysToRemove.forEach(key => localStorage.removeItem(key))
    setShowResetConfirm(false)
    showSaveMessage('모든 데이터가 초기화되었습니다. 페이지를 새로고침하세요.')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-8 h-8 text-primary-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">설정</h2>
          <p className="text-sm text-gray-600 mt-1">애플리케이션 설정 및 데이터 관리</p>
        </div>
      </div>

      {/* Save Status Toast */}
      {saveStatus && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-pulse">
          <Check className="w-5 h-5" />
          {saveStatus}
        </div>
      )}

      {/* Theme Settings */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          테마 설정
        </h3>
        <div className="flex gap-3">
          <button
            onClick={() => setTheme('light')}
            className={`flex-1 p-4 rounded-lg border-2 transition-all ${theme === 'light'
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
              }`}
          >
            <Sun className={`w-8 h-8 mx-auto mb-2 ${theme === 'light' ? 'text-primary-600' : 'text-gray-400'}`} />
            <p className={`text-sm font-medium ${theme === 'light' ? 'text-primary-700' : 'text-gray-600'}`}>
              라이트 모드
            </p>
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`flex-1 p-4 rounded-lg border-2 transition-all ${theme === 'dark'
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
              }`}
          >
            <Moon className={`w-8 h-8 mx-auto mb-2 ${theme === 'dark' ? 'text-primary-600' : 'text-gray-400'}`} />
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-primary-700' : 'text-gray-600'}`}>
              다크 모드
            </p>
          </button>
        </div>
      </div>

      {/* Currency Settings */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          기본 통화 설정
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {['KRW', 'USD', 'EUR'].map(currency => (
            <button
              key={currency}
              onClick={() => handleCurrencyChange(currency)}
              className={`p-3 rounded-lg border-2 transition-all ${defaultCurrency === currency
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
            >
              <p className="font-semibold">{currency}</p>
              <p className="text-xs">
                {currency === 'KRW' ? '원화' : currency === 'USD' ? '달러' : '유로'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* API Keys */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Key className="w-5 h-5" />
          API 키 관리
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          AI 기능 사용을 위한 API 키를 설정합니다. 키는 브라우저에만 저장됩니다.
        </p>

        <div className="space-y-4">
          {/* OpenAI */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">OpenAI API Key</label>
            <div className="flex gap-2">
              <input
                type={showApiKeys.openai ? 'text' : 'password'}
                value={apiKeys.openai}
                onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                placeholder="sk-..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={() => setShowApiKeys(prev => ({ ...prev, openai: !prev.openai }))}
                className="px-3 py-2 text-gray-600 hover:text-gray-900"
              >
                {showApiKeys.openai ? '숨기기' : '보기'}
              </button>
              <button
                onClick={() => handleSaveApiKey('openai', apiKeys.openai)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                저장
              </button>
            </div>
          </div>

          {/* Gemini */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gemini API Key</label>
            <div className="flex gap-2">
              <input
                type={showApiKeys.gemini ? 'text' : 'password'}
                value={apiKeys.gemini}
                onChange={(e) => setApiKeys(prev => ({ ...prev, gemini: e.target.value }))}
                placeholder="AI..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={() => setShowApiKeys(prev => ({ ...prev, gemini: !prev.gemini }))}
                className="px-3 py-2 text-gray-600 hover:text-gray-900"
              >
                {showApiKeys.gemini ? '숨기기' : '보기'}
              </button>
              <button
                onClick={() => handleSaveApiKey('gemini', apiKeys.gemini)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Backup/Restore - Enhanced */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Download className="w-5 h-5" />
          데이터 백업 및 복원
        </h3>

        {/* Auto-backup Toggle */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">자동 백업</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  24시간마다 자동으로 백업 (최근 5개 유지)
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const newValue = !autoBackupEnabled
                setAutoBackupEnabled(newValue)
                backupManager.setAutoBackupEnabled(newValue)
                if (newValue) {
                  // 활성화 시 즉시 백업 실행
                  const backup = backupManager.createBackupData()
                  backupManager.saveToBackupHistory(backup, `수동 백업 ${new Date().toLocaleString('ko-KR')}`)
                  setBackupHistory(backupManager.getBackupHistory())
                  setLastBackupDate(backupManager.getLastBackupDate())
                  showSaveMessage('자동 백업이 활성화되었습니다.')
                } else {
                  showSaveMessage('자동 백업이 비활성화되었습니다.')
                }
              }}
              className={`relative w-14 h-7 rounded-full transition-colors ${autoBackupEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoBackupEnabled ? 'translate-x-7' : 'translate-x-0'
                  }`}
              />
            </button>
          </div>
          {lastBackupDate && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              마지막 백업: {new Date(lastBackupDate).toLocaleString('ko-KR')}
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => {
              const backup = backupManager.createBackupData()
              backupManager.downloadBackup(backup)
              showSaveMessage('데이터가 내보내기 되었습니다.')
            }}
            className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all group"
          >
            <Download className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-primary-600" />
            <p className="font-medium text-gray-700 dark:text-gray-300 group-hover:text-primary-700">JSON 내보내기</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">전체 데이터 백업</p>
          </button>

          <label className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all cursor-pointer group">
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-primary-600" />
            <p className="font-medium text-gray-700 dark:text-gray-300 group-hover:text-primary-700">JSON 가져오기</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">백업 파일 복원</p>
            <input
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
            />
          </label>

          <button
            onClick={() => {
              try {
                backupManager.exportPortfolioToCSV()
                showSaveMessage('포트폴리오가 CSV로 내보내기 되었습니다.')
              } catch (e) {
                showSaveMessage('⚠️ ' + e.message)
              }
            }}
            className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all group"
          >
            <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-emerald-600" />
            <p className="font-medium text-gray-700 dark:text-gray-300 group-hover:text-emerald-700">CSV 내보내기</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">포트폴리오 스프레드시트</p>
          </button>
        </div>

        {/* Backup History */}
        {backupHistory.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-gray-500" />
              <h4 className="font-medium text-gray-700 dark:text-gray-300">백업 히스토리</h4>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {backupHistory.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{backup.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(backup.date).toLocaleString('ko-KR')} · {backup.size}KB · {backup.itemCount}개 항목
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (window.confirm('이 백업으로 복원하시겠습니까? 현재 데이터가 덮어쓰기 됩니다.')) {
                          backupManager.restoreFromBackup(backup.data)
                          showSaveMessage('백업이 복원되었습니다. 페이지를 새로고침하세요.')
                        }
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"
                      title="복원"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        backupManager.downloadBackup(backup.data, `backup-${backup.id}.json`)
                        showSaveMessage('백업 파일이 다운로드되었습니다.')
                      }}
                      className="p-2 text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                      title="다운로드"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('이 백업을 삭제하시겠습니까?')) {
                          const newHistory = backupManager.deleteFromBackupHistory(backup.id)
                          setBackupHistory(newHistory)
                          showSaveMessage('백업이 삭제되었습니다.')
                        }
                      }}
                      className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Data Migration Panel */}
      <DataMigrationPanel />

      {/* Danger Zone */}
      <div className="card border-2 border-red-200 bg-red-50">
        <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          위험 영역
        </h3>

        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            모든 데이터 초기화
          </button>
        ) : (
          <div className="p-4 bg-red-100 rounded-lg">
            <p className="text-red-800 font-medium mb-3">
              ⚠️ 정말 모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleResetData}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                예, 삭제합니다
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Settings
