# Supabase 설정 가이드

## ⚠️ 중요: 기존 테이블 삭제 필요

만약 이전에 SQL을 실행했다면, 먼저 **완전히 삭제**해야 합니다:

### 방법 1: SQL 파일 사용 (권장) ✅

1. 프로젝트 루트의 **`supabase-drop-all.sql`** 파일 열기
2. 전체 복사 (Ctrl+A → Ctrl+C)
3. Supabase Dashboard → **SQL Editor** → **New Query**
4. 붙여넣기 (Ctrl+V) → **"Run" 버튼 클릭**
5. ✅ "Success. No rows returned" 확인

### 방법 2: 직접 복사

Supabase Dashboard → SQL Editor → New Query에 다음 붙여넣기:

```sql
-- 1. 트리거 삭제
DROP TRIGGER IF EXISTS update_portfolios_updated_at ON public.portfolios;
DROP TRIGGER IF EXISTS update_account_principals_updated_at ON public.account_principals;
DROP TRIGGER IF EXISTS update_goals_updated_at ON public.goals;
DROP TRIGGER IF EXISTS update_investment_logs_updated_at ON public.investment_logs;

-- 2. 정책(Policy) 삭제
DROP POLICY IF EXISTS "Enable all access for all users" ON public.portfolios;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.account_principals;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.goals;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.investment_logs;

-- 3. 테이블 삭제
DROP TABLE IF EXISTS public.portfolios CASCADE;
DROP TABLE IF EXISTS public.account_principals CASCADE;
DROP TABLE IF EXISTS public.goals CASCADE;
DROP TABLE IF EXISTS public.investment_logs CASCADE;

-- 4. 함수 삭제
DROP FUNCTION IF EXISTS update_updated_at_column();
```

**"Run" 버튼 클릭** → ✅ "Success" 확인 후 아래 단계 진행

---

## 1단계: Supabase 프로젝트 생성

1. **Supabase 웹사이트 접속**: https://supabase.com
2. **계정 생성/로그인**: GitHub 계정으로 간편 로그인 가능
3. **새 프로젝트 생성**:
   - "New Project" 클릭
   - Organization: 기존 조직 선택 또는 새로 생성
   - 프로젝트 이름: `ai-finance-dashboard`
   - Database Password: **안전한 비밀번호 설정** (반드시 저장!)
   - Region: `Northeast Asia (Seoul)` 선택 (한국 서버)
   - "Create new project" 클릭

⏳ 프로젝트 생성에 약 2분 소요됩니다.

---

## 2단계: 프로젝트 설정 정보 확인

프로젝트가 생성되면 다음 정보를 확인하고 저장하세요:

1. **Project Settings** (왼쪽 메뉴) → **API** 클릭
2. 다음 정보를 복사:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **API Key (anon public)**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## 3단계: 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 아래 내용을 입력하세요:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**⚠️ 보안 중요**: `.env` 파일은 절대 GitHub에 커밋하지 마세요!

---

## 4단계: 데이터베이스 테이블 생성

### 방법 1: SQL 파일 사용 (권장) ✅

1. 프로젝트 루트의 **`supabase-schema.sql`** 파일을 텍스트 에디터로 열기
2. **전체 내용을 복사** (Ctrl+A → Ctrl+C)
3. Supabase Dashboard → **SQL Editor** → **New Query**
4. 복사한 SQL을 붙여넣기 (Ctrl+V)
5. 우측 하단 **"Run"** 버튼 클릭
6. ✅ **"Success. No rows returned"** 메시지 확인

### 주요 변경사항 (NOT NULL 제약 완화)

- `investment_logs.title`, `type`, `date` → NULL 허용 (빈 값 가능)
- `goals.title`, `target_amount` → NULL 허용 (빈 값 가능)
- `portfolios.id`, `goals.id`, `investment_logs.id` → BIGINT (localStorage ID 호환)

---

## 5단계: 테이블 확인

**Table Editor** (왼쪽 메뉴)에서 다음 테이블이 생성되었는지 확인:
- ✅ `portfolios` (포트폴리오 자산)
- ✅ `account_principals` (계좌 원금/예수금)
- ✅ `goals` (재무 목표)
- ✅ `investment_logs` (투자 일지)

---

## 6단계: 프로젝트에 Supabase 클라이언트 설치

터미널에서 다음 명령어를 실행하세요:

```bash
npm install @supabase/supabase-js
```

---

## 완료! 🎉

이제 다음 기능이 작동합니다:
1. ✅ PC에서 자산 추가 → Supabase 저장
2. ✅ 모바일/다른 PC에서 접속 → Supabase 데이터 로드
3. ✅ 네트워크 없을 때 → localStorage만 사용 (자동 fallback)

### 동작 확인 방법:

1. **PC에서 자산 추가**:
   - 포트폴리오에 새 자산 추가
   - 개발자 도구 콘솔에서 `☁️ Syncing to Supabase...` 메시지 확인

2. **Supabase에서 확인**:
   - Table Editor → `portfolios` 테이블 → 데이터 확인

3. **모바일에서 확인**:
   - 모바일 브라우저로 접속
   - 같은 데이터가 표시되는지 확인

---

## 데이터 구조 설명

### portfolios 테이블
- 모든 포트폴리오 자산 저장
- symbol, name, type, quantity, avgPrice 등
- 계좌별(account) 그룹핑 가능
- **id**: BIGINT (localStorage 호환)

### account_principals 테이블
- 계좌별 원금/예수금 저장
- account_name을 UNIQUE 제약으로 중복 방지

### goals 테이블
- 재무 목표 저장
- deadline, completed 상태 추적
- **id**: BIGINT (localStorage 호환)
- **title, target_amount**: NULL 허용

### investment_logs 테이블
- 투자 일지 저장
- date, type, amount, note 등
- **id**: BIGINT (localStorage 호환)
- **title, type, date**: NULL 허용

---

## 보안 참고사항

현재 설정은 **인증 없이** 모든 사용자가 데이터를 읽고 쓸 수 있습니다.

향후 **사용자 인증**을 추가하려면:
1. Supabase Authentication 활성화
2. RLS 정책을 `user_id` 기반으로 변경:
   ```sql
   CREATE POLICY "Users can only access their own data"
   ON public.portfolios
   FOR ALL USING (auth.uid()::text = user_id);
   ```

---

## 문제 해결

### "null value in column violates not-null constraint" 에러
→ 위의 "기존 테이블 삭제" SQL을 먼저 실행 후 새 스키마 재실행

### 데이터가 동기화되지 않음
1. 개발자 도구 콘솔 확인 (`F12`)
2. `☁️ Loading from Supabase...` 메시지 확인
3. 에러 발생 시 `.env` 파일의 Supabase URL/Key 재확인
