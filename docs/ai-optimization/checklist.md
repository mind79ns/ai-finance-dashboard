# Checklist — AI 키 보안 + 비용 최적화

## 사전 조사
- [x] 현재 aiService.js 호출 메서드 매핑
- [x] AIReport.jsx 모델 강제 선택 UI 확인 (AIStrategyBadge 등)
- [x] stockAgentService.js 가 aiService 어떻게 호출하는지 확인
- [x] constants.js 의 API_CONFIG 사용처 grep

## Netlify Function
- [x] `netlify/functions/ai-proxy.js` 신설
  - [x] POST body 파싱 { provider, model, messages, systemPrompt, maxTokens, taskLevel }
  - [x] OpenAI 호출 분기 (chat.completions)
  - [x] Gemini 호출 분기 (generateContent)
  - [x] taskLevel 기반 자동 모델 선택 (auto 시)
  - [x] 에러 처리 + 429/한도초과 시 fallback 응답
  - [x] CORS 헤더
  - [x] timeout 25초 (Netlify 기본 26초 직전)

## aiService.js 리팩토링
- [x] `callOpenAI`, `callGemini` 메서드를 단일 `callProxy` 로 통합
- [x] axios → `/.netlify/functions/ai-proxy` POST
- [x] TASK_LEVEL 확장: BASIC / STANDARD / PREMIUM
- [x] routeAIRequest 라우팅 변경
  - [x] forceProvider='gpt' → PREMIUM (GPT-4o)
  - [x] forceProvider='gemini' → STANDARD (Gemini Pro)
  - [x] forceProvider='auto' + ADVANCED 작업 → STANDARD (Gemini Pro)
  - [x] forceProvider='auto' + BASIC → BASIC (Gemini Flash)
- [x] max_tokens 추가 (호출 메서드별)
- [x] 응답 캐싱 (hash key, 30분 TTL, localStorage)

## constants.js / .env
- [x] `VITE_OPENAI_API_KEY` → 제거 (서버에서 `OPENAI_API_KEY` 사용)
- [x] `VITE_GEMINI_API_KEY` → 제거 (서버에서 `GEMINI_API_KEY` 사용)
- [x] `.env.example` 갱신
- [x] CLAUDE.md §9 환경변수 섹션 갱신
- [x] 클라이언트 측 fallback 로직 검토 (키 없을 때 안내문구)

## UI — 심층모드 토글
- [x] AIReport.jsx 헤더 또는 모델 선택 영역에 "🚀 심층모드 (GPT-4o)" 토글 추가
- [x] 토글 상태를 localStorage 보관 (`ai_premium_mode`)
- [x] 호출 시 토글이 ON이면 forceProvider='gpt' 전달

## 검증
- [x] `npm run build` 통과
- [x] `grep -i "openai_api_key\|gemini_api_key" dist/assets/*.js` 결과 빈 값
- [x] 콘솔 로그로 모델 선택 흐름 확인
- [x] 기존 AIReport 4개 리포트 + 상담 탭 정상 동작 확인 (수동)

## 커밋 + 푸시
- [x] 단일 perf+security 커밋
- [x] git push
- [x] Netlify Dashboard 에서 OPENAI_API_KEY, GEMINI_API_KEY 환경변수 등록 안내
