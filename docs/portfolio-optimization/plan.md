# Plan — 포트폴리오 탭 30초 지연 개선

## 목표
포트폴리오 탭 진입 시 빈 화면 로딩 30초 → **즉시 화면 렌더링 + 백그라운드 3초 이내 갱신**.

## 범위 (1차 + 2차)

### 1차 — Optimistic UI (사용자 체감 즉시 개선)
- Portfolio 진입 직후 캐시값으로 화면을 먼저 그린다.
- 시세 갱신은 백그라운드에서 진행하고 작은 인디케이터로만 표시.
- `setLoading(false)` 타이밍을 `loadData()` 직후로 앞당김.

### 2차 — KIS Batch Endpoint (핵심 병목 제거)
- `netlify/functions/kis-batch.js` 신규 — 여러 종목을 한 번의 함수 호출로 처리.
  - 함수 내부에서 KIS 토큰 1회 발급 + 종목별 호출을 병렬화.
- `src/services/kisService.js` 의 `getMultiplePrices()` 를 batch 엔드포인트로 교체.
  - 기존 단일 종목 호출(`getStockPrice`)은 호환성을 위해 유지.
- KIS rate limit 20 calls/sec — 동시성 5건으로 안전하게 제한.

## 비범위 (이번에 안 함)
- 환율 호출 분리 (3차)
- Supabase 토큰 공유 (4차)
- pg_cron 스케줄러 연동 (4차)
- STALE_THRESHOLD 튜닝 (3차)

## 성공 기준
1. `npm run build` 통과.
2. 포트폴리오 탭 진입 시 캐시값이 1초 이내에 화면에 나타남.
3. 한국 종목 N개 갱신이 단일 Netlify 함수 호출로 완료.
4. KIS 호출 실패 시에도 화면이 빈 상태로 멈추지 않음 (Optimistic 값 유지).

## 검증 절차
- 코드 빌드 통과.
- 기존 Portfolio 기능 (매수/매도, 필터, 정렬, CSV 입출력) 회귀 없음 확인 (정적 분석 + 빌드).
- 사용자가 브라우저에서 실측 (배포 후).
