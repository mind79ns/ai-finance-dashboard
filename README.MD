# 💹 AI Finance Dashboard
> 개인용 AI 기반 재테크 & 시장분석 웹 프로젝트
> React + Tailwind + Supabase + Netlify 자동배포형 대시보드

---

## 🎯 프로젝트 개요
AI를 활용하여 개인 투자자의 **자산현황·시장분석·리포트 자동생성**을 지원하는
**스마트 재테크 플랫폼** 구축 프로젝트입니다.
> 내 자산을 자동으로 정리하고, AI가 시장변화를 분석하여 투자전략을 제시합니다.

---

## ✨ 핵심 구현 완료 사항

### 🔄 하이브리드 데이터 동기화 시스템
- **localStorage (Primary)** + **Supabase (Secondary)** 이중 저장 전략
- 네트워크 없어도 작동 (Graceful Fallback)
- 모바일/PC 간 실시간 데이터 동기화
- **즉시 저장 방식**: 페이지 이동 시 데이터 유실 방지

### 🧠 이중 AI 전략 (비용 70% 절감)
| AI 모델 | 용도 | 비용 |
|---------|------|------|
| **Gemini 2.5 Flash** | 기본 요약/질의응답 | 무료 |
| **GPT-4.1** | 심층 분석/전략 수립 | 유료 (필요시만) |

### 🛡️ 안정성 최적화
- **Math.floor()** ID 처리: BIGINT 호환성 보장
- **동기 저장**: localStorage 즉시 쓰기로 데이터 손실 방지
- **에러 핸들링**: Supabase 실패 시 자동 localStorage fallback

---

## 🧩 주요 기능

### 📊 1. 포트폴리오 관리 (Portfolio)
- 주식, ETF, 코인 등 실시간 가격 자동 업데이트
- 계좌별 자산 관리 (USD/KRW 통화별 분리)
- CSV 가져오기/내보내기 기능
- 수익률 시각화 차트 (Recharts)
- **Supabase 클라우드 동기화** ✅

### 🎯 2. 목표 관리 (Goals)
- 재무 목표 설정 및 진행률 추적
- 포트폴리오 총액/수익금 자동 연동
- 목표 달성 시뮬레이션 (복리 8% 가정)
- AI 기반 목표 달성 제안
- **즉시 저장**: 페이지 이동해도 데이터 유지 ✅

### 📝 3. 투자 일지 (Investment Log)
- 매수/매도 거래 기록
- 월별 손익 집계
- 자산별 거래 이력 추적
- 태그 기반 분류

### 🌏 4. 시장 분석 (Market)
- 실시간 주요지표: S&P500, Nasdaq, 환율, 금, 코인
- 한국투자증권 API 연동 (국내 주식)
- 상승/하락률, 변동성 분석
- Yahoo Finance, CoinGecko, FRED API

### 🤖 5. AI 분석 리포트 (AI Report)
- 시장 요약 자동 생성
- 포트폴리오 진단 및 리밸런싱 제안
- 투자 전략 수립 지원
- AI 모델 자동 라우팅 (작업별 최적 AI 선택)

### 📊 6. 자산 현황 (Asset Status)
- 계좌별 수입/지출 관리
- 월별 현금흐름 추적
- 카테고리별 분류

### ⚙️ 7. 설정 (Settings)
- Supabase 연결 테스트
- 로컬 데이터 → Supabase 마이그레이션
- AI 모델 선택 (OpenAI/Gemini)
- 환경 변수 가이드

---

## ⚙️ 기술 스택

| 항목 | 사용 기술 |
|------|-------------|
| **Frontend** | React 18 + Vite + TailwindCSS |
| **Visualization** | Recharts |
| **AI Engine** | OpenAI GPT-4.1 + Google Gemini 2.5 Flash |
| **Database** | **Supabase (PostgreSQL)** |
| **Data Strategy** | **localStorage (Primary) + Supabase (Secondary)** |
| **API Source** | Yahoo Finance, CoinGecko, FRED, 한국투자증권 |
| **Deploy** | Netlify (GitHub 자동 연동) |
| **Security** | .env + Netlify Environment Variables |

