# 🔑 실시간 시장 데이터 API 설정 가이드

## ⚠️ 중요: 이 설정은 필수입니다!

이 프로젝트는 **실제 실시간 시장 데이터**를 사용합니다. API 키 없이는 데이터가 로드되지 않습니다.

---

## 📊 사용하는 API 서비스

| API | 목적 | 비용 | 필수 여부 |
|-----|------|------|----------|
| **Finnhub** | 미국 주식 지수 (S&P 500, Nasdaq, Dow), 금 가격 | 무료 (60 calls/min) | ✅ **필수** |
| **CoinGecko** | 암호화폐 실시간 가격 (BTC, ETH, BNB, SOL) | 완전 무료 | ⚪ 자동 작동 (키 불필요) |
| **ExchangeRate-API** | 실시간 환율 (USD/KRW, EUR, JPY, GBP) | 완전 무료 | ⚪ 자동 작동 (키 불필요) |

---

## 🚀 빠른 시작 (5분 설정)

### 1️⃣ Finnhub API 키 발급 (필수)

**무료 플랜:** 60 calls/분, WebSocket 지원, 실시간 데이터

#### 단계:
1. **회원가입**: https://finnhub.io/register
   - 이메일 주소 입력
   - 비밀번호 설정
   - 이메일 인증

2. **API 키 확인**:
   - 로그인 후 대시보드에서 API Key 복사
   - 예시: `ct8abc123def456ghi789jkl0`

3. **환경 변수 설정**:
   ```bash
   # .env 파일 생성 (프로젝트 루트 디렉토리)
   VITE_FINNHUB_API_KEY=여기에_발급받은_키_붙여넣기
   ```

4. **Netlify 환경 변수 설정**:
   - Netlify 대시보드 → Site settings → Environment variables
   - `VITE_FINNHUB_API_KEY` 추가
   - Value에 API 키 입력
   - Save

---

### 2️⃣ AI API 키 설정 (선택 사항)

AI 리포트 기능을 사용하려면 아래 중 하나를 설정하세요:

#### Option A: Google Gemini (무료 추천)
```bash
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_GEMINI_MODEL=gemini-2.5-flash
VITE_AI_PROVIDER=gemini
```
- 발급: https://makersuite.google.com/app/apikey
- 무료 티어 제공

#### Option B: OpenAI GPT-4.1 (프리미엄)
```bash
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_OPENAI_MODEL=gpt-4.1
VITE_AI_PROVIDER=openai
```
- 발급: https://platform.openai.com/api-keys
- 유료 (고급 분석)

#### Option C: 듀얼 AI 전략 (최적)
```bash
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_AI_PROVIDER=dual
```
- 기본 작업: Gemini (무료/빠름)
- 고급 분석: GPT-4.1 (정확/심층)
- **비용 70% 절감**

---

## 📁 .env 파일 전체 예시

```bash
# ========================================
# 실시간 시장 데이터 API (필수)
# ========================================
VITE_FINNHUB_API_KEY=ct8abc123def456ghi789jkl0

# ========================================
# AI API (선택)
# ========================================
VITE_GEMINI_API_KEY=AIzaSy...
VITE_GEMINI_MODEL=gemini-2.5-flash

VITE_OPENAI_API_KEY=sk-proj-...
VITE_OPENAI_MODEL=gpt-4.1

VITE_AI_PROVIDER=dual
```

---

## ✅ 설정 확인 방법

### 로컬 개발 환경:
```bash
npm run dev
```

### 확인 사항:
1. 브라우저 콘솔 열기 (F12)
2. "시장 분석" 페이지 접속
3. 콘솔에서 확인:
   - ✅ `Finnhub: Real-time stock indices fetched` → 성공
   - ✅ `CoinGecko: Real-time crypto prices fetched` → 성공
   - ✅ `ExchangeRate: Real-time exchange rates fetched` → 성공
   - ❌ `API key not configured` → Finnhub 키 누락

---

## 🔧 문제 해결

### ❌ 주요 지수가 0으로 표시됨
**원인:** Finnhub API 키가 설정되지 않음

**해결:**
1. `.env` 파일에 `VITE_FINNHUB_API_KEY` 확인
2. Netlify 환경 변수 확인
3. 서버 재시작 (`npm run dev` 다시 실행)

### ❌ "데이터 로드 실패" 메시지
**원인:** API 호출 제한 초과 또는 네트워크 오류

**해결:**
1. Finnhub 무료 플랜: 60 calls/분 제한
2. 1분 후 "새로고침" 버튼 클릭
3. 브라우저 콘솔에서 에러 메시지 확인

### ❌ 암호화폐 가격이 0으로 표시됨
**원인:** CoinGecko API 일시적 장애

**해결:**
1. CoinGecko는 키 불필요 (자동 작동)
2. 잠시 후 자동 재시도
3. https://www.coingecko.com 접속 확인

---

## 📊 API 사용량 모니터링

### Finnhub (무료 플랜)
- **제한:** 60 calls/분
- **현재 사용:**
  - 주식 지수 (3 calls): S&P 500, Nasdaq, Dow
  - 금 가격 (1 call)
  - **총 4 calls/2분** (자동 새로고침 주기)
- **대시보드:** https://finnhub.io/dashboard

### CoinGecko
- **무료 무제한**
- 암호화폐 가격 (1 call/2분)

### ExchangeRate-API
- **무료 무제한**
- 환율 데이터 (1 call/2분)

---

## 🎯 권장 설정

### 개인 프로젝트:
```bash
VITE_FINNHUB_API_KEY=무료_키
VITE_GEMINI_API_KEY=무료_키
VITE_AI_PROVIDER=gemini
```

### 프로덕션 환경:
```bash
VITE_FINNHUB_API_KEY=유료_플랜_고려
VITE_GEMINI_API_KEY=무료_키
VITE_OPENAI_API_KEY=유료_키
VITE_AI_PROVIDER=dual
```

---

## 🔗 유용한 링크

- **Finnhub 문서**: https://finnhub.io/docs/api
- **CoinGecko API**: https://www.coingecko.com/api/documentation
- **ExchangeRate-API**: https://www.exchangerate-api.com/docs
- **Gemini API**: https://ai.google.dev/docs
- **OpenAI API**: https://platform.openai.com/docs

---

## 💡 추가 도움말

질문이나 문제가 있으시면:
1. GitHub Issues: [프로젝트 이슈 페이지]
2. 브라우저 콘솔 로그 확인 (F12)
3. API 대시보드에서 사용량 확인

**중요:** API 키는 절대 GitHub에 커밋하지 마세요! `.env` 파일은 `.gitignore`에 포함되어 있습니다.
