import { useState, useEffect } from 'react'
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
  X,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false) // Mobile sidebar
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // localStorage에서 상태 복원
    try {
      return localStorage.getItem('sidebar-collapsed') === 'true'
    } catch {
      return false
    }
  })
  const location = useLocation()

  // 사이드바 상태를 localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem('sidebar-collapsed', sidebarCollapsed.toString())
    } catch { }
  }, [sidebarCollapsed])

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
        fixed inset-y-0 left-0 z-50 bg-slate-900 border-r border-cyan-500/30
        transform transition-all duration-300 ease-out
        ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'} w-64
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        shadow-[0_0_15px_rgba(6,182,212,0.15)]
      `}>
        {/* Logo Area */}
        <div className={`flex items-center h-16 px-4 border-b border-cyan-500/30 bg-slate-900/50 backdrop-blur-md ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : 'justify-between px-6'}`}>
          {/* Mobile: Always show full logo / Desktop: conditional */}
          <h1 className={`text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wider drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
            AI Finance
          </h1>
          {/* Collapsed: show short logo */}
          {sidebarCollapsed && (
            <h1 className="hidden lg:block text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
              AI
            </h1>
          )}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className={`py-6 space-y-1 ${sidebarCollapsed ? 'lg:px-2 px-4' : 'px-4'}`}>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center gap-3 rounded-lg transition-all duration-200 group relative overflow-hidden
                  ${sidebarCollapsed ? 'lg:justify-center lg:px-0 lg:py-3 px-4 py-3' : 'px-4 py-3'}
                  ${isActive
                    ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)] border border-cyan-500/30'
                    : 'text-gray-400 hover:text-cyan-200 hover:bg-slate-800/50 hover:border hover:border-cyan-500/20'
                  }
                `}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.name : ''}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                )}
                <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' : 'group-hover:text-cyan-300'}`} />
                {/* Mobile: always show label / Desktop: only when expanded */}
                <span className={`font-medium tracking-wide whitespace-nowrap ${sidebarCollapsed ? 'lg:hidden' : ''}`}>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Desktop Collapse Toggle Button - bottom of sidebar */}
        <div className={`hidden lg:flex absolute bottom-12 left-0 right-0 justify-center px-2`}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg 
              text-cyan-400/70 hover:text-cyan-300 hover:bg-slate-800/80 
              border border-cyan-500/20 hover:border-cyan-500/40 
              transition-all duration-200 group
              ${sidebarCollapsed ? 'w-10 justify-center' : 'w-full justify-center'}
            `}
            title={sidebarCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium">사이드바 접기</span>
              </>
            )}
          </button>
        </div>

        {/* Sidebar Footer Decoration */}
        <div className="absolute bottom-0 left-0 right-0 p-4 opacity-30 pointer-events-none">
          <div className="h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
          <p className={`text-[10px] text-center text-cyan-500 mt-2 font-mono ${sidebarCollapsed ? 'lg:hidden' : ''}`}>SYSTEM READY</p>
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center h-14 sm:h-16 px-3 sm:px-6 bg-slate-900/80 backdrop-blur-md border-b border-cyan-500/30 shadow-lg">
          {/* Mobile: hamburger menu */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden mr-3 p-2 -ml-2 text-cyan-400 hover:bg-slate-800 rounded-lg touch-manipulation transition-colors"
            aria-label="메뉴 열기"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Desktop: sidebar toggle in header */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex mr-3 p-2 -ml-2 text-cyan-400/70 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors items-center"
            aria-label={sidebarCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
            title={sidebarCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
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
