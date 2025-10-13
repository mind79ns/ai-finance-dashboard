# 💹 AI Finance Dashboard
> 개인용 AI 기반 재테크 & 시장분석 웹 프로젝트  
> React + Tailwind + Netlify 기반 / GitHub 자동배포형 대시보드

---

## 🎯 프로젝트 개요
AI를 활용하여 개인 투자자의 **자산현황·시장분석·리포트 자동생성**을 지원하는  
**스마트 재테크 플랫폼** 구축 프로젝트입니다.  
> 내 자산을 자동으로 정리하고, AI가 시장변화를 분석하여 투자전략을 제시합니다.

---

## 🧩 주요 기능

### 📊 1. 자산현황 관리 (My Portfolio)
- 주식, ETF, 코인 등 보유자산 총합 표시  
- 기간별 수익률 / 손익 그래프 시각화  
- 자산비중 및 변화 추이 관리  

### 🌏 2. 시장분석 (Market Insight)
- 실시간 주요지표: S&P500, Nasdaq, 환율, 금, 코인 시세  
- 상승/하락률, 변동성 분석  
- Yahoo Finance, CoinGecko, FRED API 연동  

### 🤖 3. AI 분석 리포트
- AI가 자동으로 시장 요약 및 포트폴리오 진단  
- 주간/월간 투자 리포트 자동 생성  
- ChatGPT API 기반 대화형 조언 기능  

### 🧾 4. 투자일지 (Investment Log)
- 매수/매도 기록 및 월간 총정리  
- AI가 투자패턴 분석 및 피드백 제공  

### 🎯 5. 목표관리 (Goal Tracker)
- 목표 수익률 설정 및 진행률 분석  
- 리밸런싱 제안 기능  

---

## 🧠 AI 기능 요약

| 기능 | 설명 |
|------|------|
| **AI 리포트 생성기** | 시장 데이터 기반 요약 자동 생성 |
| **AI 포트폴리오 진단기** | 내 자산 구조의 리스크 분석 |
| **AI 대화형 어드바이저** | 투자 전략 관련 질의응답 |
| **AI 예측 시뮬레이터** | 장기보유 시 수익률 예측 (5년 가정) |

---

## ⚙️ 기술 스택

| 항목 | 사용 기술 |
|------|-------------|
| **Frontend** | React + TailwindCSS |
| **Visualization** | Recharts / Chart.js |
| **AI Engine** | OpenAI API (GPT 기반) |
| **API Source** | Yahoo Finance, CoinGecko, FRED, 한국투자증권 API |
| **Deploy** | Netlify (GitHub 자동 연동) |
| **Data Storage** | **Supabase (PostgreSQL)** + LocalStorage Backup |
| **Security** | .env + Netlify Secret Variable |

---

## 📂 폴더 구조 예시
📦 ai-finance-dashboard/
┣ 📁 src/
┃ ┣ 📂 components/ # 그래프, 카드, 위젯
┃ ┣ 📂 pages/ # Dashboard / Insight / Portfolio 등
┃ ┣ 📂 hooks/ # API 데이터 / AI 호출 로직
┃ ┣ 📂 assets/ # 이미지 및 아이콘
┃ ┗ 📜 App.jsx
┣ 📜 .env
┣ 📜 netlify.toml
┣ 📜 package.json
┗ 📜 README.md

## 중요한 수정이나 개선부분에는 Ultra Thinking 적용 확실한 오류 처리 진행.
---

## 🚀 빠른 시작

### 1. 설치
```bash
npm install
```

### 2. Supabase 설정 (클라우드 데이터 저장)
**중요:** 모든 기기에서 데이터를 동기화하려면 Supabase 설정이 필요합니다.

1. **프로젝트 루트의 `supabase-setup.md` 파일을 참조하여 Supabase 프로젝트를 생성하세요**
2. `.env.example`을 `.env`로 복사하고 Supabase 인증 정보를 입력하세요:
   ```bash
   cp .env.example .env
   ```
3. `.env` 파일에 Supabase URL과 API 키 입력:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
4. 앱에서 **설정(Settings)** 페이지로 이동하여 "연결 테스트" 클릭
5. 로컬 데이터가 있으면 "로컬 데이터 업로드" 버튼으로 마이그레이션

**💡 Supabase 설정을 건너뛰면 로컬 브라우저에만 데이터가 저장됩니다.**

### 3. 개발 서버 실행
```bash
npm run dev
```

### 4. 프로덕션 빌드
```bash
npm run build
```

---

## 📖 배포 가이드

자세한 배포 방법은 [DEPLOYMENT.md](./DEPLOYMENT.md) 문서를 참조하세요.

### GitHub + Netlify 자동 배포
1. GitHub 저장소에 코드 푸시
2. Netlify에 저장소 연결
3. 환경 변수 설정
4. 자동 배포 완료!

---

## 🔑 API 키 설정

### OpenAI (권장: GPT-4.1)
- API 키: https://platform.openai.com/api-keys
- 모델: `gpt-4.1`
- 비용: 입력 $10/1M, 출력 $30/1M tokens

### Google Gemini (비용 절감)
- API 키: https://makersuite.google.com/app/apikey
- 모델: `gemini-2.5-flash`
- 비용: 무료 티어 제공 (비용 효율적)

**💡 팁:** 개발 중에는 Gemini Flash를 사용하여 비용 절감!

---

## 위 초기안 구축 완료 후 진행계획안
🔮 향후 확장 계획

📈 Google Finance / Sheet 연동 자동수익률 계산

💬 ChatGPT 리포트 자동 생성 (일/주/월 단위)

📊 포트폴리오 리밸런싱 히스토리 관리

📱 반응형 모바일 인터페이스

📤 CSV Import 기능 (거래내역 자동 등록)

## 🤖 이중 AI 전략 적용 완료

### AI 역할 분담
- **Gemini 2.5 Flash (무료)**: 기본 데이터 수집/요약용
  - 시장 데이터 간단 요약
  - 포트폴리오 빠른 체크
  - 일상 질의응답

- **GPT-5 (유료)**: 핵심 투자전략·분석엔진용
  - 상세 시장 리포트
  - 포트폴리오 심층 분석
  - 투자 전략 수립

### 비용 최적화
- 일반 작업: Gemini (무료)
- 중요 분석: GPT-4.1
- **총 절감: 약 70%** (GPT-4.1 단독 대비)

📖 **자세한 가이드**: [AI_STRATEGY.md](./AI_STRATEGY.md) 참조