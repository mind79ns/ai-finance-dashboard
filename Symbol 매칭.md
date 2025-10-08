# 📊 실시간 투자 대시보드 시스템 

## 🧭 개요
본 문서는 **CSV 포트폴리오 가져오기 종목 코드 을 기반으로  
**Finnhub API를 사용한 실시간 주가·ETF·환율 데이터 반영 시스템**의  
최적화 설계 구조를 요약한 것이다.

---

## ⚙️ 시스템 구조 개요

```
[CSV 자산현황 Import]
          ↓
    [Symbol Mapper]  ← (심볼 매핑 JSON)
          ↓
   [Finnhub API] → 미국주식·ETF·환율·코인 실시간 시세
          ↓
   [Yahoo Finance Fallback] → 한국주식 대체 시세
          ↓
   [실시간 포트폴리오 대시보드]
```

---

## 💳 데이터 구성 예시

### 📁 CSV 예시
```csv

- `Symbol` → 종목 고유 코드  증권사 별 불일치 해결필요  
 

---

## 🧩 Symbol 매핑 구조 예시

```json
{
  "005930": { "name": "삼성전자", "finnhub": "KRX:005930", "yahoo": "005930.KS" },
  "QQQ": { "name": "Invesco QQQ ETF", "finnhub": "QQQ", "yahoo": "QQQ" },
  "SPY": { "name": "SPDR S&P 500 ETF", "finnhub": "SPY", "yahoo": "SPY" },
  "BTC": { "name": "Bitcoin", "finnhub": "BINANCE:BTCUSDT", "yahoo": "BTC-USD" },
  "USDKRW": { "name": "USD/KRW", "finnhub": "OANDA:USD_KRW", "yahoo": "USDKRW=X" }
}
```

> ⚙️ 종목마다 증권사/거래소마다 Symbol이 다르므로  
> Finnhub·Yahoo 간 심볼을 통일하는 매핑 테이블이 필수.

---


➡️ ETF/주가를 원화 기준으로 자동 환산 가능.

---

## 📊 실시간 평가금액 계산 예시

```javascript
const usdToKrw = 1383.25; // 환율
const currentPrice = await getRealtimePrice("QQQ"); // 671.61 USD
const quantity = 10;

const totalValueKRW = (currentPrice * usdToKrw * quantity).toLocaleString('ko-KR');
console.log(`총 평가금액: ₩${totalValueKRW}`);
```

---

## 🔄 전체 동작 흐름

1. CSV 파일 가져오기 등록   
2. 종목 코드별 Symbol 변환 (Finnhub 기준)  
3. 실시간 시세 호출  
4. 실패 시 Yahoo Finance 보조 호출  
5. USD/KRW 환율 반영  
6. 총 평가금액 / 손익률 / 차트 출력  

---

## ✅ 시스템 장점 요약

| 항목 | 내용 |
|------|------|
| **단순 구조** | CSV만으로 전체 자산 현황 자동 반영 |
| **정확도** | Symbol 매핑 + Fallback 구조로 오류 최소화 |
| **실시간성** | Finnhub WebSocket 및 REST 병행 가능 |
| **범용성** | 주식·ETF·코인·환율 모두 단일 API로 처리 |
| **무료 사용** | Finnhub Free Tier로 개인 웹 충분히 운영 가능 |

---

## ⚠️ 유의사항

- Finnhub는 한국거래소(KRX) 일부 종목의 데이터가 제한될 수 있음  
  → Yahoo Finance를 보조 데이터로 병행 사용  
  
---

## 🏁 결론

> “CSV 파일로 자산현황을 불러오고,(자산추가 수기입력 가능)  
> Finnhub을 기본 실시간 시세 API로 사용하며,  
> 한국종목은 Yahoo Finance로 보조 처리하면  
> 안정적이고 확장 가능한 개인 투자 대시보드를 구축할 수 있다.”

---

