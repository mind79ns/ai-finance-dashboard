import { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * 전문가급 슬라이드 패널 컴포넌트
 *
 * 사용처: 자산 상세 뷰, 거래 타임라인, 분석 리포트 등
 * 특징: 부드러운 애니메이션, 오버레이, ESC 키 지원
 */
const SlidePanel = ({
  isOpen,
  onClose,
  children,
  title,
  width = 'max-w-2xl' // sm, md, lg, xl, 2xl, 3xl, 4xl
}) => {
  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // Body 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
        onClick={onClose}
        style={{ backdropFilter: 'blur(4px)' }}
      />

      {/* Slide Panel */}
      <div
        className={`fixed top-0 right-0 h-full ${width} w-full bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out overflow-hidden flex flex-col`}
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-white">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-lg transition-colors"
            aria-label="Close panel"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {children}
        </div>
      </div>
    </>
  )
}

export default SlidePanel
