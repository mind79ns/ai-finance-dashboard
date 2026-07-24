# CLAUDE.md — AI Finance Dashboard

> 이 문서는 Claude Code 등 AI 에이전트가 프로젝트를 즉시 파악할 수 있도록 작성된 **단일 진실 소스(Single Source of Truth)** 입니다.
> 외부용 소개는 `README.md`를 참고하세요.

---

## 1. 프로젝트 개요

개인용 **AI 기반 자산 관리 / 시장 분석 대시보드**.
React SPA + Tailwind 사이버펑크 다크 테마, localStorage 우선 + Supabase 클라우드 동기화, Netlify Functions로 한국투자증권 / Yahoo / Naver 시세를 프록시 호출.

핵심 가치
- 모든 자산(미국·한국 주식, 코인, 현금)을 단일 대시보드로 통합 관리.
- 매수/매도 → 포트폴리오 → 투자일지 → 자산현황 → AI 리포트가 단방향으로 연결되는 데이터 흐름.
- API 키 미설정 시에도 폴백 데이터로 UI가 항상 동작.

---

## 2. 기술 스택

| 영역 | 사용 기술 |
|---|---|
| Frontend | React 18, Vite 5, React Router 6 |
| Styling | Tailwind CSS 3 (Cyberpunk Dark Custom), `clsx`, `tailwind-merge` |
| Charts | Recharts 2 (Dashboard, Portfolio, Goals 등), Chart.js 4 (일부 페이지) |
| Icons | lucide-react |
| AI | OpenAI(`gpt-4-turbo-preview` 기본 / `gpt-4o`), Google Gemini(`gemini-2.5-flash` / `gemini-2.5-pro`) |
| DB | Supabase (PostgreSQL + RLS) |
| Backend Functions | Netlify Functions (Node) |
| 배포 | Netlify (GitHub push → CI/CD) |
| 로컬 백업 | localStorage (오프라인 우선) |

---

## 3. 폴더 구조

```
ai-finance-dashboard/
├── src/
│   ├── App.jsx                # 라우팅 정의 (9개 라우트)
│   ├── main.jsx               # React 진입점
│   ├── index.css              # Tailwind base + 사이버펑크 글로벌 CSS
│   ├── pages/                 # 라우트 단위 화면 (9개)
│   ├── components/            # 공통 UI (Layout, ChartCard, StatCard, SlidePanel 등)
│   ├── services/              # 외부 API / Supabase 클라이언트
│   ├── utils/                 # 동기화, 가격 갱신, AI 인사이트 유틸
│   ├── hooks/                 # useMarketData, usePortfolio
│   ├── config/                # API_CONFIG, MARKET_SYMBOLS, ROUTES 상수
│   └── agents/stock-analysis/ # AI 종목 분석용 6단계 프롬프트(.md, Vite raw import)
├── netlify/functions/         # KIS / Yahoo / Naver 프록시 함수
├── supabase/
│   ├── functions/update-market-prices/  # 가격 캐시 Edge Function (Deno)
│   └── .temp/                 # Supabase CLI 캐시
├── supabase-schema.sql        # 메인 스키마
├── supabase-asset-prices.sql  # 가격 캐시 테이블 보조 스크립트
├── supabase-drop-all.sql      # 초기화용
└── CLAUDE.md / README.md
```

---

## 4. 라우트 ↔ 페이지 ↔ 책임

`src/App.jsx`에서 정의된 9개 라우트. 모두 `components/Layout.jsx` 안에서 렌더링.

