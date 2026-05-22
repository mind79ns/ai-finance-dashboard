// 클라이언트 노출 가능한 키만 유지. OpenAI/Gemini 키는 서버(Netlify Function) 전용으로 이전됨.
// 보안: 빌드 시 번들에 OPENAI_API_KEY/GEMINI_API_KEY 가 포함되지 않도록 VITE_ 접두사 사용 금지.
export const API_CONFIG = {
  // FRED (미국 금리 등) — 무료 공개 키
  FRED_API_KEY: import.meta.env.VITE_FRED_API_KEY || '',

  // 한국투자증권 OpenAPI — 서버 측 Netlify Function 만 사용 (kis-token, kis-price, kis-batch)
  // 클라이언트 노출이 필요한 경우는 없으나 기존 호환 위해 유지 (실제로 클라이언트 코드에선 사용 안 함)
  KIS_APP_KEY: import.meta.env.VITE_KIS_APP_KEY || '',
  KIS_APP_SECRET: import.meta.env.VITE_KIS_APP_SECRET || '',

  // Finnhub (미국 주식) — 무료 tier 키, 클라이언트 호출
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
