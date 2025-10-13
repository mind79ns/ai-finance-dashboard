import { TrendingUp, TrendingDown } from 'lucide-react'

const StatCard = ({ title, value, change, changeType = 'neutral', icon: Icon, prefix = '', suffix = '' }) => {
  const getChangeColor = () => {
    if (changeType === 'positive') return 'text-success'
    if (changeType === 'negative') return 'text-danger'
    return 'text-gray-500'
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
            {prefix}{value}{suffix}
          </p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-1.5 sm:mt-2 text-xs sm:text-sm ${getChangeColor()}`}>
              {changeType === 'positive' && <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              {changeType === 'negative' && <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              <span>{change > 0 ? '+' : ''}{change}%</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-2 sm:p-3 bg-primary-50 rounded-lg flex-shrink-0">
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
          </div>
        )}
      </div>
    </div>
  )
}

export default StatCard
