# 🚀 배포 가이드

AI Finance Dashboard를 GitHub + Netlify로 자동 배포하는 방법입니다.

---

## 📋 사전 준비사항

### 1. 필수 계정
- [GitHub](https://github.com) 계정
- [Netlify](https://netlify.com) 계정
- [OpenAI](https://platform.openai.com) API 키 또는 [Google Gemini](https://makersuite.google.com/app/apikey) API 키

### 2. 설치 필요 도구
- Node.js 18 이상
- Git

---

## 🔧 로컬 개발 환경 설정

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.example` 파일을 `.env`로 복사하고 API 키를 입력하세요:

```bash
cp .env.example .env
```

`.env` 파일 수정:
```env
# OpenAI API 사용 시
VITE_OPENAI_API_KEY=sk-your-openai-api-key-here
VITE_OPENAI_MODEL=gpt-4-turbo-preview
VITE_AI_PROVIDER=openai

# 또는 Google Gemini API 사용 시
VITE_GEMINI_API_KEY=your-gemini-api-key-here
VITE_GEMINI_MODEL=gemini-2.5-flash
VITE_AI_PROVIDER=gemini

# FRED API (선택사항 - 경제 지표용)
VITE_FRED_API_KEY=your-fred-api-key-here
```

### 3. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

---

## 📦 GitHub 저장소 생성

### 1. Git 초기화
```bash
git init
git add .
git commit -m "Initial commit: AI Finance Dashboard"
```

### 2. GitHub 저장소 연결
GitHub에서 새 저장소를 생성한 후:

```bash
git remote add origin https://github.com/YOUR_USERNAME/ai-finance-dashboard.git
git branch -M main
git push -u origin main
```

---

## 🌐 Netlify 자동 배포 설정

### 방법 1: Netlify 웹 UI 사용 (권장)

1. **Netlify 로그인**
   - https://app.netlify.com 접속
   - GitHub 계정으로 로그인

2. **새 사이트 추가**
   - "Add new site" → "Import an existing project" 클릭
   - "Deploy with GitHub" 선택
   - 저장소 선택: `ai-finance-dashboard`

3. **빌드 설정**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: `18`

4. **환경 변수 설정**
   - Site settings → Environment variables
   - 다음 변수들을 추가:
     ```
     VITE_OPENAI_API_KEY = your_key_here
     VITE_OPENAI_MODEL = gpt-4-turbo-preview
     VITE_AI_PROVIDER = openai
     ```

5. **Deploy site** 클릭

### 방법 2: Netlify CLI 사용

```bash
# Netlify CLI 설치
npm install -g netlify-cli

# 로그인
netlify login

# 프로젝트 초기화
netlify init

# 환경 변수 설정
netlify env:set VITE_OPENAI_API_KEY "your_key_here"
netlify env:set VITE_AI_PROVIDER "openai"

# 수동 배포
netlify deploy --prod
```

---

## 🔄 자동 배포 워크플로우

### GitHub → Netlify 자동 배포
1. `main` 브랜치에 코드 푸시
2. Netlify가 자동으로 감지하여 빌드 시작
3. 빌드 성공 시 자동으로 프로덕션 배포
4. 배포 URL 확인: `https://your-site-name.netlify.app`

### 배포 프로세스
```
git push origin main
     ↓
Netlify 빌드 트리거
     ↓
npm install
     ↓
npm run build
     ↓
dist/ 폴더 배포
     ↓
✅ 배포 완료!
```

---

## 🔐 API 키 관리 (보안)

### ⚠️ 중요 보안 사항
- **절대 `.env` 파일을 Git에 커밋하지 마세요**
- `.gitignore`에 `.env`가 포함되어 있는지 확인
- API 키는 Netlify 환경 변수로만 관리

### API 키 비용 관리
1. **OpenAI API**
   - GPT-4 Turbo: 입력 $10/1M tokens, 출력 $30/1M tokens
   - 월 사용량 제한 설정 권장
   - https://platform.openai.com/usage

2. **Google Gemini API**
   - Gemini 2.5 Flash: 무료 티어 제공
   - 비용 효율적인 대안
   - https://ai.google.dev/pricing

### 권장 설정
- 개발 환경: Gemini Flash (무료/저렴)
- 프로덕션: OpenAI GPT-4 또는 Gemini Pro

---

## 🧪 빌드 테스트

### 로컬 빌드 테스트
```bash
# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

### 빌드 오류 해결
```bash
# 캐시 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install

# 빌드 재시도
npm run build
```

---

## 📊 배포 후 확인사항

### ✅ 체크리스트
- [ ] 사이트 정상 접속 확인
- [ ] 모든 페이지 라우팅 작동 확인
- [ ] AI 리포트 생성 기능 테스트
- [ ] 차트 및 데이터 시각화 확인
- [ ] 모바일 반응형 디자인 확인
- [ ] API 키 정상 작동 확인

### 모니터링
- Netlify 대시보드: 배포 로그 확인
- Analytics: 방문자 통계 확인
- Function logs: API 호출 모니터링

---

## 🔧 고급 설정

### 커스텀 도메인 연결
1. Netlify 대시보드 → Domain settings
2. Add custom domain
3. DNS 설정 업데이트
4. HTTPS 자동 활성화 (Let's Encrypt)

### 배포 브랜치 전략
```bash
# 개발 브랜치에서 작업
git checkout -b feature/new-feature

# 변경사항 커밋
git commit -m "Add new feature"

# Pull Request 생성
git push origin feature/new-feature
```

Netlify Deploy Preview가 자동 생성됨

### 성능 최적화
- Build optimization: 빌드 시간 단축
- Asset optimization: 이미지 최적화
- CDN: 전 세계 빠른 로딩

---

## 📝 업데이트 배포

### 코드 업데이트 후 배포
```bash
# 변경사항 커밋
git add .
git commit -m "Update: feature description"

# GitHub에 푸시 (자동 배포 트리거)
git push origin main
```

### 롤백 (이전 버전으로 복구)
Netlify 대시보드에서:
1. Deploys 탭 클릭
2. 이전 배포 버전 선택
3. "Publish deploy" 클릭

---

## 🐛 트러블슈팅

### 빌드 실패
```bash
# 로그 확인
netlify deploy --build

# 환경 변수 확인
netlify env:list
```

### API 키 오류
- Netlify 환경 변수 설정 재확인
- API 키 유효성 확인
- 사용량 제한 확인

### 404 에러
- `netlify.toml` 설정 확인
- SPA 리다이렉트 설정 필요

---

## 📚 참고 자료

- [Netlify Documentation](https://docs.netlify.com)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Google Gemini API Documentation](https://ai.google.dev/docs)

---

## 💡 추가 기능 확장

### 향후 개선 사항
1. **백엔드 연동**
   - Supabase / Firebase
   - 사용자 인증 추가
   - 데이터베이스 연동

2. **실시간 데이터**
   - WebSocket 연결
   - 실시간 시세 업데이트

3. **모바일 앱**
   - React Native 변환
   - PWA 지원

---

**배포 완료 후 프로젝트 URL을 README.md에 추가하세요!** 🎉
