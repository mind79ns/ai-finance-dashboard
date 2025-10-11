import { useState } from 'react'
import { Database, Download, Upload, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import supabaseService from '../services/supabaseService'

const DataMigrationPanel = () => {
  const [migrationStatus, setMigrationStatus] = useState(null) // 'success' | 'error' | 'loading' | null
  const [message, setMessage] = useState('')
  const [connectionStatus, setConnectionStatus] = useState(null)

  // Supabase 연결 테스트
  const handleTestConnection = async () => {
    setMigrationStatus('loading')
    setMessage('Supabase 연결을 확인하는 중...')

    const result = await supabaseService.checkSupabaseConnection()

    if (result.connected) {
      setConnectionStatus('connected')
      setMigrationStatus('success')
      setMessage('✅ Supabase 연결 성공!')
    } else {
      setConnectionStatus('disconnected')
      setMigrationStatus('error')
      setMessage(`❌ Supabase 연결 실패: ${result.error}`)
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
    const goals = localStorage.getItem('goals')
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
        <div className={`rounded-lg p-4 mb-6 flex items-start gap-3 ${
          migrationStatus === 'success'
            ? 'bg-green-50 border border-green-200'
            : migrationStatus === 'error'
            ? 'bg-red-50 border border-red-200'
            : 'bg-gray-50 border border-gray-200'
        }`}>
          {migrationStatus === 'success' && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
          {migrationStatus === 'error' && <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
          {migrationStatus === 'loading' && (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin flex-shrink-0 mt-0.5"></div>
          )}
          <p className={`text-sm font-medium ${
            migrationStatus === 'success'
              ? 'text-green-900'
              : migrationStatus === 'error'
              ? 'text-red-900'
              : 'text-gray-900'
          }`}>
            {message}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleTestConnection}
          disabled={migrationStatus === 'loading'}
          className="btn-secondary flex items-center gap-2"
        >
          <Database className="w-4 h-4" />
          연결 테스트
        </button>

        <button
          onClick={handleMigrate}
          disabled={!localData.hasData || migrationStatus === 'loading'}
          className="btn-primary flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          로컬 데이터 업로드
        </button>

        {connectionStatus === 'connected' && (
          <div className="flex items-center gap-2 text-sm text-success font-medium">
            <CheckCircle className="w-4 h-4" />
            Supabase 연결됨
          </div>
        )}
      </div>

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
