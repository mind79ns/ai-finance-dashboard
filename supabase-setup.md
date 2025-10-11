# Supabase 설정 가이드

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

Supabase Dashboard에서 **SQL Editor** (왼쪽 메뉴) → **New Query** 클릭 후, 아래 SQL 스크립트를 전체 복사하여 실행하세요:

```sql
-- ====================================
-- AI Finance Dashboard - Supabase Schema
-- ====================================

-- 1. portfolios 테이블: 포트폴리오 자산
CREATE TABLE IF NOT EXISTS public.portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default_user',
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  avg_price NUMERIC NOT NULL,
  current_price NUMERIC NOT NULL DEFAULT 0,
  total_value NUMERIC NOT NULL DEFAULT 0,
  profit NUMERIC NOT NULL DEFAULT 0,
  profit_percent NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  account TEXT NOT NULL DEFAULT '기본계좌',
  category TEXT NOT NULL DEFAULT '해외주식',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. account_principals 테이블: 계좌별 원금/예수금
CREATE TABLE IF NOT EXISTS public.account_principals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default_user',
  account_name TEXT NOT NULL UNIQUE,
  principal NUMERIC NOT NULL DEFAULT 0,
  remaining NUMERIC NOT NULL DEFAULT 0,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. goals 테이블: 재무 목표
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default_user',
  title TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  deadline DATE,
  category TEXT DEFAULT '저축',
  description TEXT DEFAULT '',
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. investment_logs 테이블: 투자 일지
CREATE TABLE IF NOT EXISTS public.investment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default_user',
  date DATE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  asset TEXT DEFAULT '',
  note TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================
-- 인덱스 생성 (쿼리 성능 향상)
-- ====================================

CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON public.portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_symbol ON public.portfolios(symbol);
CREATE INDEX IF NOT EXISTS idx_portfolios_account ON public.portfolios(account);

CREATE INDEX IF NOT EXISTS idx_account_principals_user_id ON public.account_principals(user_id);
CREATE INDEX IF NOT EXISTS idx_account_principals_account ON public.account_principals(account_name);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_deadline ON public.goals(deadline);

CREATE INDEX IF NOT EXISTS idx_investment_logs_user_id ON public.investment_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_logs_date ON public.investment_logs(date);

-- ====================================
-- Row Level Security (RLS) 설정
-- ====================================

-- RLS 활성화
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_principals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_logs ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기/쓰기 가능하도록 설정 (인증 없이 사용)
-- 나중에 인증 기능 추가 시 user_id 기반으로 변경 가능
CREATE POLICY "Enable all access for all users" ON public.portfolios
  FOR ALL USING (true);

CREATE POLICY "Enable all access for all users" ON public.account_principals
  FOR ALL USING (true);

CREATE POLICY "Enable all access for all users" ON public.goals
  FOR ALL USING (true);

CREATE POLICY "Enable all access for all users" ON public.investment_logs
  FOR ALL USING (true);

-- ====================================
-- 자동 업데이트 트리거 (updated_at)
-- ====================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_account_principals_updated_at
  BEFORE UPDATE ON public.account_principals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investment_logs_updated_at
  BEFORE UPDATE ON public.investment_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**실행 방법**:
1. SQL 스크립트 전체를 복사
2. Supabase Dashboard → SQL Editor에 붙여넣기
3. 우측 하단 "Run" 버튼 클릭
4. ✅ "Success. No rows returned" 메시지 확인

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

이제 다음 작업이 진행됩니다:
1. ✅ Supabase 서비스 파일 생성
2. ✅ localStorage 데이터 마이그레이션 로직 구현
3. ✅ Portfolio, Goals, InvestmentLog 페이지에 Supabase 연동
4. ✅ 실시간 동기화 구현

---

## 데이터 구조 설명

### portfolios 테이블
- 모든 포트폴리오 자산 저장
- symbol, name, type, quantity, avgPrice 등
- 계좌별(account) 그룹핑 가능

### account_principals 테이블
- 계좌별 원금/예수금 저장
- account_name을 UNIQUE 제약으로 중복 방지

### goals 테이블
- 재무 목표 저장
- deadline, completed 상태 추적

### investment_logs 테이블
- 투자 일지 저장
- date, type, amount, note 등

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
