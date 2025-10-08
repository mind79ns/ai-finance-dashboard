# 📈 Finance AI Dashboard – 기능 고도화 계획 (Next Phase Plan)

## ⚙️ 1️⃣ 데이터/API 구조 고도화
**기존 Yahoo / FRED → Finnhub + CoinGecko + KIS로 교체 및 확장**
| 개선 항목 | 구체 내용 | 기대효과 |
|------------|------------|------------|
| 🔁 API 교체 | Yahoo Finance → **Finnhub** (주식/지수 실시간) | 실시간성 강화 / 정확도 향상 |
| 🪙 코인 데이터 강화 | CoinGecko 유지, 실시간 WS 연결 추가 | 코인 변동 실시간 반영 |
| 🇰🇷 한국시장 통합 | KIS Developers API 추가 (KOSPI, KOSDAQ 종목 지원) | 글로벌+국내 통합 관리 |
| 📈 WebSocket 기반 실시간 반영 | 주가 데이터 5초마다 갱신 → WS로 전환 | 프로 수준 반응형 차트 |
| 🧩 API 프록시 서버 구축 (Node.js) | API Key 보호 및 캐싱 | 속도 + 보안 향상 |

---

## 🎨 2️⃣ UI/UX 전문가 수준 개선
**사용자가 투자 앱처럼 직관적으로 느끼게**
| 항목 | 개선 포인트 | 도구 |
|------|--------------|------|
| 📊 실시간 대시보드 위젯화 | 종목별 카드형 위젯 (가격/등락률) | Tailwind + Framer Motion |
| 🌙 다크모드 지원 | 투자자는 밤에도 모니터링하니까 | Tailwind Theme Switch |
| 📱 모바일 완전 대응형 | 반응형 Breakpoint / 그리드 재구성 | CSS Grid + Tailwind |
| 🔍 검색/필터 기능 | 종목 검색, 기간별 필터링 | Zustand or Redux Store |
| 📅 캘린더형 투자일지 | 투자 기록을 시각적으로 표시 | react-calendar or day.js |

---

## 🧠 3️⃣ AI 엔진 고도화
| 기능 | 개선 아이디어 | 적용모델 |
|------|----------------|-----------|
| 📘 AI 리포트 자동 요약 | 매주 자동 이메일 요약 발송 | GPT-4.1 or Gemini 2.5 Flash |
| 💬 대화형 조언 기능 강화 | “내 포트폴리오 기준 추천” 추가 | GPT Function Calling |
| 📊 리스크 진단 자동화 | 포트폴리오의 변동성, 상관계수 분석 | GPT + Python 연동 |
| 📈 AI 투자 시뮬레이터 | “5년 후 예측 수익률” + Monte Carlo 시뮬레이션 | GPT-4.1 or Code Interpreter |
| 🧮 자산분포 자동 리밸런싱 제안 | 일정 기간마다 최적 비중 제안 | GPT-4.1-mini |

---

## 💾 4️⃣ 데이터 저장 & 분석 구조 개선
| 개선 포인트 | 방법 | 효과 |
|--------------|------|------|
| 🔐 Google Sheet API 연동 | 거래내역 자동 반영 | 노코드 입력 / 데이터 백업 |
| 🧩 SQLite or Supabase 도입 | 포트폴리오·로그 저장 | 사용자별 데이터 분리 |
| 📤 CSV Import 기능 | 증권사 거래내역 자동 업로드 | 수기 입력 제거 |
| 📉 백테스트용 DB 누적 구조 | 기간별 성과분석 자동화 | 장기 리포트 생성 가능 |

---

## 🤖 5️⃣ AI 전략 강화
| 역할 | 모델 | 주요 기능 | 개선 방향 |
|------|--------|-----------|-------------|
| Gemini 2.5 Flash | 무료 AI | 뉴스 요약 / 빠른 응답 | 실시간 Market Feed 요약 자동화 |
| GPT-4.1 | 유료 AI | 분석 리포트 / 전략 | “AI Strategy Board” 탭 신설 |

---

## 🔐 6️⃣ 보안 및 구조적 안정화
| 항목 | 개선 내용 |
|------|------------|
| 🧱 .env 보안 | Netlify Secret 관리, API Key 프록시 서버화 |
| 🔄 API 캐싱 | Redis / Local Cache |
| 🧩 예외처리 고도화 | API 오류 시 fallback 데이터 표시 |
| 🧠 ErrorBoundary 컴포넌트 | React 레벨에서 오류 감시 |

---

## 🚀 단계별 실행 우선순위
1️⃣ 데이터/API 고도화  
2️⃣ 백엔드 프록시 및 키보안 적용  
3️⃣ UI 위젯화 및 반응형 UX 강화  
4️⃣ AI 리포트 자동화 기능 업그레이드  
5️⃣ 저장 구조 (Google Sheet / DB / CSV Import)  
6️⃣ AI 전략보드 및 심층 분석 기능 추가  

---
 
**목적:** 개인 투자 분석/AI 웹의 전문가 수준 기능 확장 로드맵
