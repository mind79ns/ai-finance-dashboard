import { useState } from 'react'
import { Database, Download, Upload, CheckCircle, XCircle, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react'
import supabaseService from '../services/supabaseService'

const DataMigrationPanel = () => {
  const [migrationStatus, setMigrationStatus] = useState(null) // 'success' | 'error' | 'loading' | null
  const [message, setMessage] = useState('')
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [errorDetails, setErrorDetails] = useState(null)

  // Supabase 연결 테스트
  const handleTestConnection = async () => {
    setMigrationStatus('loading')
    setMessage('Supabase 연결을 확인하는 중...')
    setErrorDetails(null)

    try {
      const result = await supabaseService.checkSupabaseConnection()

      if (result.connected) {
        setConnectionStatus('connected')
        setMigrationStatus('success')
        setMessage('Supabase 연결 성공!')
        setErrorDetails(null)
      } else {
        setConnectionStatus('disconnected')
        setMigrationStatus('error')

        // 에러 유형에 따른 상세 메시지
        const errorMsg = result.error || '알 수 없는 오류'

        if (errorMsg.includes('Failed to fetch') || errorMsg.includes('fetch')) {
          setMessage('Supabase 서버에 연결할 수 없습니다')
          setErrorDetails({
            type: 'network',
            title: '연결 실패 원인 확인',
            suggestions: [
              'Supabase 프로젝트가 일시정지 상태일 수 있습니다 (무료 플랜은 7일 비활성 시 자동 정지)',
              'Supabase 대시보드에서 프로젝트를 다시 활성화하세요',
              '환경 변수의 SUPABASE_URL이 올바른지 확인하세요',
              '네트워크 연결 상태를 확인하세요'
            ],
            action: {
              label: 'Supabase 대시보드 열기',
              url: 'https://supabase.com/dashboard'
            }
          })
        } else if (errorMsg.includes('not configured')) {
          setMessage('Supabase가 설정되지 않았습니다')
          setErrorDetails({
            type: 'config',
            title: '환경 변수 설정 필요',
            suggestions: [
              'Netlify 대시보드 → Site settings → Environment variables에서 설정하세요',
              'VITE_SUPABASE_URL: Supabase 프로젝트 URL',
              'VITE_SUPABASE_ANON_KEY: Supabase anon/public key'
            ],
            action: {
              label: 'Netlify 환경변수 설정',
              url: 'https://app.netlify.com'
            }
          })
        } else if (errorMsg.includes('Invalid API key') || errorMsg.includes('401')) {
          setMessage('API 키가 유효하지 않습니다')
          setErrorDetails({
            type: 'auth',
            title: 'API 키 오류',
            suggestions: [
              'Supabase 대시보드 → Project Settings → API에서 키를 확인하세요',
              'anon/public 키를 사용해야 합니다 (service_role 키 아님)',
              '키를 복사할 때 앞뒤 공백이 없는지 확인하세요'
            ],
            action: {
              label: 'Supabase API 설정',
              url: 'https://supabase.com/dashboard/project/_/settings/api'
            }
          })
        } else {
          setMessage(`연결 실패: ${errorMsg}`)
          setErrorDetails({
            type: 'unknown',
            title: '오류 상세',
            suggestions: [
              'Supabase 프로젝트 상태를 확인하세요',
              '데이터베이스 테이블이 올바르게 생성되었는지 확인하세요',
              'RLS(Row Level Security) 정책을 확인하세요'
            ]
          })
        }
      }
    } catch (error) {
      setConnectionStatus('disconnected')
      setMigrationStatus('error')
      setMessage('연결 테스트 중 오류 발생')
      setErrorDetails({
        type: 'exception',
        title: '예외 발생',
        suggestions: [
          `오류: ${error.message}`,
          '브라우저 콘솔에서 자세한 오류를 확인하세요',
          '페이지를 새로고침 후 다시 시도하세요'
        ]
      })
    }
  }

  // localStorage에서 Supabase로 데이터 마이그레이션
  const handleMigrate = async () => {
    if (!window.confirm('로컬 데이터를 Supabase로 마이그레이션하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    setMigrationStatus('loading')
    setMessage('데이터를 마이그레이션하는 중...')

    const result = await supabaseService.migrateFromLocalStorage()

    if (result.success) {
      setMigrationStatus('success')
      setMessage('🎉 데이터 마이그레이션이 완료되었습니다!')

      // 3초 후 페이지 새로고침
      setTimeout(() => {
        window.location.reload()
      }, 3000)
    } else {
      setMigrationStatus('error')
      setMessage(`❌ 마이그레이션 실패: ${result.error}`)
    }
  }

  // 로컬 데이터 확인
  const getLocalDataSummary = () => {
    const portfolioAssets = localStorage.getItem('portfolio_assets')
    const accountPrincipals = localStorage.getItem('account_principals')
    const goals = localStorage.getItem('investment_goals') || localStorage.getItem('goals')
    const logs = localStorage.getItem('investment_logs')

    const portfolioCount = portfolioAssets ? JSON.parse(portfolioAssets).length : 0
    const principalCount = accountPrincipals ? Object.keys(JSON.parse(accountPrincipals)).length : 0
    const goalsCount = goals ? JSON.parse(goals).length : 0
    const logsCount = logs ? JSON.parse(logs).length : 0

    return {
      portfolioCount,
      principalCount,
      goalsCount,
      logsCount,
      hasData: portfolioCount > 0 || principalCount > 0 || goalsCount > 0 || logsCount > 0
    }
  }

  const localData = getLocalDataSummary()

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-6">
        <Database className="w-6 h-6 text-primary-600" />
        <div>
          <h3 className="text-xl font-bold text-gray-900">Supabase 데이터 관리</h3>
          <p className="text-sm text-gray-600 mt-1">로컬 데이터를 클라우드로 마이그레이션하여 모든 기기에서 접근하세요</p>
        </div>
      </div>

      {/* Connection Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 mb-2">Supabase 설정 안내</p>
            <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
              <li>프로젝트 루트의 <code className="bg-blue-100 px-1 rounded">supabase-setup.md</code> 파일을 참고하여 Supabase 프로젝트를 생성하세요</li>
              <li><code className="bg-blue-100 px-1 rounded">.env.example</code>을 복사하여 <code className="bg-blue-100 px-1 rounded">.env</code> 파일을 만들고 Supabase 인증 정보를 입력하세요</li>
              <li>아래 "연결 테스트" 버튼을 클릭하여 Supabase 연결을 확인하세요</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Local Data Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs font-medium text-blue-700 mb-1">포트폴리오 자산</p>
          <p className="text-2xl font-bold text-blue-900">{localData.portfolioCount}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
          <p className="text-xs font-medium text-purple-700 mb-1">계좌 원금</p>
          <p className="text-2xl font-bold text-purple-900">{localData.principalCount}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-4">
          <p className="text-xs font-medium text-emerald-700 mb-1">재무 목표</p>
          <p className="text-2xl font-bold text-emerald-900">{localData.goalsCount}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
          <p className="text-xs font-medium text-amber-700 mb-1">투자 일지</p>
          <p className="text-2xl font-bold text-amber-900">{localData.logsCount}</p>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`rounded-lg p-4 mb-6 ${
          migrationStatus === 'success'
            ? 'bg-green-50 border border-green-200'
            : migrationStatus === 'error'
            ? 'bg-red-50 border border-red-200'
            : 'bg-gray-50 border border-gray-200'
        }`}>
          <div className="flex items-start gap-3">
            {migrationStatus === 'success' && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
            {migrationStatus === 'error' && <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
            {migrationStatus === 'loading' && (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin flex-shrink-0 mt-0.5"></div>
            )}
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                migrationStatus === 'success'
                  ? 'text-green-900'
                  : migrationStatus === 'error'
                  ? 'text-red-900'
                  : 'text-gray-900'
              }`}>
                {message}
              </p>

              {/* Error Details */}
              {errorDetails && migrationStatus === 'error' && (
                <div className="mt-3 pt-3 border-t border-red-200">
                  <p className="text-sm font-semibold text-red-800 mb-2">{errorDetails.title}</p>
                  <ul className="text-xs text-red-700 space-y-1.5">
                    {errorDetails.suggestions.map((suggestion, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-red-400 mt-0.5">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                  {errorDetails.action && (
                    <a
                      href={errorDetails.action.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-medium rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {errorDetails.action.label}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={handleTestConnection}
          disabled={migrationStatus === 'loading'}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            migrationStatus === 'loading'
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : connectionStatus === 'disconnected'
              ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300'
              : 'btn-secondary'
          }`}
        >
          {migrationStatus === 'loading' ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Database className="w-4 h-4" />
          )}
          {connectionStatus === 'disconnected' ? '다시 연결 테스트' : '연결 테스트'}
        </button>

        <button
          onClick={handleMigrate}
          disabled={!localData.hasData || migrationStatus === 'loading' || connectionStatus !== 'connected'}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            !localData.hasData || connectionStatus !== 'connected'
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'btn-primary'
          }`}
        >
          <Upload className="w-4 h-4" />
          로컬 데이터 업로드
        </button>

        {connectionStatus === 'connected' && (
          <div className="flex items-center gap-2 text-sm text-green-600 font-medium bg-green-50 px-3 py-1.5 rounded-lg">
            <CheckCircle className="w-4 h-4" />
            Supabase 연결됨
          </div>
        )}

        {connectionStatus === 'disconnected' && (
          <div className="flex items-center gap-2 text-sm text-red-600 font-medium bg-red-50 px-3 py-1.5 rounded-lg">
            <XCircle className="w-4 h-4" />
            연결 안됨
          </div>
        )}
      </div>

      {/* Connection not tested yet notice */}
      {connectionStatus === null && !migrationStatus && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-gray-400" />
            먼저 "연결 테스트" 버튼을 클릭하여 Supabase 연결 상태를 확인하세요
          </p>
        </div>
      )}

      {/* Warning */}
      {localData.hasData && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900 mb-1">⚠️ 마이그레이션 전 주의사항</p>
              <ul className="text-xs text-amber-800 space-y-1">
                <li>• 마이그레이션 후에도 로컬 데이터는 유지됩니다</li>
                <li>• 중복 데이터가 생성될 수 있으니 한 번만 실행하세요</li>
                <li>• 마이그레이션 완료 후 페이지가 자동으로 새로고침됩니다</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {!localData.hasData && (
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-600">
            마이그레이션할 로컬 데이터가 없습니다. 먼저 포트폴리오 자산을 추가하세요.
          </p>
        </div>
      )}
    </div>
  )
}

export default DataMigrationPanel
