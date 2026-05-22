# Plan — Step 1: AI 키 보안 + 비용 최적화 (Critical #4 + Tier 라우팅)

## 목표
1. AI API 키를 클라이언트 번들에서 제거하고 Netlify Function 경유로만 호출.
2. GPT-4o 사용량을 최소화하고 Gemini 2.5 Pro 를 기본 모델로 전환.
3. 기능 품질 저하 없이 비용 절감.

## 4가지 동시 적용 전략

### ① Tier 라우팅 재설계
- BASIC = Gemini 2.5 Flash (요약/간단 응답) — 유지
- STANDARD = **Gemini 2.5 Pro** (리포트/분석/채팅 기본) — 현재 GPT-4o 에서 전환
- PREMIUM = GPT-4o (사용자가 "심층모드" 명시 토글 시만)

### ② Netlify Function 프록시
- `netlify/functions/ai-proxy.js` 신설.
- POST { provider, model, messages, systemPrompt, maxTokens, taskLevel } 받아 서버 측에서 OpenAI/Gemini 호출.
- 키는 Netlify 환경변수 `OPENAI_API_KEY`, `GEMINI_API_KEY` (VITE_ 접두사 제거).

### ③ Prompt Caching
- OpenAI: 시스템 프롬프트 + 컨텍스트를 프롬프트 앞쪽 배치 → 1024 토큰 이상 시 자동 캐싱(50% 할인).
- Gemini: explicit caching 은 paid tier 필요 — 무료 tier 사용 중이라 적용 제외.

### ④ 컨텍스트 슬리밍 + 응답 캐싱
- 포트폴리오 전체 JSON 대신 요약(이름·수량·평단·현재가·손익률·통화) 만 전송.
- max_tokens 설정 (채팅 1500, 리포트 3500).
- 동일 (provider+model+prompt hash) 조합 30분 localStorage 캐시.

## 범위

### 이번 작업 (Step 1)
- ai-proxy.js Netlify Function 신설.
- aiService.js 전면 리팩토링 — 모든 호출이 프록시 경유, 새 라우팅 적용.
- AIReport.jsx (또는 AIStrategyBadge) 에 "심층모드 (GPT-4o)" 토글 추가.
- .env.example 갱신 + Netlify 환경변수 안내.
- 응답 캐싱 유틸 추가.

### 비범위 (다음 Step 2/3)
- AI 채팅 페이지 신설 (Phase 1).
- 매매 시점 AI 코멘트 (Phase 2).
- 벤치마크 α 차트 (Phase 2).

## 성공 기준
1. `npm run build` 통과.
2. 빌드 결과(`dist/assets/*.js`) 에 `OPENAI_API_KEY`, `GEMINI_API_KEY` 문자열이 노출되지 않음.
3. 기본 호출이 Gemini 2.5 Pro 로 라우팅 (콘솔 로그 확인).
4. 사용자가 심층모드 토글 시 GPT-4o 호출 (콘솔 로그 확인).
5. 기존 AIReport 페이지의 4개 리포트 + 상담 탭 동작 회귀 없음.

## 위험 요소
- Gemini API 무료 tier 한도 (RPM 2, RPD 1000 추정). 한도 초과 시 GPT-4o fallback 자동 동작 필요.
- Netlify Function cold start (1~3초). 캐시로 완화.
- 기존 ai_report_history 형식 유지 (호환성).
