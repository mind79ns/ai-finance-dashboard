const ChartCard = ({ title, subtitle, children, action }) => {
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
        {action && action}
      </div>
      <div className="w-full">
        {children}
      </div>
    </div>
  )
}

export default ChartCard
