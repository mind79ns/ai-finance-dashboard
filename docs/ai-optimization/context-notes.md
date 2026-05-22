# Context Notes — AI 최적화 작업 기록

## 2026-05-21 — Step 1 시작

### 사용자 결정
- 옵션 1 채택 — 4가지 전략 모두 적용 (Gemini 우선 + Netlify 프록시 + Prompt Caching + 컨텍스트 슬리밍).
- 비용 절감 우선, 단 기능 저하는 NO.

### 핵심 설계 결정

**TASK_LEVEL 3단계 확장**
- BASIC: Gemini 2.5 Flash. 시장 요약, 간단 응답.
- STANDARD: Gemini 2.5 Pro. 리포트, 포트폴리오 분석, 종목 분석, 채팅 기본.
- PREMIUM: GPT-4o. 사용자 명시 토글 시만.

이전 ADVANCED 가 GPT-4o 였던 것을 STANDARD (Gemini Pro) 로 변경. ADVANCED 호환은 STANDARD 별칭으로 처리 (호출자 코드 최소 수정).

**프록시 API 설계**
- POST `/.netlify/functions/ai-proxy`
- Body: `{ provider, model, messages, systemPrompt, maxTokens, temperature, taskLevel }`
- provider: 'openai' | 'gemini' | 'auto'
- model: 'flash' | 'pro' | 'gpt-4o' 또는 실제 모델 ID
- 응답: `{ text, model, provider, tokensUsed, cached }`

**Gemini 한도 초과 시 fallback 정책**
- STANDARD (Gemini Pro) 한도 초과 → BASIC (Gemini Flash) 로 다운그레이드 (무료 유지).
- BASIC 도 초과 → PREMIUM (GPT-4o) 자동 승급 (비용 발생하지만 기능 유지).
- 사용자에게 fallback 알림 (UI 토스트 또는 응답 메타에 표시).

**캐싱 전략**
- 클라이언트: `aiResponseCache` localStorage 키. value = { hash: { text, ts, model } }, TTL 30분.
- hash = SHA-256 (provider + model + systemPrompt + prompt). 간단히 `btoa` 도 가능 (충돌률 무시).
- 캐시 hit 시 네트워크 호출 생략.

**컨텍스트 슬리밍**
- 포트폴리오 전체 JSON → 요약 객체로 압축.
  - assets: [{ symbol, name, qty, avg, current, profitPct, currency }]
  - totals: { valueKRW, profitKRW, profitPct }
- 시세 히스토리, 메타데이터, ID 등 제거.

**보안 — VITE_ 제거**
- Vite는 `VITE_` 접두사 환경변수만 클라이언트 번들에 노출.
- `VITE_OPENAI_API_KEY` → `OPENAI_API_KEY` 로 이름 변경 시 클라이언트에서 접근 불가, 서버(Netlify Function) 에서만 `process.env.OPENAI_API_KEY` 로 사용 가능.
- 사용자가 Netlify Dashboard 에 새 이름으로 등록해야 함 (작업 후 안내).

### 적용 결과 (2026-05-21)

**구현 완료**
- `netlify/functions/ai-proxy.js` 신설. OpenAI/Gemini 통합 처리, taskLevel/forceProvider 기반 모델 선택, Gemini→Flash→GPT-4o 순차 fallback.
- `aiService.js` 전면 리팩토링. callOpenAI/callGemini 제거 → 단일 routeAIRequest → POST `/.netlify/functions/ai-proxy`. 응답 30분 localStorage 캐시. 컨텍스트 슬리밍 헬퍼 (slimPortfolio, slimAssets).
- `TASK_LEVEL`: BASIC=Flash, STANDARD=Pro, PREMIUM=GPT-4o. ADVANCED 는 STANDARD 별칭으로 호환 유지 → 기존 11개 호출자 코드 수정 불필요.
- `setPremiumMode(true)` → localStorage `ai_premium_mode=true` → routeAIRequest 가 forceProvider='auto' 일 때도 GPT-4o 강제. AIReport 의 selectedAI='gpt' 토글이 이 값과 동기화 → 다른 페이지(Goals, StockAgent) 호출도 GPT-4o 사용.
- AIReport UI 라벨 갱신. "GPT-4.1" → "심층모드 (GPT-4o)", "💰 비용 최적화" → "🤖 자동 (Gemini Pro 기본)", "⚠️ 유료" 표시 추가.
- constants.js — OPENAI/GEMINI 키 부분 완전 제거. FRED, KIS, Finnhub 만 유지 (KIS 는 클라이언트 코드 실제 사용 안 함, 호환 유지).
- .env.example — 서버 전용 / 클라이언트 노출 분리 + 마이그레이션 가이드.
- CLAUDE.md §9 갱신.
- Goals.jsx 에러 메시지 안내 갱신.

