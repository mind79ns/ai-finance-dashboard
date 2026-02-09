import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  FileText,
  BookOpen,
  Target,
  BarChart3,
  Receipt,
  Settings,
  Menu,
  X
} from 'lucide-react'

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const navigation = [
    { name: '대시보드', href: '/dashboard', icon: LayoutDashboard },
    { name: '포트폴리오', href: '/portfolio', icon: Briefcase },
    { name: '시장분석', href: '/market', icon: TrendingUp },
    { name: 'AI 리포트', href: '/ai-report', icon: FileText },
    { name: '투자일지', href: '/log', icon: BookOpen },
    { name: '목표관리', href: '/goals', icon: Target },
    { name: '자산 현황', href: '/asset-status', icon: BarChart3 },
    { name: '입출금 이력', href: '/transaction-history', icon: Receipt },
    { name: '설정', href: '/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 font-sans selection:bg-cyan-500/30">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/80 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-cyan-500/30
        transform transition-transform duration-300 ease-out lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        shadow-[0_0_15px_rgba(6,182,212,0.15)]
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-cyan-500/30 bg-slate-900/50 backdrop-blur-md">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wider drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
            AI Finance
          </h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative overflow-hidden
                  ${isActive
                    ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)] border border-cyan-500/30'
                    : 'text-gray-400 hover:text-cyan-200 hover:bg-slate-800/50 hover:border hover:border-cyan-500/20'
                  }
                `}
                onClick={() => setSidebarOpen(false)}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                )}
                <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' : 'group-hover:text-cyan-300'}`} />
                <span className="font-medium tracking-wide">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer Decoration */}
        <div className="absolute bottom-0 left-0 right-0 p-4 opacity-30 pointer-events-none">
          <div className="h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
          <p className="text-[10px] text-center text-cyan-500 mt-2 font-mono">SYSTEM READY</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center h-14 sm:h-16 px-3 sm:px-6 bg-slate-900/80 backdrop-blur-md border-b border-cyan-500/30 shadow-lg">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden mr-3 p-2 -ml-2 text-cyan-400 hover:bg-slate-800 rounded-lg touch-manipulation transition-colors"
            aria-label="메뉴 열기"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <div className="flex-1 min-w-0 flex items-center">
            <h2 className="text-lg sm:text-xl font-bold truncate text-white tracking-wide">
              {navigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}
            </h2>
            <div className="hidden sm:block ml-4 h-4 w-px bg-cyan-500/30"></div>
            <span className="hidden sm:block ml-4 text-xs font-mono text-cyan-500/70">
              SECURE CONNECTION ESTABLISHED
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="px-3 py-1 rounded-full bg-slate-800 border border-cyan-500/30 shadow-[0_0_5px_rgba(6,182,212,0.1)]">
              <span className="text-xs sm:text-sm text-cyan-300 font-mono tracking-wider hidden sm:inline">
                {new Date().toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse"></div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 relative">
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }}>
          </div>
          <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-slate-950/80"></div>

          <div className="relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout
