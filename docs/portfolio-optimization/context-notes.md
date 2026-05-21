# Context Notes — 포트폴리오 최적화 작업 기록

> 작업 도중 내린 결정과 그 이유를 추가 기록. 다음 세션이 맥락 없이도 이어갈 수 있도록.

---

## 2026-05-21 — 작업 시작

### 진단 요약
30초 지연의 4대 원인.
1. `priceUpdater.fetchAndUpdateAssetPrices()` 가 환율 1건 위해 `getAllMarketData()` 전체(7개 API) 호출.
2. `kisService.getMultiplePrices()` 가 종목별로 Netlify Function을 순차 호출 → cold start × N.
3. Netlify Function의 KIS 토큰 캐시가 Lambda 메모리 한정 → 동시 호출 시 토큰 재발급 중복.
4. `setLoading(false)` 가 시세 갱신 끝난 뒤에 실행 → 30초 빈 화면.

### 이번 작업 범위 결정
- 1차(Optimistic UI) + 2차(kis-batch) 만. 사용자 동의 받음.
- 3차(환율 분리, STALE_THRESHOLD) + 4차(토큰 공유, pg_cron)는 후속.
- 이유: 1+2 조합으로 30초 → 3초 + 사용자 체감 즉시 화면 효과가 가장 큼.

### 설계 결정

**kis-batch 응답 포맷**
```json
{
  "results": {
    "005930": { "price": 75000, "change": 100, "changePercent": 0.13, ... },
    "068270": null  // 실패 시 null
  },
  "fetchedAt": "2026-05-21T...",
  "tokenReused": true
}
```
- 실패 종목은 null로 응답해서 부분 실패 허용.
- 기존 단일 호출 응답 포맷과 동일한 객체를 사용해 클라이언트 매핑 코드 최소화.

**동시성 5건 제한 사유**
- KIS rate limit 20 calls/sec.
- 안전 마진 4배. 종목 10개 → 2개 chunk × 5건 동시 ≈ 1초.

**기존 `getStockPrice()` 유지 사유**
- `priceUpdater` 외에 다른 호출 지점이 없을 가능성이 높지만, 단일 호출 호환을 유지해 회귀 위험 최소화.
- 호출 지점 grep으로 확인 예정.

### 적용 후 메모 (2026-05-21)

**1차 적용 결과**
- `Portfolio.jsx` 진입 직후 `setLoading(false)` 호출하여 캐시값으로 즉시 화면 렌더.
- 백그라운드 갱신 useEffect는 `setIsRefreshing(true/false)` 로만 상태 표시 — 전체 화면 로딩 제거.
- 헤더 우측에 `(loading || isRefreshing)` 조건으로 `RefreshCw` + 텍스트 노출. `isRefreshing && !loading` 이면 "시세 갱신 중", 그 외 "로딩 중".

**2차 적용 결과**
- `netlify/functions/kis-batch.js` 신규.
  - 토큰 1회 발급(Lambda 메모리 캐시 23h) 재사용. 응답에 `tokenReused` 플래그.
  - `runWithConcurrency(items, 5, worker)` 로 동시성 제한 병렬. KIS rate limit 20/sec 대비 안전 마진 4배.
  - 종목별 실패는 `results[symbol] = null` + `failures[]` 에 message 누적, 전체 200 응답으로 부분 실패 허용.
  - 한 호출당 최대 50종목 가드. 단일 호출 timeout 5초.
- `kisService.getMultiplePrices()` 단일 axios 호출로 교체.
  - 캐시 우선 조회 후 `missing` 만 batch 요청.
  - 응답 매핑 시 padded/raw 심볼 양쪽 키 모두 시도.
  - 배치 실패 시 종목별 폴백(`getStockPrice`) 자동 동작.
- `getStockPrice()` 단일 호출 경로는 그대로 유지 — `priceUpdater.js` 외 호출 지점이 없는 것을 grep으로 확인했지만, 안전 폴백용으로 보존.

**검증**
- `npm run build` 통과 (3426 modules, 6.23s, 에러 없음).
- 실측은 Netlify 배포 후 사용자 확인 필요.

### 미해결 / 차후 확인
- KIS 토큰 cross-Lambda 공유 미구현 — 동시 cold-start 시 토큰 중복 발급 가능. 4차에서 처리.
- `isMarketOpen()` 활용한 캐시 TTL 동적 조정 미구현. 3차에서 처리.
- 환율 localStorage 캐시 미구현. 3차에서 처리.