**보안 검증**
- `dist/assets/*.js` grep — `api.openai.com`, `generativelanguage.googleapis.com` 0건.
- `VITE_OPENAI_API_KEY`, `VITE_GEMINI_API_KEY` 변수 참조 0건.
- 남은 `OPENAI_API_KEY`/`GEMINI_API_KEY` 문자열은 사용자 안내문 (보안 무관).

**비용 절감 동작 흐름**
1. 사용자가 AIReport 진입 → 기본 selectedAI='auto'.
2. 어떤 호출이든 forceProvider='auto' + STANDARD → Gemini Pro 라우팅 (무료).
3. Gemini 한도 초과 시 Flash 자동 fallback (여전히 무료). Flash 도 실패 시만 GPT-4o (유료).
4. 사용자가 "심층모드" 토글 → 모든 호출이 GPT-4o (유료 발생).
5. 동일 질문 30분 캐시 → 네트워크 호출 0건.

**Netlify 환경변수 등록 필요 (사용자 작업)**
1. Netlify Dashboard → Site → Site settings → Environment variables.
2. 다음 4개 변수 추가/수정.
   - `OPENAI_API_KEY` = (기존 VITE_OPENAI_API_KEY 값)
   - `GEMINI_API_KEY` = (기존 VITE_GEMINI_API_KEY 값)
   - `OPENAI_MODEL` = `gpt-4o` (선택)
   - `GEMINI_PRO_MODEL` = `gemini-2.5-pro` (선택)
   - `GEMINI_FLASH_MODEL` = `gemini-2.5-flash` (선택)
3. 기존 `VITE_OPENAI_API_KEY`, `VITE_GEMINI_API_KEY`, `VITE_AI_PROVIDER` 등은 더 이상 사용 안 됨 — 제거 권장 (선택).

### 2026-05-21 — Step 1 사후 보강 (Gemini 호출 강화)

**사용자 보고**
- 콘솔: `⚠️ AI fallback used → gemini/gemini-2.5-flash` 매 호출 발생.
- 별 호출에서 `✅ AI response (openai/gpt-4.1)` 도 나옴 → 사용자가 OPENAI_MODEL=gpt-4.1 으로 환경변수 등록한 것 확인.
- Gemini 응답 품질 형편없음.

**진단**
- Gemini Pro (`gemini-2.5-pro`) 호출이 무료 tier 에서 반복 거부되어 Flash 로 항상 fallback 되는 패턴.
- callGemini 가 systemPrompt 를 user content 에 합치고 있어 모델의 역할 인지가 약함 → 품질 저하.
- generationConfig 가 temperature 만 있고 topP/topK 미설정 → 응답 다양성·구조화 부족.
- safetySettings 미설정 → 금융 키워드에서 안전 필터 차단 가능.

**적용한 4가지 개선**
1. `systemInstruction` 필드로 systemPrompt 분리 (v1beta 지원).
2. `generationConfig` 강화 — topP 0.95, topK 40, maxOutputTokens 최소 1024 보장, responseMimeType text/plain.
3. `safetySettings` 4개 카테고리 모두 BLOCK_ONLY_HIGH (금융 분석 시 차단 최소화).
4. 응답 추출 안전화 — parts 배열 모두 합치고, finishReason 확인. 빈 응답 시 에러로 throw 하여 fallback chain 진입.

**Gemini fallback chain 재설계**
- 이전: Pro → Flash → GPT-4o
- 변경: Pro → 2.0-flash-exp → 1.5-pro → Flash → GPT-4o
- 무료 tier 에서 안정적인 모델을 Flash 보다 먼저 시도하여 품질 유지.
- 환경변수 `GEMINI_FALLBACK_1`, `GEMINI_FALLBACK_2` 로 오버라이드 가능.

**캐시 무효화**
- `CACHE_VERSION = 'v2'` 추가. hash 키에 prefix → 기존 v1 캐시 자동 무효화.
- 사용자가 localStorage 수동 삭제 불필요.

**미확인 가설**
- gpt-4.1 모델 ID 가 OpenAI 에 등록되어 있다는 점 확인. 사용자 의도면 유지 (gpt-4o 대비 약간 저렴 + 컨텍스트 길음).
- Gemini 2.5 Pro 무료 tier 거부 원인이 RPM 인지 모델 미지원인지 불명확. fallback chain 으로 우회.

### 미해결 / 차후 확인
- Gemini explicit caching (paid tier) 도입 여부 — 무료 tier 사용 중이면 적용 불가, 유료 전환 시 추가 절감.
- 채팅 인터페이스의 연속 대화 컨텍스트 — Step 2 (Phase 1) 작업.
- 캐시 hash 충돌 가능성 — 현재는 단순 btoa, 운영 안정성 확인 후 SHA-256 고려.
