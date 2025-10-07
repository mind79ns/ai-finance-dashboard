# 🚀 Netlify 배포 가이드 (빠른 실행)

## ✅ 준비 완료 상태

- ✅ GitHub 저장소: https://github.com/mind79ns/ai-finance-dashboard
- ✅ 프로덕션 빌드 테스트 완료
- ✅ 실시간 API 통합 완료
- ✅ 최신 GPT-4.1 모델 적용

---

## 🎯 Netlify 배포 단계 (5분)

### Step 1: Netlify 접속
```
https://app.netlify.com
```
- GitHub 계정으로 로그인

---

### Step 2: 새 사이트 추가
1. **"Add new site"** 버튼 클릭
2. **"Import an existing project"** 선택
3. **"Deploy with GitHub"** 클릭
4. 저장소 검색: `ai-finance-dashboard`
5. 저장소 선택 후 **"Select"** 클릭

---

### Step 3: 빌드 설정 (자동 입력됨)
```
Build command: npm run build
Publish directory: dist
```
✅ 이미 자동으로 감지됩니다 - 그냥 확인만!

**"Deploy [site-name]"** 버튼 클릭

---

### Step 4: 환경 변수 설정 (중요!)

배포가 시작되면:

1. **Site configuration** → **Environment variables** 클릭
2. **"Add a variable"** 클릭
3. 다음 6개 변수를 하나씩 추가:

#### Variable 1
```
Key: VITE_OPENAI_API_KEY
Value: [당신의 OpenAI API 키를 입력하세요]
Scope: All deploys
```

#### Variable 2
```
Key: VITE_OPENAI_MODEL
Value: gpt-4.1
Scope: All deploys
```

#### Variable 3
```
Key: VITE_GEMINI_API_KEY
Value: [당신의 Gemini API 키를 입력하세요]
Scope: All deploys
```

#### Variable 4
```
Key: VITE_GEMINI_MODEL
Value: gemini-2.5-flash
Scope: All deploys
```

#### Variable 5
```
Key: VITE_AI_PROVIDER
Value: dual
Scope: All deploys
```

#### Variable 6
```
Key: VITE_FRED_API_KEY
Value: [당신의 FRED API 키를 입력하세요]
Scope: All deploys
```

4. 모든 변수 추가 후 **"Save"** 클릭

---

### Step 5: 재배포
환경 변수 저장 후:

1. **Deploys** 탭으로 이동
2. **"Trigger deploy"** → **"Deploy site"** 클릭
3. 배포 완료 대기 (1-2분)

---

## 🎉 배포 완료!

### 확인할 것
- ✅ 배포 URL: `https://your-site-name.netlify.app`
- ✅ HTTPS 자동 활성화
- ✅ 실시간 시장 데이터 작동
- ✅ AI 리포트 기능 작동

### 테스트 체크리스트
- [ ] 대시보드 페이지 로드
- [ ] 시장분석 페이지 - 실시간 데이터 확인
- [ ] AI 리포트 - GPT-4.1 리포트 생성
- [ ] 포트폴리오 페이지 확인
- [ ] 모든 페이지 정상 작동

---

## 🔧 문제 해결

### 빌드 실패
1. Netlify 배포 로그 확인
2. Node version이 18 이상인지 확인
3. 환경 변수가 모두 설정되었는지 확인

### 환경 변수 오류
- `VITE_` 접두사가 있는지 확인
- 값에 따옴표 없이 입력했는지 확인
- 재배포 필수!

### API 키 오류
- OpenAI API 키 유효성 확인
- Gemini API 키 유효성 확인
- API 사용량 제한 확인

---

## 🔄 자동 배포

이제부터:
```bash
git add .
git commit -m "Update something"
git push origin main
```

→ **Netlify가 자동으로 재배포!** 🚀

---

## 📊 배포 상태 확인

Netlify 대시보드에서:
- **Deploys**: 배포 히스토리
- **Functions**: 없음 (정적 사이트)
- **Domain settings**: 커스텀 도메인 연결
- **Build settings**: 빌드 설정 변경

---

## ✅ 완료 체크리스트

배포 후 확인:
- [ ] 사이트 URL 접속 성공
- [ ] 환경 변수 6개 모두 설정
- [ ] AI 리포트 생성 테스트
- [ ] 실시간 시장 데이터 확인
- [ ] 모바일에서 확인
- [ ] GitHub 푸시 → 자동 재배포 확인

---

## 🎯 다음 단계

1. **커스텀 도메인** 연결 (선택)
2. **사용량 모니터링** (OpenAI, Gemini)
3. **Analytics 확인** (Netlify)
4. **피드백 수집** 및 개선

---

**배포 URL을 README.md에 추가하는 것을 잊지 마세요!** 📝

```markdown
## 🌐 Live Demo
https://your-site-name.netlify.app
```
