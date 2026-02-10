# 💹 AI Finance Dashboard (AI 파이낸스 대시보드)

> **"당신의 자산을 미래와 연결하다"**
>
> 개인 맞춤형 AI 기반 자산 관리 및 투자 분석 플랫폼

![Project Badge](https://img.shields.io/badge/Status-Beta-cyan?style=flat-square)
![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Supabase%20%7C%20AI-blueviolet?style=flat-square)

---

## 🎯 프로젝트 소개 (Project Overview)

**AI Finance Dashboard**는 개인 투자자를 위해 설계된 **지능형 자산 관리 플랫폼**입니다.
복잡한 투자 데이터를 직관적인 **Cyberpunk Dark Theme** UI로 시각화하고, **AI(인공지능)**를 활용해 시장 분석과 포트폴리오 진단을 자동으로 수행합니다.

### ✨ 핵심 가치

1. **직관성**: 복잡한 금융 데이터를 한눈에 파악 가능한 시각화 대시보드.
2. **지능화**: AI가 뉴스, 시황, 자산 구성을 분석하여 개인화된 리포트 제공.
3. **연결성**: 언제 어디서나 자산 현황을 동기화 (PC/Mobile).
4. **심미성**: 몰입감을 높이는 하이엔드 다크 모드 디자인.

---

## 🧩 주요 기능 (Key Features)

### 1. 📊 통합 포트폴리오 관리 (Portfolio)

- **실시간 자산 추적**: 주식, 코인, 현금 등 모든 자산을 한곳에서 관리.
- **자동 수익률 계산**: 매수 평단가 대비 현재 손익(Profit/Loss) 실시간 산출.
- **시각화 차트**: 자산 비중(Pie Chart) 및 자산 성장 추이(Area Chart) 제공.
- **페이지네이션**: 다량의 자산 데이터도 깔끔하게 페이징 처리.

### 2. 📝 스마트 투자 일지 (Investment Log) 🔥 **[New]**

- **거래 기록**: 매수/매도 이력을 캘린더 및 리스트 뷰로 직관적 관리.
- **월별 통계**: 월간 총 매수/매도금액 및 거래 빈도 자동 집계.
- **자산 명칭 자동 연동**: 심볼 입력 시 해당 자산의 정식 명칭 자동 표시.

### 3. � 실시간 거래 내역 (Transaction History) 🔥 **[New]**

- **입출금 관리**: 계좌별 입금/출금 내역 추적.
- **배당금 관리**: 월별 배당금 입금 내역 및 연간 배당 수익률 시각화.
- **통화 변환**: 실시간 환율 기반 자산 가치 평가 (KRW/USD).

### 4. 🌏 시장 데이터 센터 (Market)

- **글로벌 지표**: S&P500, Nasdaq, KOSPI, 비트코인 등 주요 지수 실시간 모니터링.
- **투자 뉴스**: AI가 선별한 관련 주요 뉴스 피드 제공.

### 5. 🤖 AI 분석 리포트 (AI Report)

- **포트폴리오 진단**: 자산 배분 적절성 및 리스크 분석.
- **시장 전망**: 거시 경제 지표 기반 투자 전략 제안.

---

## 🛠 기술 스택 (Tech Stack)

### Frontend

- **Framework**: React 18, Vite
- **Language**: JavaScript (ES6+)
- **Styling**: Tailwind CSS (Custom Configuration for Cyberpunk Theme)
- **Charts**: Recharts (Customized for Dark Mode)
- **State Management**: React Hooks (useContext, useReducer)
- **Icons**: Lucide React

### Backend/Data

- **Database**: Supabase (PostgreSQL)
- **Deployment**: Netlify (CI/CD Automated)
- **API**: Yahoo Finance API (Market Data)
- **Storage**: LocalStorage (Offline Support) + Supabase (Cloud Sync)

---

## 🏗️ 설치 및 실행 (Installation)

### 1. 프로젝트 클론

```bash
git clone https://github.com/your-repo/ai-finance-dashboard.git
cd ai-finance-dashboard
```

### 2. 패키지 설치

```bash
npm install
```

### 3. 환경 변수 설정 (.env)

루트 디렉토리에 `.env` 파일을 생성하고 아래 내용을 입력하세요.

```env
# AI Services
VITE_OPENAI_API_KEY=your_openai_key
VITE_GEMINI_API_KEY=your_gemini_key

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key

# Market Data APIs
VITE_FINNHUB_API_KEY=your_finnhub_key
```

### 4. 개발 서버 실행

```bash
npm run dev
```

---

## � 변경 이력 (History)

자세한 개발 히스토리 및 개선 사항은 [**PROCESS.md**](./PROCESS.md) 파일을 참고하세요.

---

## 📄 라이선스 (License)

MIT License

Copyright (c) 2026 AI Finance Dashboard Team