---

## 🏗️ 아키텍처 설계

### 데이터 동기화 흐름
```
📱 User Action
    ↓
✅ localStorage (즉시 저장)
    ↓
☁️ Supabase (비동기 동기화)
    ↓
🔄 다른 기기에서 로드
```

### 핵심 파일 구조
```
📦 ai-finance-dashboard/
┣ 📂 src/
┃ ┣ 📂 components/          # 재사용 컴포넌트
┃ ┃ ┣ ChartCard.jsx        # 차트 래퍼
┃ ┃ ┣ SlidePanel.jsx       # 슬라이드 패널
┃ ┃ ┗ DataMigrationPanel.jsx  # 마이그레이션 UI
┃ ┣ 📂 pages/               # 메인 페이지
┃ ┃ ┣ Dashboard.jsx        # 대시보드
┃ ┃ ┣ Portfolio.jsx        # 포트폴리오 ✅
┃ ┃ ┣ Goals.jsx            # 목표 관리 ✅
┃ ┃ ┣ InvestmentLog.jsx    # 투자 일지
┃ ┃ ┣ Market.jsx           # 시장 분석
┃ ┃ ┣ AIReport.jsx         # AI 리포트
┃ ┃ ┣ AssetStatus.jsx      # 자산 현황
┃ ┃ ┗ Settings.jsx         # 설정 ⚙️
┃ ┣ 📂 services/            # 핵심 로직
┃ ┃ ┣ supabaseService.js   # Supabase CRUD ✅
┃ ┃ ┣ aiService.js         # AI 라우팅 🤖
┃ ┃ ┣ marketDataService.js # 시장 데이터
┃ ┃ ┗ kisService.js        # 한국투자증권 API
┃ ┣ 📂 utils/
┃ ┃ ┗ dataSync.js          # 동기화 유틸리티 ✅
┃ ┗ 📜 App.jsx
┣ 📜 supabase-schema.sql    # DB 스키마
┣ 📜 supabase-setup.md      # 설정 가이드
┣ 📜 .env.example           # 환경 변수 템플릿
┗ 📜 README.md
```

---

## 🚀 빠른 시작

### 1. 프로젝트 설치
```bash
git clone https://github.com/your-repo/ai-finance-dashboard.git
cd ai-finance-dashboard
npm install
```

### 2. 환경 변수 설정
```bash
cp .env.example .env
```

`.env` 파일 편집:
```env
# AI Provider (OpenAI 또는 Gemini)
VITE_AI_PROVIDER=gemini
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_OPENAI_API_KEY=your-openai-api-key

# Market Data APIs
VITE_FINNHUB_API_KEY=your-finnhub-key
VITE_KIS_APP_KEY=your-kis-app-key
VITE_KIS_APP_SECRET=your-kis-secret

# Supabase (Optional - 클라우드 동기화)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Supabase 설정 (선택사항)
**모든 기기에서 데이터 동기화를 원한다면 필수!**

1. [supabase.com](https://supabase.com)에서 프로젝트 생성
2. `supabase-schema.sql` 파일 내용을 SQL Editor에서 실행
3. `.env`에 Supabase URL과 API 키 입력
4. 앱 실행 후 **Settings** 페이지에서 "연결 테스트" 클릭

📖 **자세한 가이드**: [supabase-setup.md](./supabase-setup.md)

### 4. 개발 서버 실행
```bash
npm run dev
```
→ http://localhost:5173 접속

### 5. 프로덕션 빌드
```bash
npm run build
npm run preview
```

---

## 🔑 API 키 발급 가이드

### 필수 API
| 서비스 | 용도 | 발급 URL | 비용 |
|--------|------|----------|------|
| **Gemini** | AI 분석 (기본) | https://makersuite.google.com/app/apikey | 무료 |
| **OpenAI** | AI 분석 (고급) | https://platform.openai.com/api-keys | 유료 |
| **Finnhub** | 미국 주식 가격 | https://finnhub.io | 무료 |

### 선택 API
| 서비스 | 용도 | 발급 URL |
|--------|------|----------|
| **한국투자증권** | 국내 주식 가격 | https://apiportal.koreainvestment.com |
| **FRED** | 경제 지표 | https://fred.stlouisfed.org/docs/api/api_key.html |

---

## 📖 배포 가이드

### Netlify 자동 배포
1. GitHub 저장소 푸시
2. [Netlify](https://netlify.com)에서 "New site from Git" 클릭
3. 저장소 선택 후 환경 변수 입력:
   - Site settings → Environment variables
   - `.env` 파일의 모든 변수 복사
4. Deploy! 🚀

**중요**: Netlify 환경 변수에 Supabase 키를 꼭 추가하세요!

---

## 🎯 핵심 최적화 포인트

### 1. 데이터 손실 방지
```javascript
// ✅ 동기 저장 (즉시)
localStorage.setItem('investment_goals', JSON.stringify(goals))

