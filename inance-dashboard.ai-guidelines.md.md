AI Finance Dashboard — 핵심 정리.

## Stack & Layout
- React 18 + Vite 5 + React Router 6, TailwindCSS 3, lucide-react 아이콘, Recharts 기반.
- `src/App.jsx`에서 전역 라우팅을 정의하고 `components/Layout.jsx`가 반응형 사이드바/헤더와 상단 날짜 표시를 담당.
- 공통 UI 컴포넌트(`ChartCard`, `StatCard`, `SlidePanel`, `AssetDetailView`, `AIStrategyBadge`)를 재사용해 카드, 패널, AI 상태 배지를 구성.

## 구현 기능
- `Dashboard.jsx`: localStorage(포트폴리오·투자일지·목표)와 `marketDataService`를 집계해 환율 반영 KPI, 6개월 밸류 곡선, 자산 배분/목표 요약, 시장 하이라이트 스트립, 최근 거래 및 종목별 손익 테이블을 출력.
- `Portfolio.jsx`: `portfolio_assets`/`account_principals`를 관리하며 Finnhub·한국투자증권·CoinGecko 실시간 시세와 환율을 동기화. 심볼 검색, 유형 필터, 수익률 정렬, 다중 선택 일괄 삭제, CSV(UTF-8/EUC-KR 자동 인식)·JSON 입출력, 계좌별 투자 관리표와 원금·예수금 모달, 슬라이드 상세 패널을 제공.
- `InvestmentLog.jsx`: `investment_logs` 보관, 리스트/캘린더 전환, 날짜별 순익 하이라이트, 포트폴리오 연동 매수·매도 자동 반영, 자산 선택 드롭다운, CSV 내보내기 기능을 포함.
- `Market.jsx`: `marketDataService`의 지수 ETF/금/암호화폐/환율을 2분 주기 갱신, 카테고리 필터 및 API 키 미설정 알림을 노출.
- `Goals.jsx`: `investment_goals` 저장, 포트폴리오 총액·총수익 링크(목표별 total/profit 선택) 및 5분 환율 갱신, Storage 이벤트/폴링 동기화, 8% 복리 가정 목표 경로 차트와 필요 수익률·리스크 분석, AI 제안(유형별 배지) 생성을 지원.
- `AssetStatus.jsx`: `asset_status_data`·`asset_account_data` 등으로 연도별 수입/지출/계좌 현황을 저장, 월별 누적 금액 자동 계산, 카테고리·계좌 추가/편집/삭제, Breakdown 차트와 표를 제공.
- `AIReport.jsx`: AI 모델 자동/수동 선택, `AIStrategyBadge` 표시, 실데이터 기반 시장/포트폴리오/리스크/리밸런싱 리포트와 상담 탭을 구성. 결과는 `ai_report_history`에 최대 20건 저장되며 히스토리 뷰어·다운로드·클립보드 복사를 제공하고 키 없을 때 안내문을 출력.

## 데이터 & 서비스
- `marketDataService.js`: Finnhub ETF·금, CoinGecko 코인, ExchangeRate-API 환율을 병렬 호출하고 60초 캐시/폴백 데이터를 제공, `getMultipleStockPrices`로 복수 종목 시세를 반환.
- `kisService.js`: Netlify Functions(`/netlify/functions/kis-price`) 프록시로 국내 주식/ETF 시세를 1분 캐시와 순차 호출로 조회, 일괄 조회(`getMultiplePrices`) 지원.
- `aiService.js`: OpenAI(`gpt-4-turbo-preview`)·Gemini(`gemini-2.5-flash`) 이중 전략, 작업 난이도 기반 자동 라우팅과 강제 모델 선택(`auto`/`gpt`/`gemini`), 시장 리포트·포트폴리오 분석 등 헬퍼 메서드를 제공.
- 주요 localStorage 키: `portfolio_assets`, `account_principals`, `investment_logs`, `investment_goals`, `asset_status_data`, `asset_account_data`, `asset_income_categories`, `asset_expense_categories`, `asset_account_types`, `ai_report_history`.

## 개발 메모
- 스크립트: `npm run dev`, `npm run build`, `npm run preview`, `npm run lint`.
- 모든 API 키는 `.env` (Vite 규칙) 또는 Netlify 환경 변수로 설정. 미설정 시 UI는 폴백 데이터/안내 문구로 동작.
- 포트폴리오 갱신은 2분 간격 실시간 시세 갱신 및 매수/매도 자동 반영이 있으므로 localStorage 구조 변경 시 업데이트 로직을 함께 확인.