| 경로 | 파일 | 책임 요약 |
|---|---|---|
| `/dashboard` | `pages/Dashboard.jsx` | KPI(총자산/수익/배당), 6개월 밸류 곡선, 자산배분, 목표 요약, 시장 하이라이트, 최근 거래·종목별 손익 테이블. `RefreshCw` 클릭 시 백그라운드 시세 갱신. 세부 분석 팝업(`DashboardDetailDialog`)에서 월 순변동·연간요약·ASSET STATUS 등 심층 차트 표시 |
| `/portfolio` | `pages/Portfolio.jsx` | `portfolio_assets` / `account_principals` 관리. Finnhub·KIS·CoinGecko 실시간 시세, 환율 동기화, 필터·정렬·다중삭제, CSV/JSON 입출력, 계좌별 투자관리표, 원금·예수금 모달, 슬라이드 상세(`AssetDetailView`) |
| `/log` | `pages/InvestmentLog.jsx` | `investment_logs` 보관. 리스트/캘린더 토글, 매수·매도 시 포트폴리오 자동 반영, 자산 드롭다운, 월별 통계, CSV 내보내기 |
| `/market` | `pages/Market.jsx` | `marketDataService` 통해 지수 ETF / 금 / 코인 / 환율을 2분 주기 갱신. API 키 미설정 안내, 카테고리 필터 |
| `/ai-report` | `pages/AIReport.jsx` | AI 모델 자동/수동 선택(`AIStrategyBadge`), 시장·포트폴리오·리스크·리밸런싱 리포트와 상담 탭. 결과는 `ai_report_history`에 최대 20건 저장, 히스토리 뷰어·다운로드·복사 |
| `/goals` | `pages/Goals.jsx` | `investment_goals` 저장. 목표별 포트폴리오 연결(`total`/`profit`), 8% 복리 가정 경로 차트, 5분 환율 갱신, Storage 이벤트 동기화, AI 제안(유형 배지) |
| `/asset-status` | `pages/AssetStatus.jsx` | 연도별 수입/지출/계좌 현황(`asset_status_data`, `asset_account_data`). 월별 누적, 카테고리·계좌 CRUD, Breakdown 차트/표 |
| `/transaction-history` | `pages/TransactionHistory.jsx` | 입출금·배당 내역. 모달(내역/배당/통계), 환율 기반 KRW·USD 평가, 월별 배당 차트 |
| `/settings` | `pages/Settings.jsx` | 통화 설정, API 키 입력, 데이터 백업/복원(`backupManager`), 위험 영역(전체 초기화) |

> Redirect: `/` → `/dashboard`.

---

## 5. 핵심 서비스 (`src/services/`)

| 파일 | 역할 | 비고 |
|---|---|---|
| `marketDataService.js` | Finnhub(ETF·금) + CoinGecko(코인) + ExchangeRate-API(환율) 병렬 호출, 60초 캐시, 한국 종목 6자리 → `.KS`/`.KQ` 자동 정규화. `getMultipleStockPrices` 일괄 시세 |
| `kisService.js` | Netlify Function(`/.netlify/functions/kis-price`) 프록시로 국내 주식·ETF 시세 1분 캐시, 순차 호출, `getMultiplePrices` |
| `aiService.js` | OpenAI / Gemini 이중 전략. 작업 난이도 기반 자동 라우팅(`auto`) 또는 강제 선택(`gpt`/`gemini`). 시장 리포트, 포트폴리오 분석 등 헬퍼 메서드 |
| `stockAgentService.js` | `src/agents/stock-analysis/*.md` 6개 프롬프트를 Vite `?raw` import → 기업개요 → 재무 → 산업 → 모멘텀 → 리스크 → 종합의견 파이프라인 |
| `supabaseService.js` | Supabase 클라이언트(env 없으면 `null`). `portfolios`/`account_principals`/`goals`/`investment_logs`/`user_settings` upsert·load, localStorage ↔ Supabase 정규화 함수들 포함 |

---

## 6. 유틸 (`src/utils/`)

| 파일 | 역할 |
|---|---|
| `dataSync.js` | localStorage 키들과 Supabase 양방향 동기화 코디네이터. Storage 이벤트 트리거. |
| `priceUpdater.js` | Dashboard `RefreshCw` 클릭 시 호출. Finnhub·KIS·CoinGecko·환율을 일괄 갱신하고 `portfolio_assets`에 currentPrice 주입. 포트폴리오 탭 미방문 상태에서도 최신성 보장. |
| `aiInsights.js` | AI 리포트용 데이터 가공 — 포트폴리오 요약, 리스크 점수, 리밸런싱 후보 등. |
| `backupManager.js` | Settings의 백업/복원 — 모든 localStorage 키를 JSON 직렬화. |
| `cn.js` | `clsx + tailwind-merge` 헬퍼. |

---

## 7. localStorage 키 (Single Source of UI Data)

모든 페이지는 우선 localStorage에서 읽고, Supabase가 설정되어 있으면 백그라운드 동기화.

