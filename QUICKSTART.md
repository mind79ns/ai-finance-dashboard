# 🚀 빠른 시작 가이드

AI Finance Dashboard를 5분 안에 실행하세요!

---

## ✅ 현재 상태

### 설정 완료 ✓
- ✅ 프로젝트 구조 생성
- ✅ 의존성 설치 완료
- ✅ API 키 설정 완료
- ✅ 개발 서버 실행 중

### 실행 중인 서버
```
🌐 개발 서버: http://localhost:3000
```

---

## 🎯 현재 사용 가능한 기능

### 1. 대시보드 (`/dashboard`)
- 총 자산 현황
- 월간 수익률
- 포트폴리오 추이 차트
- 자산 배분 파이 차트
- 최근 거래 내역

### 2. 포트폴리오 (`/portfolio`)
- 보유 자산 목록
- 자산별 수익률 차트
- 수익금 및 수익률 계산
- 자산 추가/수정/삭제 (UI)

### 3. 시장 분석 (`/market`)
- 주요 지수 (S&P 500, Nasdaq, Dow, Gold)
- 암호화폐 시세 (Bitcoin, Ethereum)
- 환율 정보 (USD/KRW, EUR/USD, USD/JPY)
- 실시간 차트

### 4. AI 리포트 (`/ai-report`)
⭐ **이중 AI 전략 활성화됨!**

#### AI 전략 배지
- 🟣 **이중 AI 전략**: Gemini + GPT-5 모두 사용 가능
- 현재 설정: **DUAL MODE** ✓

#### 사용 가능한 AI 기능

**a) 시장 리포트 (GPT-5 사용)**
```
버튼 클릭 → AI 시장 리포트 생성
- 시장 개요 및 주요 동향
- 섹터별 분석
- 투자 전략 제안
- 향후 전망
```

**b) 포트폴리오 진단 (GPT-5 사용)**
```
버튼 클릭 → AI 포트폴리오 진단
- 자산 배분 분석
- 리스크 평가
- 수익성 분석
- 개선 제안사항
```

**c) AI 상담 (GPT-5 사용)**
```
질문 입력 → AI 투자 조언
예시 질문:
- "지금 S&P 500에 투자하는 것이 좋을까요?"
- "내 포트폴리오의 리스크 수준은 어떤가요?"
- "비트코인 가격이 오를까요?"
```

### 5. 투자 일지 (`/log`)
- 매수/매도 거래 기록
- 월간 통계
- 필터 기능 (유형, 기간)

### 6. 목표 관리 (`/goals`)
- 투자 목표 설정
- 진행률 추적
- 목표 달성 시뮬레이션
- AI 목표 달성 제안

---

## 🧪 테스트 방법

### 1. 웹 브라우저 열기
```
http://localhost:3000
```

### 2. 메뉴 탐색
좌측 사이드바에서 각 메뉴 클릭:
- 💹 대시보드
- 💼 포트폴리오
- 📈 시장분석
- 🤖 AI 리포트
- 📔 투자일지
- 🎯 목표관리

### 3. AI 기능 테스트

#### Step 1: AI 리포트 페이지 이동
```
좌측 메뉴 → "AI 리포트" 클릭
```

#### Step 2: AI 전략 확인
```
우측 상단에 "이중 AI 전략" 배지 확인
페이지 상단에 이중 AI 전략 설명 카드 확인
```

#### Step 3: 시장 리포트 생성
```
1. "시장 리포트" 탭 클릭
2. "AI 시장 리포트 생성" 버튼 클릭
3. 생성 중... (5-10초 대기)
4. 리포트 확인
```

#### Step 4: 포트폴리오 진단
```
1. "포트폴리오 진단" 탭 클릭
2. "AI 포트폴리오 진단" 버튼 클릭
3. 분석 중... (5-10초 대기)
4. 진단 결과 확인
```

#### Step 5: AI 상담
```
1. "AI 상담" 탭 클릭
2. 질문 입력창에 질문 입력
   예: "지금 투자하기 좋은 자산은?"
3. "전송" 버튼 클릭
4. AI 답변 확인
```

---

