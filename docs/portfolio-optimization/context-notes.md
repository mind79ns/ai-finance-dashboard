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

### 2026-05-21 — 사용자 보고 (Portfolio 변화 없음 + Dashboard 매우 느림) 후 추가 작업 (A~D)

**진단**
- 사용자가 푸시 직후 테스트했을 가능성 — Netlify 배포 미완료 시 kis-batch 호출 시 axios timeout(15s) → 단일 호출 순차 폴백(50ms × N) 으로 오히려 더 느려질 수 있음.
- 더 큰 진짜 병목 발견.
  1. `priceUpdater.js` 가 환율 1건 필요해도 `getAllMarketData()` 전체 호출.
  2. `getAllMarketData()` 내부 `fetchInterestRates()` 가 **`allorigins.win` 퍼블릭 프록시 경유** — 자주 지연/차단.
  3. `getAllMarketData()` 가 `Promise.all` 이라 한 API 지연 시 전체 블록.
  4. Dashboard.jsx 도 `getAllMarketData()` 직접 호출 — 첫 로드 전체 화면 30초 로딩.

**A 적용 — priceUpdater 슬림화**
- `getAllMarketData()` 호출 제거. 환율 stale 시 `getExchangeRates()` 단독, 코인 누락 시 `getCryptoPrices()` 단독 호출. 둘 다 필요 시 `Promise.all`.

**B 적용 — getAllMarketData 회복탄력성 강화**
- `Promise.all` → `Promise.allSettled`. 한 API 실패해도 다른 데이터는 fallback 으로 채움.
- 개별 axios 호출에 timeout 부여.
  - ExchangeRate-API 5s
  - CoinGecko 5s
  - Finnhub stock indices / gold / single quote 5s
  - FRED via allorigins 4s (가장 의심)
- 결과: 가장 느린 1개에 의해 결정되므로 최악 5초.

**C 적용 — Dashboard Optimistic UI**
- `setIsRefreshing(true)` 만 사용, `setLoading(true)` 제거.
- `dataSync.*` 완료 직후 `setLoading(false)` → 풀스크린 로딩 분기 해제.
- `getAllMarketData()` 는 그대로 호출하지만 setLoading 과 분리 → 화면은 캐시 데이터로 먼저 표시.
- `finally` 에서 `setIsRefreshing(false)` + 안전망 `setLoading(false)`.

**D 적용 — kisService 폴백 단축**
- batch axios timeout 15s → 8s.
- 폴백 단일 호출을 동시성 5건 병렬로 변경 (이전 순차 50ms × N).
- 10종목 폴백 시: 이전 10s+ → 약 2~3s.

**빌드 통과**
- `npm run build` 3426 modules, 6.68s. 에러 없음.

### 미해결 / 차후 확인
- KIS 토큰 cross-Lambda 공유 미구현 — 동시 cold-start 시 토큰 중복 발급 가능. 4차에서 처리.
- `isMarketOpen()` 활용한 캐시 TTL 동적 조정 미구현. 3차에서 처리.
- 환율 localStorage 캐시 미구현. 3차에서 처리.