| 키 | 사용처 |
|---|---|
| `portfolio_assets` | Portfolio, Dashboard, InvestmentLog 매수/매도 반영 |
| `account_principals` | Portfolio 계좌별 원금/예수금 |
| `investment_logs` | InvestmentLog, TransactionHistory |
| `investment_goals` | Goals, Dashboard 목표 요약 |
| `asset_status_data` | AssetStatus 월별 수입/지출 |
| `asset_account_data` | AssetStatus 계좌별 현황 |
| `asset_income_categories` / `asset_expense_categories` | AssetStatus 카테고리 정의 |
| `asset_account_types` | AssetStatus 계좌 유형 정의 |
| `ai_report_history` | AIReport 결과 히스토리(최대 20건) |

> localStorage 구조 변경 시 `priceUpdater.js`, `dataSync.js`, 각 페이지 로더를 함께 확인할 것.

---

## 8. Supabase 스키마 (`supabase-schema.sql`)

| 테이블 | 핵심 컬럼 | 비고 |
|---|---|---|
| `portfolios` | `id BIGINT PK`, symbol, name, type, quantity, avg_price, current_price, account, category | localStorage `portfolio_assets`와 1:1 매핑 |
| `account_principals` | `account_name UNIQUE`, principal, remaining | 계좌별 원금/예수금 |
| `goals` | id BIGINT, title, target_amount, deadline, status, link_type | NULL 허용 (target_amount 등) |
| `investment_logs` | id BIGINT, date, type, amount, quantity, price, total, asset | tags TEXT[], metadata JSONB |
| `user_settings` | `(user_id, key)` PK, value JSONB | 대시보드 사용자 정의 데이터 |
| `asset_prices` | symbol PK, price, change_percent, currency, type | 가격 캐시 (Edge Function `update-market-prices`가 갱신) |

- 모든 테이블 RLS 활성, 정책은 `Enable all access for all users` (인증 미구현 단계).
- `updated_at`는 트리거 `update_updated_at_column()`로 자동 갱신.
- 초기화는 `supabase-drop-all.sql` → `supabase-schema.sql` 순.

---

## 9. 환경 변수 (`.env`)

> `VITE_` 접두사가 있는 변수만 클라이언트(브라우저) 번들에 노출됩니다. AI/거래용 비밀 키는 서버(Netlify Function) 전용으로 분리.

```env
# === 서버 전용 (AI / 거래) — VITE_ 접두사 없음 ===
# AI Tier 라우팅: basic=Gemini Flash, standard=Gemini Pro (기본), premium=GPT-5.6 Terra (심층모드 토글 시만)
OPENAI_API_KEY=                       # premium / fallback
OPENAI_MODEL=gpt-5.6-terra             # 2026-07-09 출시. sol(최고성능)/terra(균형,기본값)/luna(저비용) 중 선택
GEMINI_API_KEY=                       # 기본 라우팅 (무료 tier 권장)
GEMINI_PRO_MODEL=gemini-2.5-pro
GEMINI_FLASH_MODEL=gemini-2.5-flash

# 한국투자증권 — Netlify Function (kis-token/kis-price/kis-batch) 전용
KIS_APP_KEY=
KIS_APP_SECRET=

# === 클라이언트 노출 OK (무료 / anon) ===
VITE_FINNHUB_API_KEY=                 # 미국 주식, 무료 tier
VITE_FRED_API_KEY=                    # 미국 금리, 무료
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=               # RLS 적용된 anon key
```

미설정 시 동작
- Supabase 없으면 → `console.warn` 후 localStorage 단독 사용.
- 시세 키 없으면 → 폴백 더미 데이터 + UI 알림.
- AI 키 없으면 → `/.netlify/functions/ai-proxy` 가 503 응답, UI 는 fallback 안내문 표시.

AI 모델 라우팅 (`src/services/aiService.js`)
- 모든 호출이 `/.netlify/functions/ai-proxy` 경유 (클라이언트에 키 노출 금지).
- 기본 라우팅은 Gemini Pro. 사용자가 AIReport 의 "🚀 심층모드" 토글 ON 시만 GPT-5.6 Terra.
- Gemini 한도 초과 시 Flash → GPT-5.6 Terra 순으로 자동 fallback.
- GPT-5 계열은 Chat Completions API 파라미터가 다름 (`max_completion_tokens`, temperature 미지원) — `netlify/functions/ai-proxy.js` 의 `isReasoningModel()` 분기 참고.
- 동일 (provider+model+prompt) 응답은 30분 localStorage 캐시.

---

