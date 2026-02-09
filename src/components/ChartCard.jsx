const ChartCard = ({ title, subtitle, children, action }) => {
  return (
    <div className="cyber-card cyber-card-glow">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="min-w-0 flex-1">
          <h3 className="text-base sm:text-lg font-bold text-cyan-400 truncate">{title}</h3>
          {subtitle && <p className="text-xs sm:text-sm text-cyan-300/60 mt-1">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      <div className="w-full">
        {children}
      </div>
    </div>
  )
}

export default ChartCard