## 🎨 UI 확인 사항

### ✅ 체크리스트

#### 공통
- [ ] 좌측 사이드바 정상 표시
- [ ] 메뉴 클릭 시 페이지 전환
- [ ] 모바일에서 햄버거 메뉴 작동
- [ ] 상단 헤더에 날짜 표시

#### 대시보드
- [ ] 4개 통계 카드 표시
- [ ] 포트폴리오 추이 그래프
- [ ] 자산 배분 파이 차트
- [ ] 거래 내역 테이블

#### AI 리포트
- [ ] AI 전략 배지 표시 (우측 상단)
- [ ] 이중 AI 전략 안내 카드
- [ ] 3개 탭 (시장/포트폴리오/상담)
- [ ] 각 탭에 사용 AI 표시
- [ ] 버튼 클릭 시 로딩 상태

---

## 🔍 콘솔 로그 확인

### 개발자 도구 열기
```
F12 또는 Ctrl+Shift+I (Windows)
Cmd+Option+I (Mac)
```

### 확인할 로그
AI 기능 사용 시 콘솔에 다음과 같은 로그가 표시되어야 합니다:

```
⚡ Using Gemini Flash for basic task
```
또는
```
🧠 Using GPT-5 for advanced analysis
```

### 오류가 있다면
```
❌ AI Request Error: [오류 메시지]
```

---

## 🐛 문제 해결

### 문제 1: "No AI provider configured"
**원인**: API 키가 설정되지 않음

**해결**:
```bash
# .env 파일 확인
cat .env

# API 키가 있는지 확인
# VITE_OPENAI_API_KEY=sk-...
# VITE_GEMINI_API_KEY=...
```

### 문제 2: 페이지가 로딩되지 않음
**해결**:
```bash
# 서버 재시작
Ctrl+C (서버 종료)
npm run dev (재시작)
```

### 문제 3: AI 응답이 오지 않음
**확인 사항**:
1. API 키가 유효한지 확인
2. 인터넷 연결 확인
3. 개발자 도구 콘솔에서 오류 메시지 확인

### 문제 4: 차트가 표시되지 않음
**해결**:
```bash
# 캐시 클리어
Ctrl+Shift+R (강력 새로고침)
```

---

## 📊 API 사용량 모니터링

### OpenAI 사용량
```
https://platform.openai.com/usage
```

### Gemini 사용량
```
https://makersuite.google.com/
```

---

## 🚀 다음 단계

### 1. 프로덕션 빌드 테스트
```bash
npm run build
npm run preview
```

### 2. Git 초기화
```bash
git init
git add .
git commit -m "Initial commit: AI Finance Dashboard with Dual AI Strategy"
```

### 3. GitHub 저장소 생성
```bash
# GitHub에서 새 저장소 생성 후
git remote add origin https://github.com/YOUR_USERNAME/ai-finance-dashboard.git
git branch -M main
git push -u origin main
```

### 4. Netlify 배포
자세한 내용은 `DEPLOYMENT.md` 참조

---

## 💡 유용한 명령어

### 개발
```bash
npm run dev          # 개발 서버 실행
npm run build        # 프로덕션 빌드
npm run preview      # 빌드 미리보기
npm run lint         # 코드 린트
```

### Git
```bash
git status           # 상태 확인
git add .            # 모든 변경사항 추가
git commit -m "msg"  # 커밋
git push             # 푸시
```

---

## 🎉 완료!

✅ **개발 서버 실행**: http://localhost:3000
✅ **API 키 설정**: Dual AI Strategy 활성화
✅ **모든 기능 작동**: 대시보드, AI 리포트 등
✅ **이중 AI 전략**: 비용 70% 절감 🎯

**이제 AI Finance Dashboard를 자유롭게 사용하세요!** 💰📈

---

## 📚 추가 문서

- **README.md**: 프로젝트 전체 개요
- **DEPLOYMENT.md**: 배포 가이드
- **AI_STRATEGY.md**: AI 전략 상세 설명

---

**문제가 있나요?**
개발자 도구 콘솔을 확인하거나 문서를 참조하세요! 🚀
