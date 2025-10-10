# CLAUDE.md

AI Finance Dashboard — 핵심 정리.

## Stack & Layout
- React 18 + Vite 5 + React Router 6, TailwindCSS 3, lucide-react 아이콘, Recharts 기반.
- `src/App.jsx`에서 전역 라우팅, `components/Layout.jsx`는 반응형 사이드바/헤더 제공.
- 공통 카드·패널 컴포넌트(`ChartCard`, `StatCard`, `SlidePanel`, `AssetDetailView`)로 페이지 UI 구성.

## 구현 기능
- `Dashboard.jsx`: 모의 데이터로 KPI 카드와 Recharts 그래프 표시.
- `Portfolio.jsx`: `portfolio_assets` localStorage CRUD, 실시간 시세 업데이트(`marketDataService` + `kisService`), CSV(EUC-KR/UTF-8)·JSON 내보내기, 투자기록/디테일 패널 연동.
- `InvestmentLog.jsx`: 매수·매도 기록(`investment_logs`), 리스트/캘린더 뷰, 거래 시 포트폴리오 수량·평단 자동 갱신.
- `Market.jsx`: 주요 ETF(지수), 금, 암호화폐, 환율 데이터 집계 표시 및 카테고리 필터. 키 미설정 시 폴백 안내.
- `Goals.jsx`: `investment_goals` 저장, 포트폴리오 총액/수익과 환율 연동, AI 추천 호출 옵션.
- `AssetStatus.jsx`: 월별 자산/수입/지출 추적, 카테고리·계좌 커스터마이즈를 localStorage에 저장.
- `AIReport.jsx`: 시장·포트폴리오·리스크 분석, 리밸런싱 제안, Q&A를 `aiService`로 생성(키 없을 때 샘플 텍스트).

## 데이터 & 서비스
- `marketDataService.js`: Finnhub(ETF 지수·개별주, `VITE_FINNHUB_API_KEY` 필요), CoinGecko(코인), ExchangeRate-API(환율) 병렬 호출·60초 캐시·폴백 데이터 제공.
- `kisService.js`: Netlify Functions(`/netlify/functions/kis-price`, `/kis-token`) 프록시로 국내 주식 시세 조회. 환경 변수 `KIS_APP_KEY`, `KIS_APP_SECRET`는 Netlify 비밀값.
- `aiService.js`: OpenAI(`VITE_OPENAI_API_KEY`, 기본 모델 `gpt-4-turbo-preview`)와 Gemini(`VITE_GEMINI_API_KEY`, 기본 `gemini-2.5-flash`) 자동 라우팅. 키 미설정 시 고정 안내문 반환.
- 주요 localStorage 키: `portfolio_assets`, `investment_records`, `investment_logs`, `investment_goals`, `asset_status_data`, `asset_account_data`, `asset_income_categories`, `asset_expense_categories`, `asset_account_types`.

## 개발 메모
- 스크립트: `npm run dev`, `npm run build`, `npm run preview`, `npm run lint`.
- 모든 API 키는 `.env` (Vite 규칙) 또는 Netlify 환경 변수로 설정. 미설정 상태에서도 UI는 폴백 데이터/안내 문구로 작동.
- 포트폴리오/로그 수정 시 가중평단 계산과 localStorage 동기 유지 필요.
