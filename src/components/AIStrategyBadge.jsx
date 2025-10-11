import { useEffect, useState } from 'react'
import { Sparkles, Zap, AlertCircle } from 'lucide-react'
import aiService from '../services/aiService'

/**
 * Badge showing current AI strategy (Dual/Gemini-only/OpenAI-only/None)
 */
const AIStrategyBadge = () => {
  const [providers, setProviders] = useState(null)

  useEffect(() => {
    const checkProviders = () => {
      const available = aiService.getAvailableProviders()
      setProviders(available)
    }
    checkProviders()
  }, [])

  if (!providers) return null

  const strategyInfo = {
    dual: {
      icon: Sparkles,
      text: '이중 AI 전략',
      color: 'bg-gradient-to-r from-purple-500 to-blue-500',
      textColor: 'text-white',
      description: 'Gemini Flash (기본) + GPT-5 (고급)'
    },
    'gemini-only': {
      icon: Zap,
      text: 'Gemini Flash',
      color: 'bg-green-500',
      textColor: 'text-white',
      description: '비용 효율적 AI'
    },
    'openai-only': {
      icon: Sparkles,
      text: 'GPT-5',
      color: 'bg-blue-500',
      textColor: 'text-white',
      description: '고급 AI 분석'
    },
    none: {
      icon: AlertCircle,
      text: 'AI 미설정',
      color: 'bg-gray-400',
      textColor: 'text-white',
      description: 'API 키가 필요합니다'
    }
  }

  const info = strategyInfo[providers.strategy]
  const Icon = info.icon

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium"
         style={{ background: info.color }}>
      <Icon className={`w-4 h-4 ${info.textColor}`} />
      <span className={info.textColor}>{info.text}</span>
    </div>
  )
}

export default AIStrategyBadge
