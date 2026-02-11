export const API_CONFIG = {
  OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY || '',
  OPENAI_MODEL: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4.1-preview',  // Latest: Best for complex analysis (High Context)
  GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY || '',
  GEMINI_MODEL: import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-pro',  // Latest: High context window
  GEMINI_FLASH_MODEL: 'gemini-1.5-flash',  // Cost-effective & Fast
  AI_PROVIDER: import.meta.env.VITE_AI_PROVIDER || 'openai',
  FRED_API_KEY: import.meta.env.VITE_FRED_API_KEY || '',

  // 한국투자증권 OpenAPI
  KIS_APP_KEY: import.meta.env.VITE_KIS_APP_KEY || '',
  KIS_APP_SECRET: import.meta.env.VITE_KIS_APP_SECRET || '',

  // Finnhub (미국 주식)
  FINNHUB_API_KEY: import.meta.env.VITE_FINNHUB_API_KEY || '',
}

export const MARKET_SYMBOLS = {
  SP500: '^GSPC',
  NASDAQ: '^IXIC',
  DOW: '^DJI',
  GOLD: 'GC=F',
  BITCOIN: 'BTC-USD',
  ETHEREUM: 'ETH-USD',
}

export const CURRENCY_PAIRS = {
  USD_KRW: 'KRW=X',
  USD_EUR: 'EUR=X',
  USD_JPY: 'JPY=X',
}

export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  PORTFOLIO: '/portfolio',
  MARKET: '/market',
  AI_REPORT: '/ai-report',
  INVESTMENT_LOG: '/log',
  GOALS: '/goals',
}