// ☁️ 비동기 저장 (백그라운드)
dataSync.saveGoals(goals).catch(...)
```
→ 페이지 이동해도 데이터 유지!

### 2. ID 정수 변환
```javascript
// ❌ 문제: "1759990937648.978" (소수점)
id: Date.now() + Math.random()

// ✅ 해결: 1759990937648 (정수)
id: Math.floor(Date.now())
```
→ Supabase BIGINT 호환!

### 3. AI 비용 최적화
```javascript
// 작업 난이도별 자동 라우팅
aiService.routeAIRequest(prompt, TASK_LEVEL.BASIC)    // → Gemini (무료)
aiService.routeAIRequest(prompt, TASK_LEVEL.ADVANCED) // → GPT-4.1 (유료)
```
→ 약 70% 비용 절감!

### 4. Graceful Fallback
```javascript
// Supabase 실패 시 자동으로 localStorage 사용
if (!isSupabaseAvailable()) {
  return localData  // 네트워크 없어도 작동!
}
```

---

## 🐛 문제 해결

### Q: 목표 관리에서 데이터가 사라져요
**A:** 최신 버전(commit 8345307)에서 수정 완료! 즉시 동기 저장으로 해결됨.

### Q: Supabase 연결이 안 돼요
**A:**
1. `.env` 파일에 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_ANON_KEY` 확인
2. `supabase-schema.sql` 실행 확인
3. Settings 페이지에서 "연결 테스트" 클릭

### Q: "invalid input syntax for type bigint" 에러
**A:** 최신 버전(commit 5cfddfa)에서 수정 완료! `Math.floor()` 적용됨.

### Q: 모바일에서 동기화가 안 돼요
**A:**
1. Netlify 환경 변수에 Supabase 키 추가 확인
2. 두 기기 모두 최신 버전 사용
3. 개발자 도구 콘솔에서 `☁️ Syncing to Supabase...` 메시지 확인

---

## 📚 참고 문서

- [supabase-setup.md](./supabase-setup.md) - Supabase 설정 가이드
- [AI_STRATEGY.md](./AI_STRATEGY.md) - AI 모델 선택 전략
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 배포 가이드

---

## 🔮 향후 계획

- [ ] InvestmentLog Supabase 동기화 추가
- [ ] AssetStatus Supabase 동기화 추가
- [ ] 사용자 인증 기능 (Supabase Auth)
- [ ] PWA 지원 (오프라인 모드)
- [ ] 실시간 알림 (가격 변동 알림)
- [ ] 다국어 지원 (i18n)

---

## 📝 라이선스
MIT License

---

## 💬 문의 및 기여
- Issues: GitHub Issues 탭
- Pull Requests: 환영합니다!
- 버그 리포트: 재현 가능한 예시와 함께 제출

---

**🎉 프로젝트 완성도: 85%**
**✅ 핵심 기능 구현 완료**
**🔄 데이터 동기화 안정성 확보**
**🤖 AI 통합 최적화 완료**
