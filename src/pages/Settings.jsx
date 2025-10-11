import { Settings as SettingsIcon } from 'lucide-react'
import DataMigrationPanel from '../components/DataMigrationPanel'

const Settings = () => {
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

      {/* Data Migration Panel */}
      <DataMigrationPanel />

      {/* Additional Settings Sections (추가 예정) */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">기타 설정</h3>
        <p className="text-sm text-gray-600">향후 업데이트 예정...</p>
      </div>
    </div>
  )
}

export default Settings
