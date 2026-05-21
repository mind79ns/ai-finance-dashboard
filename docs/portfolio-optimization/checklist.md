# Checklist — 포트폴리오 최적화 1차 + 2차

## 1차 — Optimistic UI

- [x] `Portfolio.jsx` `loadData()` 직후 `setLoading(false)` 호출 (캐시값으로 화면 먼저 그리기)
- [x] 백그라운드 갱신 useEffect에 `isRefreshing` 상태 추가
- [x] 헤더 우측 영역에 작은 갱신 인디케이터 노출 (회전 아이콘 + "갱신 중")
- [x] 갱신 실패해도 화면이 정상 유지되는지 확인 (try/catch 검토)

## 2차 — KIS Batch Endpoint

- [x] `netlify/functions/kis-batch.js` 신규 작성
  - [x] 토큰 발급 함수 재사용 가능하게 분리
  - [x] `codes` 쿼리 파라미터 파싱 (콤마 구분)
  - [x] 동시성 5건으로 제한된 병렬 호출
  - [x] 종목별 성공/실패를 개별 객체로 반환
- [x] `src/services/kisService.js` `getMultiplePrices()` 교체
  - [x] 단일 호출 + 응답 매핑
  - [x] 캐시 일관성 유지 (`setCache` 동일하게 호출)
  - [x] 실패 종목은 null로 채워서 호환 유지
- [x] 기존 `getStockPrice()` 단일 호출 호환 유지

## 빌드/검증

- [x] `npm run build` 통과
- [x] Portfolio.jsx 호출 지점 정상 동작 확인 (priceUpdater.js 변경 불필요 확인)
- [x] kisService.js 사용처 grep 점검 (priceUpdater, Portfolio 외 영향)

## 커밋

- [x] 1차 단독 커밋 (`perf: 포트폴리오 진입 시 Optimistic UI 적용`)
- [x] 2차 단독 커밋 (`perf: KIS 시세 batch 엔드포인트로 다중 종목 단일 호출`)
- [x] git push (사용자 확인 후)
