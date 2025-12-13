import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Sun, Moon, DollarSign, Key, Trash2, Download, Upload, RefreshCw, Check, AlertTriangle } from 'lucide-react'
import DataMigrationPanel from '../components/DataMigrationPanel'

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

      {/* Data Backup/Restore */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Download className="w-5 h-5" />
          데이터 백업 및 복원
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleExportData}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all group"
          >
            <Download className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-primary-600" />
            <p className="font-medium text-gray-700 group-hover:text-primary-700">데이터 내보내기</p>
            <p className="text-xs text-gray-500">JSON 파일로 백업</p>
          </button>

          <label className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all cursor-pointer group">
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-primary-600" />
            <p className="font-medium text-gray-700 group-hover:text-primary-700">데이터 가져오기</p>
            <p className="text-xs text-gray-500">백업 파일에서 복원</p>
            <input
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
            />
          </label>
        </div>
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