## 10. Netlify Functions (`netlify/functions/`)

| 함수 | 용도 |
|---|---|
| `kis-token.js` | 한국투자증권 OAuth 토큰 발급/캐싱 |
| `kis-price.js` | 국내 종목 현재가 조회 (브라우저 CORS 우회용 프록시) |
| `naver-finance.js` | 종목명·지수 보조 데이터 |
| `yahoo-finance.js` | 글로벌 지수 / 환율 폴백 |

`netlify.toml`로 빌드 명령 + 함수 디렉토리 설정. 환경 변수는 Netlify Dashboard에 별도 등록.

---

## 11. Supabase Edge Function (`supabase/functions/update-market-prices/`)

- Deno 런타임. `asset_prices` 테이블을 외부 시세로 갱신하는 스케줄용 함수.
- 로컬 개발은 `supabase functions serve update-market-prices` (CLI 필요).

---

## 12. 사이버펑크 다크 테마 규칙

- 배경 기준 `bg-slate-950`, 카드/사이드바 `bg-slate-900` + `backdrop-blur` + `border-opacity-30`.
- 액센트 컬러
  - **Cyan-400** — 정보/Primary
  - **Emerald-400** — 매수/이익
  - **Rose-400** — 매도/손실
- 강조 표시 시 `drop-shadow` 네온 글로우 사용. Dashboard ACCOUNT SUMMARY 등은 `!important`로 강제.
- **라이트 모드 잔재 금지**. `bg-white`, `text-gray-900`, `border-gray-200`, `hover:bg-gray-50` 등은 UI 작업 후 항상 `grep` 검증.
- 차트 툴팁/축은 `slate-800` 배경 + `cyan-300` 텍스트로 통일.

---

## 13. npm 스크립트

```bash
npm run dev       # Vite 개발 서버
npm run build     # 프로덕션 빌드 → dist/
npm run preview   # 빌드 결과 미리보기
npm run lint      # eslint src/ (--max-warnings 0)
```

> 단위 테스트 스위트는 아직 없음. UI 변경 시 `npm run build` + 브라우저 수동 검증이 현재의 검증 절차.

---

## 14. 배포 흐름

1. 로컬에서 변경 → `npm run build`로 빌드 확인.
2. `git add` → `git commit` → `git push origin main`.
3. Netlify가 GitHub webhook 감지 → 자동 배포.

`.agent/workflows/auto-deploy.md`에 자동 배포 절차가 등록되어 있음 (Claude Code `// turbo-all` 트리거).

---

## 15. 데이터 흐름 (요약)

```
[사용자 입력]
    ↓
Portfolio / InvestmentLog / AssetStatus 등 페이지
    ↓
localStorage (즉시 저장)
    ↓
dataSync.js → Supabase (백그라운드)
    ↓
Dashboard / AIReport / Goals (집계·시각화)
    ↑
marketDataService / kisService / priceUpdater (외부 시세 주입)
```

---

## 16. 작업 시 주의사항

- **localStorage 키 추가/변경 시**: `dataSync.js`, `backupManager.js`, `priceUpdater.js`, 영향받는 페이지 로더를 같이 수정.
- **Supabase 스키마 변경 시**: `supabase-schema.sql` 수정 + `supabaseService.js`의 normalize 함수 검토.
- **UI 변경 시**: 사이버펑크 컬러 규칙 준수 + 모바일 반응형 검증.
- **신규 페이지 추가 시**: `App.jsx` 라우트 + `Layout.jsx` 사이드바 항목 + 본 CLAUDE.md 표 갱신.
- **새 소스 파일은 첫 줄에 한글 한 줄 코멘트**로 역할 명시 (글로벌 CLAUDE.md 규칙).

---

## 17. 외부 문서

- `README.md` — GitHub 표지(외부용).
- `.claude/agents/*.md` — Claude Code 전용 서브에이전트 정의(build-deploy-manager 등).
- `src/agents/stock-analysis/*.md` — AI 종목 분석 6단계 프롬프트(앱이 빌드 시 raw 텍스트로 import, 수정 시 즉시 영향).

이전에 존재하던 `PROJECT.md`(변경 이력), `ainance-dashboard.ai-guidelines.md`(요약), `supabase-setup.md`(셋업 절차), `ai-fix.md`(일회성 제안)는 본 문서로 통합되어 삭제되었습니다.
